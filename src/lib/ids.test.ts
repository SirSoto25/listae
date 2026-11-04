import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts canonical UUIDs", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUIDs", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects arbitrary strings", () => {
    expect(isUuid("x")).toBe(false);
    expect(isUuid("abc")).toBe(false);
  });

  it("rejects UUIDs without hyphens", () => {
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("rejects empty and malformed values", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716-44665544000g")).toBe(false);
    expect(isUuid(" 550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });
});
