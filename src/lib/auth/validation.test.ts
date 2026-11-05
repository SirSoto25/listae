import { describe, expect, it } from "vitest";

import {
  emailLocalPart,
  isStrictEmail,
  normalizeEmail,
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

describe("normalizeEmail", () => {
  it("applies NFKC, trims and lowercases", () => {
    expect(normalizeEmail("  ＡＢ@Ｃ.com ")).toBe("ab@c.com");
  });

  it("turns a fullwidth @ into a real one so the strict check sees it", () => {
    expect(normalizeEmail("a＠b@c.com")).toBe("a@b@c.com");
    expect(isStrictEmail(normalizeEmail("a＠b@c.com"))).toBe(false);
  });
});

describe("isStrictEmail", () => {
  it.each(["a@b.co", "first.last+tag@sub.example.com", "o'neil@example.ie"])(
    "accepts %j",
    (email) => {
      expect(isStrictEmail(email)).toBe(true);
    },
  );

  it.each([
    ["parentheses (comments)", "x(c)@victima.com"],
    ["angle brackets", "<a>@b.com"],
    ["semicolon", "a;b@c.com"],
    ["comma (address list)", "a,b@c.com"],
    ["comma in the domain", "a@b.com,evil.com"],
    ["double quotes", '"a"@b.com'],
    ["quoted local part with @", '"a@evil.com"@b.com'],
    ["second @", "a@@b.com"],
    ["second @ in the local part", "a@evil.com@b.com"],
    ["space", "a b@c.com"],
    ["no dot in the domain", "a@b"],
    ["empty local part", "@b.com"],
    ["leading dot", ".a@b.com"],
    ["consecutive dots", "a..b@c.com"],
    ["hyphen at a label edge", "a@-b.com"],
    ["label over 63 characters", `a@${"b".repeat(64)}.com`],
    ["local part over 64 characters", `${"a".repeat(65)}@b.com`],
    ["over 254 characters", `a@${Array(4).fill("b".repeat(63)).join(".")}.com`],
    ["control character", "a\n@b.com"],
  ])("rejects %s", (_label, email) => {
    expect(isStrictEmail(email)).toBe(false);
  });
});
