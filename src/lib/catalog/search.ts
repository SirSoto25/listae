import {
  buildSearchCacheKey,
  createDbSearchCacheStore,
} from "@/lib/cache/db-search-cache";
import type { WorkType } from "@/types/domain";

import { resolveOpenLibrary, searchOpenLibrary } from "./openlibrary";
import { resolveTmdb, searchTmdb } from "./tmdb";
import type { CatalogHit } from "./types";

const SEARCH_CACHE_TTL_SECONDS = 1800;

export async function resolveCatalogHit(
  source: CatalogHit["source"],
  externalId: string,
): Promise<CatalogHit> {
  return source === "tmdb"
    ? resolveTmdb(externalId)
    : resolveOpenLibrary(externalId);
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
): Promise<CatalogHit[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (!normalizedQuery) {
    return [];
  }

  const cache = createDbSearchCacheStore();
  const key = buildSearchCacheKey(normalizedQuery, typeFilter);
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
    searches.push(searchTmdb(normalizedQuery, typeFilter));
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
