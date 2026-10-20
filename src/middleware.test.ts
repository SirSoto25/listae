import { describe, expect, it } from "vitest";

import { isAppRoute, preferredLocale } from "./middleware";

describe("isAppRoute", () => {
  it("matches app root paths", () => {
    expect(isAppRoute("/")).toBe(true);
    expect(isAppRoute("/library")).toBe(true);
    expect(isAppRoute("/login")).toBe(true);
    expect(isAppRoute("/onboarding")).toBe(true);
  });

  it("matches login subpaths and title detail", () => {
    expect(isAppRoute("/login/verify")).toBe(true);
    expect(isAppRoute("/title/550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("excludes profile and api paths", () => {
    expect(isAppRoute("/u/alice")).toBe(false);
    expect(isAppRoute("/api/auth/session")).toBe(false);
  });
});

describe("preferredLocale", () => {
  it("prefers the last browsed locale cookie over Accept-Language", () => {
    expect(preferredLocale("en", "es-ES,es;q=0.9")).toBe("en");
    expect(preferredLocale("es", "en-US,en;q=0.9")).toBe("es");
  });

  it("falls back to Accept-Language when the cookie is missing or invalid", () => {
    expect(preferredLocale(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(preferredLocale("fr", "en-US,en;q=0.9")).toBe("en");
  });
});
