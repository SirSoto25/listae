import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
  searchTmdb: vi.fn(),
  searchOpenLibrary: vi.fn(),
}));

vi.mock("@/lib/cache/db-search-cache", () => ({
  buildSearchCacheKey: (query: string, type: string) =>
    `catalog:${type}:${query.trim().toLowerCase().replace(/\s+/g, " ")}`,
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

import { searchCatalog } from "./search";

describe("searchCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(null);
    mocks.set.mockResolvedValue(undefined);
    mocks.searchTmdb.mockResolvedValue([]);
    mocks.searchOpenLibrary.mockResolvedValue([]);
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

    await expect(searchCatalog(" Dune ", "all")).resolves.toEqual(cached);
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

    await expect(searchCatalog("Dune", "all")).resolves.toEqual([movie, book]);
    expect(mocks.set).toHaveBeenCalledWith(
      "catalog:all:dune",
      JSON.stringify([movie, book]),
      1800,
    );
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

    await expect(searchCatalog("Dune", "all")).resolves.toEqual(stale);
  });
});
