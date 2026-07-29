import { describe, expect, it } from "vitest";
import { localePath, stripLocalePrefix, switchLocalePath } from "./path";

describe("localePath", () => {
  it("prefixes paths", () => {
    expect(localePath("es", "/library")).toBe("/es/library");
    expect(localePath("en", "/")).toBe("/en");
  });
});

describe("stripLocalePrefix", () => {
  it("strips es/en", () => {
    expect(stripLocalePrefix("/es/library")).toEqual({
      locale: "es",
      pathname: "/library",
    });
  });
});

describe("switchLocalePath", () => {
  it("swaps locale segment", () => {
    expect(switchLocalePath("/es/library?q=1", "en")).toBe(
      "/en/library?q=1",
    );
  });
});
