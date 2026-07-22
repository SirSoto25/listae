import { describe, expect, it } from "vitest";
import {
  domainForWorkType,
  parseLibraryDomain,
  workTypesForDomain,
} from "./domain";

describe("parseLibraryDomain", () => {
  it("defaults missing or invalid to all", () => {
    expect(parseLibraryDomain(undefined)).toBe("all");
    expect(parseLibraryDomain("nope")).toBe("all");
  });

  it("accepts audiovisual, reading, all", () => {
    expect(parseLibraryDomain("audiovisual")).toBe("audiovisual");
    expect(parseLibraryDomain("reading")).toBe("reading");
    expect(parseLibraryDomain("all")).toBe("all");
  });
});

describe("workTypesForDomain", () => {
  it("returns AV types", () => {
    expect([...workTypesForDomain("audiovisual")]).toEqual([
      "anime",
      "series",
      "movie",
    ]);
  });

  it("returns reading types", () => {
    expect([...workTypesForDomain("reading")]).toEqual([
      "book",
      "manga",
      "comic",
    ]);
  });

  it("returns all six for all", () => {
    expect(workTypesForDomain("all")).toHaveLength(6);
  });
});

describe("domainForWorkType", () => {
  it("maps movie to audiovisual and book to reading", () => {
    expect(domainForWorkType("movie")).toBe("audiovisual");
    expect(domainForWorkType("book")).toBe("reading");
  });
});
