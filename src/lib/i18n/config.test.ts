import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "./config";

describe("config", () => {
  it("defines es and en locales with es default", () => {
    expect(LOCALES).toEqual(["es", "en"]);
    expect(DEFAULT_LOCALE).toBe("es");
  });

  it("guards locale values", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
