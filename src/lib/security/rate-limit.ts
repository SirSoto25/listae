import { createHash } from "node:crypto";

type Window = {
  count: number;
  resetAt: number;
};

/** Bounds memory when keys are derived from attacker-supplied input. */
const MAX_TRACKED_KEYS = 10_000;
const MAX_RAW_KEY_LENGTH = 128;

const windows = new Map<string, Window>();

function storageKey(key: string): string {
  return key.length > MAX_RAW_KEY_LENGTH
    ? `sha256:${createHash("sha256").update(key).digest("hex")}`
    : key;
}

function makeRoom(now: number): void {
  if (windows.size < MAX_TRACKED_KEYS) return;

  for (const [key, entry] of windows) {
    if (now >= entry.resetAt) windows.delete(key);
  }
  // Still full: drop the oldest windows (Map iterates in insertion order).
  for (const key of windows.keys()) {
    if (windows.size < MAX_TRACKED_KEYS) break;
    windows.delete(key);
  }
}

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
};

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const id = storageKey(key);
  const entry = windows.get(id);

  if (!entry || now >= entry.resetAt) {
    windows.delete(id);
    makeRoom(now);
    windows.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true };
}

/**
 * Uses the right-most X-Forwarded-For hop: the one appended by the proxy in
 * front of the app. Left-most entries are whatever the client chose to send,
 * so trusting them lets a caller rotate IPs and skip every per-IP limit.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").at(-1)?.trim();
    if (last) {
      return last;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export function trackedRateLimitKeysForTests(): number {
  return windows.size;
}

export function resetRateLimitsForTests(): void {
  windows.clear();
}
