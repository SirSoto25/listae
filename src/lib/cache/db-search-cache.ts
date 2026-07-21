import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { searchCache } from "@/lib/db/schema";

import type { SearchCacheStore } from "./types";

const nowInSeconds = () => Math.floor(Date.now() / 1000);

export function buildSearchCacheKey(
  query: string,
  typeFilter: string | "all",
): string {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedType = typeFilter.trim().toLowerCase();
  return `catalog:${normalizedType}:${normalizedQuery}`;
}

export function createDbSearchCacheStore(): SearchCacheStore {
  return {
    async get(key, allowStale = false) {
      const row = db
        .select({
          payload: searchCache.payload,
          expiresAt: searchCache.expiresAt,
        })
        .from(searchCache)
        .where(eq(searchCache.key, key))
        .get();

      if (!row) {
        return null;
      }

      if (row.expiresAt <= nowInSeconds() && !allowStale) {
        return null;
      }

      return row.payload;
    },

    async set(key, payload, ttlSeconds) {
      const createdAt = nowInSeconds();
      const expiresAt = createdAt + Math.max(0, Math.floor(ttlSeconds));

      db.insert(searchCache)
        .values({ key, payload, expiresAt, createdAt })
        .onConflictDoUpdate({
          target: searchCache.key,
          set: { payload, expiresAt, createdAt },
        })
        .run();
    },

    async invalidate(key) {
      if (key === undefined) {
        db.delete(searchCache).run();
        return;
      }

      db.delete(searchCache).where(eq(searchCache.key, key)).run();
    },
  };
}
