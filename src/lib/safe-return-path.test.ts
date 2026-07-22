import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  const fallback = "/title/123?fallback=1";

  it.each([
    "/library?status=plan",
    "/title/9a1d5a35-2d27-4f0a-a75c-5ac6029af733?saved=1",
  ])("accepts known application paths", (value) => {
    expect(safeReturnPath(value, fallback)).toBe(value);
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/library\u0000",
    "/other",
  ])("rejects unsafe return path %j", (value) => {
    expect(safeReturnPath(value, fallback)).toBe(fallback);
  });
});
