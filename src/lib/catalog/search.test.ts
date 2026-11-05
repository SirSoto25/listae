import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
  searchTmdb: vi.fn(),
  searchOpenLibrary: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/cache/db-search-cache", () => ({
  buildSearchCacheKey: (query: string, type: string, locale: string) =>
    `catalog:${locale}:${type}:${query.trim().toLowerCase().replace(/\s+/g, " ")}`,
  createDbSearchCacheStore: () => ({
    get: mocks.get,
    set: mocks.set,
    invalidate: mocks.invalidate,
  }),
}));

vi.mock("./tmdb", () => ({ searchTmdb: mocks.searchTmdb }));
vi.mock("./openlibrary", () => ({
  searchOpenLibrary: mocks.searchOpenLibrary,
}));

import { migratedTestDb } from "@/test/db";

import { searchCatalog } from "./search";

type RateLimitModule = typeof import("@/lib/security/rate-limit");

describe("searchCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(null);
    mocks.set.mockResolvedValue(undefined);
    mocks.searchTmdb.mockResolvedValue([]);
    mocks.searchOpenLibrary.mockResolvedValue([]);
    mocks.checkRateLimit.mockReturnValue({ ok: true });
  });

  it("returns a fresh cache hit without calling providers", async () => {
    const cached = [
      {
        source: "tmdb",
        externalId: "11",
        type: "movie",
        title: "Dune",
      },
    ];
    mocks.get.mockResolvedValue(JSON.stringify(cached));

    await expect(searchCatalog(" Dune ", "all", "es")).resolves.toEqual({
      status: "ok",
      hits: cached,
    });
    expect(mocks.searchTmdb).not.toHaveBeenCalled();
    expect(mocks.searchOpenLibrary).not.toHaveBeenCalled();
  });

  it("combines providers and caches results for 30 minutes", async () => {
    const movie = {
      source: "tmdb",
      externalId: "11",
      type: "movie",
      title: "Dune",
    };
    const book = {
      source: "openlibrary",
      externalId: "OL893415W",
      type: "book",
      title: "Dune",
    };
    mocks.searchTmdb.mockResolvedValue([movie]);
    mocks.searchOpenLibrary.mockResolvedValue([book]);

    await expect(searchCatalog("Dune", "all", "en")).resolves.toEqual({
      status: "ok",
      hits: [movie, book],
    });
    expect(mocks.set).toHaveBeenCalledWith(
      "catalog:en:all:dune",
      JSON.stringify([movie, book]),
      1800,
    );
    expect(mocks.searchTmdb).toHaveBeenCalledWith("Dune", "all", "en");
  });

  it("returns stale cache hits when all providers fail", async () => {
    const stale = [
      {
        source: "tmdb",
        externalId: "11",
        type: "movie",
        title: "Dune",
      },
    ];
    mocks.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(stale));
    mocks.searchTmdb.mockRejectedValue(new Error("TMDB unavailable"));
    mocks.searchOpenLibrary.mockRejectedValue(
      new Error("Open Library unavailable"),
    );

    await expect(searchCatalog("Dune", "all", "es")).resolves.toEqual({
      status: "ok",
      hits: stale,
    });
  });

  it("reports provider_down when every provider fails and nothing is cached", async () => {
    mocks.searchTmdb.mockRejectedValue(new Error("TMDB unavailable"));
    mocks.searchOpenLibrary.mockRejectedValue(new Error("OL unavailable"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(searchCatalog("Dune", "all", "es")).resolves.toEqual({
      status: "provider_down",
      hits: [],
    });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("reports partial with the hits of the provider that answered", async () => {
    const book = {
      source: "openlibrary",
      externalId: "OL893415W",
      type: "book",
      title: "Dune",
    };
    mocks.searchTmdb.mockRejectedValue(new Error("TMDB unavailable"));
    mocks.searchOpenLibrary.mockResolvedValue([book]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(searchCatalog("Dune", "all", "es")).resolves.toEqual({
      status: "partial",
      hits: [book],
    });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("reports provider_down when the only queried provider fails", async () => {
    mocks.searchOpenLibrary.mockRejectedValue(new Error("OL unavailable"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(searchCatalog("Dune", "book", "es")).resolves.toEqual({
      status: "provider_down",
      hits: [],
    });
  });

  it("does not call providers for queries shorter than the minimum", async () => {
    await expect(searchCatalog(" a ", "all", "es")).resolves.toEqual({
      status: "ok",
      hits: [],
    });
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.searchTmdb).not.toHaveBeenCalled();
    expect(mocks.searchOpenLibrary).not.toHaveBeenCalled();
  });

  it("ignores queries longer than 200 characters", async () => {
    await expect(
      searchCatalog("a".repeat(201), "all", "es"),
    ).resolves.toEqual({ status: "ok", hits: [] });
    expect(mocks.searchTmdb).not.toHaveBeenCalled();
  });

  it("reports rate_limited when the IP budget is spent and nothing is cached", async () => {
    mocks.checkRateLimit.mockReturnValue({ ok: false, retryAfterSec: 60 });

    await expect(
      searchCatalog("Dune", "all", "es", "203.0.113.5"),
    ).resolves.toEqual({ status: "rate_limited", hits: [] });
    expect(mocks.searchTmdb).not.toHaveBeenCalled();
  });

  it("serves stale hits instead of rate_limited when the budget is spent", async () => {
    const stale = [
      { source: "tmdb", externalId: "11", type: "movie", title: "Dune" },
    ];
    mocks.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(stale));
    mocks.checkRateLimit.mockReturnValue({ ok: false, retryAfterSec: 60 });

    await expect(
      searchCatalog("Dune", "all", "es", "203.0.113.5"),
    ).resolves.toEqual({ status: "ok", hits: stale });
  });

  it("keys the search budget by IP and groups IPv6 by /64", async () => {
    await searchCatalog("Dune", "all", "es", "203.0.113.5");
    await searchCatalog("Dune", "all", "es", "2001:db8:1:2::abcd");

    expect(mocks.checkRateLimit.mock.calls).toEqual([
      ["search:ip:203.0.113.5", { limit: 30, windowMs: 3_600_000, failOpen: true }],
      ["search:ip:2001:db8:1:2::/64", { limit: 30, windowMs: 3_600_000, failOpen: true }],
    ]);
  });

  it("unknown ip falls back to a shared search bucket and never to per-email bypass", async () => {
    await migratedTestDb();
    const real = await vi.importActual<RateLimitModule>(
      "@/lib/security/rate-limit",
    );
    real.resetRateLimitsForTests();
    mocks.checkRateLimit.mockImplementation(real.checkRateLimit);

    for (let i = 0; i < 301; i++) {
      await searchCatalog(`query ${i}`, "movie", "es", null);
    }
    expect(mocks.searchTmdb).toHaveBeenCalledTimes(300);

    // A known IP has its own, separate budget.
    await searchCatalog("another", "movie", "es", "203.0.113.5");
    expect(mocks.searchTmdb).toHaveBeenCalledTimes(301);

    // The shared search bucket never touches the per-email login budget.
    const magicLink = { limit: 5, windowMs: 3_600_000 };
    for (let i = 0; i < 5; i++) {
      expect(real.checkRateLimit("magic-link:v@x.com", magicLink).ok).toBe(true);
    }
    expect(real.checkRateLimit("magic-link:v@x.com", magicLink).ok).toBe(false);
  });
});
