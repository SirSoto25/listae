import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { migratedTestDb } from "@/test/db";

const mocks = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => mocks.headers),
}));

type ConfigModule = typeof import("./config");
let config: ConfigModule;
let resetRateLimitsForTests: () => void;

beforeAll(async () => {
  await migratedTestDb();
  config = await import("./config");
  ({ resetRateLimitsForTests } = await import("@/lib/security/rate-limit"));
});

beforeEach(() => {
  mocks.headers = new Headers();
  resetRateLimitsForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function requestLink(email: string) {
  return config.authConfig.callbacks.signIn({
    user: { email },
    account: null,
    profile: undefined,
    email: { verificationRequest: true },
    credentials: undefined,
  });
}

function nodemailerOptions() {
  const [provider] = config.authConfig.providers;
  return (
    provider as unknown as {
      options: {
        maxAge?: number;
        normalizeIdentifier?: (identifier: string) => string;
      };
    }
  ).options;
}

it("allows the initial email verification request before a user exists", async () => {
  expect(await requestLink("new-user@example.com")).toBe(true);
});

it("allows Auth.js to create a session for a newly verified user", async () => {
  const result = await config.authConfig.callbacks.signIn({
    user: { email: "new-user@example.com" },
    account: null,
    profile: undefined,
    email: undefined,
    credentials: undefined,
  });

  expect(result).toBe(true);
});

it("allows sign-in before the adapter has inserted the new user", async () => {
  const result = await config.authConfig.callbacks.signIn({
    user: { id: "pending-user", email: "pending-user@example.com" },
    account: null,
    profile: undefined,
    email: undefined,
    credentials: undefined,
  });

  expect(result).toBe(true);
});

it("keeps safe locale-prefixed post-login callbacks intact", async () => {
  const result = await config.authConfig.callbacks.redirect({
    url: "http://localhost:3000/es/library",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000/es/library");
});

it("keeps the rate-limited login error returned by signIn", async () => {
  const result = await config.authConfig.callbacks.redirect({
    url: "/en/login?error=RateLimited",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000/en/login?error=RateLimited");
});

it("rejects unsafe same-origin redirect targets", async () => {
  const result = await config.authConfig.callbacks.redirect({
    url: "http://localhost:3000//evil.example",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000");
});

it("rejects external redirect targets", async () => {
  const result = await config.authConfig.callbacks.redirect({
    url: "https://evil.example/phish",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000");
});

it("points Auth.js at custom sign-in and verify pages", () => {
  expect(config.authConfig.pages).toEqual({
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  });
});

describe("magic link provider", () => {
  it("expires magic links after 15 minutes", () => {
    expect(config.MAGIC_LINK_MAX_AGE_SECONDS).toBe(900);
    expect(nodemailerOptions().maxAge).toBe(900);
  });

  it("normalizes identifiers with NFKC and rejects non-strict addresses", () => {
    const normalize = nodemailerOptions().normalizeIdentifier;
    expect(normalize?.(" ＶＩＣＴＩＭ@Example.com ")).toBe("victim@example.com");
    expect(() => normalize?.("x(c)@victima.com")).toThrow();
    expect(() => normalize?.("a,b@victima.com")).toThrow();
    expect(() => normalize?.("a＠evil.com@victima.com")).toThrow();
  });
});

describe("single magic-link rate limit (callbacks.signIn)", () => {
  it("shares one budget across case, NFKC and +tag aliases", () => {
    expect(config.magicLinkRateLimitKey(" Victim+1@Example.com ")).toBe(
      "magic-link:email:victim@example.com",
    );
    expect(config.magicLinkRateLimitKey("ＶＩＣＴＩＭ@example.com")).toBe(
      "magic-link:email:victim@example.com",
    );
  });

  it("allows 5 requests per email and returns the localized error on the 6th", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await requestLink("v@x.com")).toBe(true);
    }
    expect(await requestLink("v+alias@x.com")).toBe("/es/login?error=RateLimited");
  });

  it("uses the locale cookie for the rate-limit error", async () => {
    mocks.headers = new Headers({ cookie: "listae-locale=en" });
    for (let i = 0; i < 5; i += 1) await requestLink("v@x.com");
    expect(await requestLink("v@x.com")).toBe("/en/login?error=RateLimited");
  });

  it("limits a trusted client IP to 20 requests across different emails", async () => {
    vi.stubEnv("CLIENT_IP_HEADER", "x-real-ip");
    mocks.headers = new Headers({ "x-real-ip": "203.0.113.7" });
    for (let i = 0; i < 20; i += 1) {
      expect(await requestLink(`user${i}@x.com`)).toBe(true);
    }
    expect(await requestLink("user20@x.com")).toBe("/es/login?error=RateLimited");
  });

  it("does not let an IP-blocked request burn the victim's email budget", async () => {
    vi.stubEnv("CLIENT_IP_HEADER", "x-real-ip");
    mocks.headers = new Headers({ "x-real-ip": "203.0.113.7" });
    for (let i = 0; i < 20; i += 1) await requestLink(`user${i}@x.com`);
    for (let i = 0; i < 10; i += 1) await requestLink("victim@x.com");

    mocks.headers = new Headers({ "x-real-ip": "198.51.100.9" });
    expect(await requestLink("victim@x.com")).toBe(true);
  });
});
