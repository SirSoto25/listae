import { describe, expect, it, vi } from "vitest";

import { buildTmdbRequest, isTmdbBearerToken } from "./tmdb";

describe("TMDB credentials", () => {
  it("treats JWT read-access tokens as Bearer credentials", () => {
    expect(isTmdbBearerToken("eyJhbGciOiJIUzI1NiJ9.payload.sig")).toBe(true);
    expect(isTmdbBearerToken("a46826f3f12b2a2eb0ed010c0baa7b37")).toBe(false);
  });

  it("puts v3 API keys in the query string", () => {
    const { url, headers } = buildTmdbRequest("search/movie", "abc123", {
      query: "Dune",
    });

    expect(url.searchParams.get("api_key")).toBe("abc123");
    expect(url.searchParams.get("query")).toBe("Dune");
    expect(headers).toEqual({ Accept: "application/json" });
  });

  it("sends v4 tokens as Authorization Bearer without api_key", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.payload.sig";
    const { url, headers } = buildTmdbRequest("search/multi", token, {
      query: "Dune",
    });

    expect(url.searchParams.get("api_key")).toBeNull();
    expect(url.searchParams.get("query")).toBe("Dune");
    expect(headers).toEqual({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    });
  });
});

describe("resolveTmdbBilingual", () => {
  it("merges es and en detail responses", async () => {
    vi.stubEnv("TMDB_API_KEY", "abc123");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("language=es-ES")) {
        return new Response(
          JSON.stringify({
            id: 438631,
            title: "Duna",
            overview: "Sinopsis ES",
            release_date: "2021-10-21",
          }),
        );
      }
      return new Response(
        JSON.stringify({
          id: 438631,
          title: "Dune",
          overview: "Synopsis EN",
          release_date: "2021-10-21",
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resolveTmdbBilingual } = await import("./tmdb");
    const hit = await resolveTmdbBilingual("movie:438631");

    expect(hit.titleEs).toBe("Duna");
    expect(hit.titleEn).toBe("Dune");
    expect(hit.title).toBe("Dune");
    expect(hit.synopsisEn).toBe("Synopsis EN");
    expect(hit.synopsisEs).toBe("Sinopsis ES");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
