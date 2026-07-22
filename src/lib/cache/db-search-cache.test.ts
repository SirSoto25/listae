import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import type { SearchCacheStore } from "./types";

let cache: SearchCacheStore;
let database: typeof import("@/lib/db").db;

beforeAll(async () => {
  process.env.DATABASE_URL = "file::memory:";

  const [{ createDbSearchCacheStore }, dbModule] = await Promise.all([
    import("./db-search-cache"),
    import("@/lib/db"),
  ]);

  database = dbModule.db;
  database.run(sql`
    create table search_cache (
      key text primary key,
      payload text not null,
      expires_at integer not null,
      created_at integer not null
    )
  `);
  cache = createDbSearchCacheStore();
});

describe("buildSearchCacheKey", () => {
  it("normalizes case and repeated whitespace", async () => {
    const { buildSearchCacheKey } = await import("./db-search-cache");

    expect(buildSearchCacheKey("  The   Lord OF the Rings  ", "book")).toBe(
      "catalog:book:the lord of the rings",
    );
  });

  it("normalizes the type segment", async () => {
    const { buildSearchCacheKey } = await import("./db-search-cache");

    expect(buildSearchCacheKey("Dune", " Movie ")).toBe(
      "catalog:movie:dune",
    );
  });
});

describe("DB search cache", () => {
  it("returns fresh payloads", async () => {
    await cache.set("fresh", '{"value":1}', 60);

    await expect(cache.get("fresh")).resolves.toBe('{"value":1}');
  });

  it("skips expired payloads but allows a stale read", async () => {
    await cache.set("expired", '{"value":2}', 60);
    database.run(
      sql`update search_cache set expires_at = 0 where key = 'expired'`,
    );

    await expect(cache.get("expired")).resolves.toBeNull();
    await expect(cache.get("expired", true)).resolves.toBe('{"value":2}');
  });

  it("invalidates one key or the entire cache", async () => {
    await cache.set("first", "1", 60);
    await cache.set("second", "2", 60);

    await cache.invalidate("first");
    await expect(cache.get("first")).resolves.toBeNull();
    await expect(cache.get("second")).resolves.toBe("2");

    await cache.invalidate();
    await expect(cache.get("second")).resolves.toBeNull();
  });
});
