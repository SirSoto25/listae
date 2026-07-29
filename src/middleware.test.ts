import { describe, expect, it } from "vitest";

import { isAppRoute } from "./middleware";

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
