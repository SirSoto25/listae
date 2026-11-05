import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  const fallback = "/es/title/123?fallback=1";

  it.each([
    "/es/library?status=plan",
    "/en/title/9a1d5a35-2d27-4f0a-a75c-5ac6029af733?saved=1",
  ])("accepts known application paths", (value) => {
    expect(safeReturnPath(value, fallback)).toBe(value);
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/library\u0000",
    "/other",
    "/library?status=plan",
    "/title/9a1d5a35-2d27-4f0a-a75c-5ac6029af733",
  ])("rejects unsafe return path %j", (value) => {
    expect(safeReturnPath(value, fallback)).toBe(fallback);
  });
});

describe("safeReturnPath with locale", () => {
  it("accepts locale-prefixed library and title paths", () => {
    expect(safeReturnPath("/es/library", "/es")).toBe("/es/library");
    expect(
      safeReturnPath(
        "/en/title/550e8400-e29b-41d4-a716-446655440000",
        "/es",
      ),
    ).toMatch(/^\/en\/title\//);
  });

  it("rejects external and unsafe paths", () => {
    expect(safeReturnPath("//evil.com", "/es/library")).toBe("/es/library");
  });
});

describe("safeReturnPath for login errors", () => {
  // callbacks.redirect runs the URL returned by callbacks.signIn through
  // safeReturnPath: without this, a rate-limited request would land on home.
  it.each(["/en/login?error=RateLimited", "/es/login?error=EmailInvalid"])(
    "accepts %j",
    (value) => {
      expect(safeReturnPath(value, "")).toBe(value);
    },
  );

  it.each([
    "/en/login?error=<script>",
    "/en/login?error=RateLimited&next=//evil.example",
    "/en/login",
    "/login?error=RateLimited",
    "/fr/login?error=RateLimited",
  ])("rejects %j", (value) => {
    expect(safeReturnPath(value, "")).toBe("");
  });
});
