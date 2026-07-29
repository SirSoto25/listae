import {
  buildSearchCacheKey,
  createDbSearchCacheStore,
} from "@/lib/cache/db-search-cache";
import type { Locale } from "@/lib/i18n/config";
import type { WorkType } from "@/types/domain";

import { checkRateLimit } from "@/lib/security/rate-limit";

import { resolveOpenLibraryBilingual, searchOpenLibrary } from "./openlibrary";
import { resolveTmdbBilingual, searchTmdb } from "./tmdb";
import type { CatalogHit } from "./types";

const SEARCH_CACHE_TTL_SECONDS = 1800;
const MAX_QUERY_LENGTH = 200;
const SEARCH_RATE_LIMIT = { limit: 30, windowMs: 3_600_000 };

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
): Promise<CatalogHit[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (!normalizedQuery || normalizedQuery.length > MAX_QUERY_LENGTH) {
    return [];
  }

  if (clientIp) {
    const limited = checkRateLimit(`search:ip:${clientIp}`, SEARCH_RATE_LIMIT);
    if (!limited.ok) {
      return [];
    }
  }

  const cache = createDbSearchCacheStore();
  const key = buildSearchCacheKey(normalizedQuery, typeFilter, locale);
  const cachedPayload = await cache.get(key);
  const cachedHits =
    cachedPayload === null ? null : parseCachedHits(cachedPayload);

  if (cachedHits) {
    return cachedHits;
  }
  if (cachedPayload !== null) {
    await cache.invalidate(key);
  }
  const stalePayload = await cache.get(key, true);
  const staleHits =
    stalePayload === null ? null : parseCachedHits(stalePayload);

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
    return staleHits ?? [];
  }

  const hits = successful.flatMap((result) => result.value);
  await cache.set(key, JSON.stringify(hits), SEARCH_CACHE_TTL_SECONDS);
  return hits;
}
