import { describe, expect, it } from "vitest";

import {
  emailLocalPart,
  normalizeUsername,
  USERNAME_PATTERN,
  usernameMatchesEmailLocalPart,
} from "./validation";

describe("auth profile helpers", () => {
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

  it("extracts the email local-part", () => {
    expect(emailLocalPart("alex.soto@example.com")).toBe("alex.soto");
    expect(emailLocalPart("user@domain@extra")).toBe("user");
  });

  it("detects when username matches the email local-part", () => {
    expect(
      usernameMatchesEmailLocalPart("alex_soto", "Alex_Soto@example.com"),
    ).toBe(true);
    expect(
      usernameMatchesEmailLocalPart("  Alex_Soto  ", "alex_soto@example.com"),
    ).toBe(true);
    expect(
      usernameMatchesEmailLocalPart("other_name", "alex_soto@example.com"),
    ).toBe(false);
  });
});
