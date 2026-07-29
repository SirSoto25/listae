import { describe, expect, it } from "vitest";
import {
  resolveLocaleFromAcceptLanguage,
  resolveLocaleFromPathname,
} from "./resolve-locale";

describe("resolveLocaleFromAcceptLanguage", () => {
  it("prefers es when listed first", () => {
    expect(resolveLocaleFromAcceptLanguage("es-ES,en;q=0.9")).toBe("es");
  });

  it("returns en for en-US", () => {
    expect(resolveLocaleFromAcceptLanguage("en-US,es;q=0.8")).toBe("en");
  });

  it("defaults to es when header missing or unsupported", () => {
    expect(resolveLocaleFromAcceptLanguage(null)).toBe("es");
    expect(resolveLocaleFromAcceptLanguage("fr-FR,de;q=0.9")).toBe("es");
  });
});

describe("resolveLocaleFromPathname", () => {
  it("extracts es or en prefix", () => {
    expect(resolveLocaleFromPathname("/es/library")).toBe("es");
    expect(resolveLocaleFromPathname("/en")).toBe("en");
  });

  it("returns null without prefix", () => {
    expect(resolveLocaleFromPathname("/library")).toBeNull();
  });
});
