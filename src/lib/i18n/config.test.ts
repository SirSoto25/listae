import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES, isLocale } from "./config";

describe("config", () => {
  it("defines es and en locales with es default", () => {
    expect(LOCALES).toEqual(["es", "en"]);
    expect(DEFAULT_LOCALE).toBe("es");
  });

  it("names each locale in its own language", () => {
    expect(LOCALE_NAMES).toEqual({ es: "Español", en: "English" });
  });

  it("guards locale values", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
