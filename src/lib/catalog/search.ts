import {
  buildSearchCacheKey,
  createDbSearchCacheStore,
} from "@/lib/cache/db-search-cache";
import type { Locale } from "@/lib/i18n/config";
import type { WorkType } from "@/types/domain";

import { ipRateLimitBucket } from "@/lib/security/client-ip";
import { checkRateLimit } from "@/lib/security/rate-limit";

import { resolveOpenLibraryBilingual, searchOpenLibrary } from "./openlibrary";
import { resolveTmdbBilingual, searchTmdb } from "./tmdb";
import type { CatalogHit } from "./types";

const SEARCH_CACHE_TTL_SECONDS = 1800;
/** Shorter queries are not searched (and never spend provider budget). */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 200;
const SEARCH_WINDOW_MS = 3_600_000;
/**
 * Per client IP. Search abuse only costs provider quota, so a broken store
 * lets searches through (`failOpen`) instead of taking search down.
 */
const SEARCH_RATE_LIMIT = { limit: 30, windowMs: SEARCH_WINDOW_MS, failOpen: true };
/**
 * Every visitor whose IP is unknown (no trusted proxy configured) shares one
 * bucket: they cannot rotate headers to skip the limit, and the bucket only
 * covers search, never login (ADR 014).
 */
const UNKNOWN_IP_SEARCH_RATE_LIMIT = {
  limit: 300,
  windowMs: SEARCH_WINDOW_MS,
  failOpen: true,
};

/**
 * What a search tells the page, so a failure is never shown as "no matches":
 * - `ok`: providers answered (or a fresh/stale cache did); `hits` may be empty.
 * - `partial`: one provider failed; `hits` come from the other one.
 * - `rate_limited`: the client's search budget is spent and nothing is cached.
 * - `provider_down`: every provider failed and nothing is cached.
 */
export type CatalogSearchStatus =
  | "ok"
  | "partial"
  | "rate_limited"
  | "provider_down";

export type CatalogSearchResult = {
  status: CatalogSearchStatus;
  hits: CatalogHit[];
};

export async function resolveCatalogHit(
  source: CatalogHit["source"],
  externalId: string,
): Promise<CatalogHit> {
  return source === "tmdb"
    ? resolveTmdbBilingual(externalId)
    : resolveOpenLibraryBilingual(externalId);
}

function parseCachedHits(payload: string): CatalogHit[] | null {
  try {
    const value: unknown = JSON.parse(payload);
    return Array.isArray(value) ? (value as CatalogHit[]) : null;
  } catch {
    return null;
  }
}

export async function searchCatalog(
  query: string,
  typeFilter: WorkType | "all",
  locale: Locale,
  clientIp?: string | null,
): Promise<CatalogSearchResult> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (
    normalizedQuery.length < MIN_QUERY_LENGTH ||
    normalizedQuery.length > MAX_QUERY_LENGTH
  ) {
    return { status: "ok", hits: [] };
  }

  const cache = createDbSearchCacheStore();
  const key = buildSearchCacheKey(normalizedQuery, typeFilter, locale);
  const cachedPayload = await cache.get(key);
  const cachedHits =
    cachedPayload === null ? null : parseCachedHits(cachedPayload);

  if (cachedHits) {
    return { status: "ok", hits: cachedHits };
  }
  if (cachedPayload !== null) {
    await cache.invalidate(key);
  }
  const stalePayload = await cache.get(key, true);
  const staleHits =
    stalePayload === null ? null : parseCachedHits(stalePayload);

  // Only provider round-trips spend the IP budget; cache hits are free.
  const limited = clientIp
    ? checkRateLimit(`search:ip:${ipRateLimitBucket(clientIp)}`, SEARCH_RATE_LIMIT)
    : checkRateLimit("search:unknown-ip", UNKNOWN_IP_SEARCH_RATE_LIMIT);
  if (!limited.ok) {
    return staleHits
      ? { status: "ok", hits: staleHits }
      : { status: "rate_limited", hits: [] };
  }

  const searches: Promise<CatalogHit[]>[] = [];
  if (["all", "anime", "series", "movie"].includes(typeFilter)) {
    searches.push(searchTmdb(normalizedQuery, typeFilter, locale));
  }
  if (["all", "book", "manga", "comic"].includes(typeFilter)) {
    searches.push(searchOpenLibrary(normalizedQuery, typeFilter));
  }

  const settled = await Promise.allSettled(searches);
  for (const result of settled) {
    if (result.status === "rejected") {
      console.warn(
        "[listae catalog] provider failed:",
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  }

  const successful = settled.filter(
    (result): result is PromiseFulfilledResult<CatalogHit[]> =>
      result.status === "fulfilled",
  );

  if (successful.length === 0) {
    return staleHits
      ? { status: "ok", hits: staleHits }
      : { status: "provider_down", hits: [] };
  }

  const hits = successful.flatMap((result) => result.value);
  if (successful.length < settled.length) {
    // A provider is down: serve what we have without caching a partial list.
    return staleHits
      ? { status: "ok", hits: staleHits }
      : { status: "partial", hits };
  }
  await cache.set(key, JSON.stringify(hits), SEARCH_CACHE_TTL_SECONDS);
  return { status: "ok", hits };
}
