import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  clientIpFromHeaders,
  resetRateLimitsForTests,
  trackedRateLimitKeysForTests,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitsForTests();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    expect(checkRateLimit("a", { limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(checkRateLimit("a", { limit: 2, windowMs: 60_000 }).ok).toBe(true);
  });

  it("blocks once the fixed window is exhausted", () => {
    checkRateLimit("b", { limit: 1, windowMs: 60_000 });
    const blocked = checkRateLimit("b", { limit: 1, windowMs: 60_000 });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    checkRateLimit("c", { limit: 1, windowMs: 1_000 });
    expect(checkRateLimit("c", { limit: 1, windowMs: 1_000 }).ok).toBe(false);

    vi.setSystemTime(new Date("2026-07-29T12:00:01Z"));
    expect(checkRateLimit("c", { limit: 1, windowMs: 1_000 }).ok).toBe(true);
  });
});

describe("checkRateLimit memory bounds", () => {
  it("caps the number of tracked keys", () => {
    for (let i = 0; i < 10_050; i++) {
      checkRateLimit(`flood:${i}`, { limit: 1, windowMs: 60_000 });
    }
    expect(trackedRateLimitKeysForTests()).toBeLessThanOrEqual(10_000);
  });

  it("still limits very long keys after hashing them", () => {
    const key = `login:email:${"a".repeat(5_000)}@example.com`;
    expect(checkRateLimit(key, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(checkRateLimit(key, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  it("uses the proxy-appended (right-most) x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 198.51.100.2",
    });

    expect(clientIpFromHeaders(headers)).toBe("198.51.100.2");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.9" });
    expect(clientIpFromHeaders(headers)).toBe("198.51.100.9");
  });

  it("returns null when no client IP headers are present", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});
