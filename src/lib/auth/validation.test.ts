import { describe, expect, it } from "vitest";

import {
  displayNameFromEmail,
  normalizeUsername,
  USERNAME_PATTERN,
} from "./validation";

describe("auth profile helpers", () => {
  it("derives a display name from the email local-part", () => {
    expect(displayNameFromEmail("alex.soto@example.com")).toBe("alex.soto");
  });

  it("normalizes usernames before validation", () => {
    expect(normalizeUsername("  Alex_Soto  ")).toBe("alex_soto");
  });

  it("accepts only lowercase username slugs from 3 to 32 characters", () => {
    expect(USERNAME_PATTERN.test("abc")).toBe(true);
    expect(USERNAME_PATTERN.test("alex_soto25")).toBe(true);
    expect(USERNAME_PATTERN.test("ab")).toBe(false);
    expect(USERNAME_PATTERN.test("Alex-Soto")).toBe(false);
    expect(USERNAME_PATTERN.test("a".repeat(33))).toBe(false);
  });
});
