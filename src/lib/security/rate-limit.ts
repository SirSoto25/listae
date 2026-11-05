import type Database from "better-sqlite3";
import { createHash } from "node:crypto";

import { sqlite } from "@/lib/db";

/**
 * Fixed-window rate limits stored in SQLite (`rate_limit_windows`, ADR 014).
 *
 * - Every worker and every restart sees the same windows.
 * - Each key (`<category>:<subject>`, e.g. `magic-link:v@x.com`,
 *   `search:ip:203.0.113.5`) has its own row and its own limit. There is no
 *   global cap: an active window is never evicted to make room for others,
 *   so flooding one category cannot reset another. Only expired windows are
 *   deleted.
 * - Fail-closed by default: if the store fails, the action is refused.
 *   Callers whose abuse costs little (search) opt into `failOpen`.
 */

const MAX_RAW_KEY_LENGTH = 128;
/** Expired windows are swept at most this often per process. */
const PURGE_INTERVAL_MS = 60_000;

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  /** Allow the action when the store is unavailable. Default: refuse it. */
  failOpen?: boolean;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
};

function storageKey(key: string): string {
  return key.length > MAX_RAW_KEY_LENGTH
    ? `sha256:${createHash("sha256").update(key).digest("hex")}`
    : key;
}

/**
 * One atomic statement: SQLite serialises writers, so two workers can never
 * both read `count = limit - 1` and both pass.
 */
const UPSERT_SQL = `
INSERT INTO rate_limit_windows (key, count, reset_at) VALUES (@key, 1, @resetAt)
ON CONFLICT(key) DO UPDATE SET
  count    = CASE WHEN reset_at <= @now THEN 1 ELSE count + 1 END,
  reset_at = CASE WHEN reset_at <= @now THEN excluded.reset_at ELSE reset_at END
RETURNING count, reset_at`;

const PURGE_SQL = "DELETE FROM rate_limit_windows WHERE reset_at <= ?";

export function createRateLimiter(store: Database.Database) {
  let upsert: Database.Statement<
    [{ key: string; resetAt: number; now: number }]
  > | null = null;
  let purge: Database.Statement<[number]> | null = null;
  let lastPurgeAt = Number.NEGATIVE_INFINITY;

  function purgeExpired(nowMs: number = Date.now()): number {
    purge ??= store.prepare(PURGE_SQL);
    lastPurgeAt = nowMs;
    return purge.run(nowMs).changes;
  }

  function check(
    key: string,
    { limit, windowMs, failOpen }: RateLimitOptions,
  ): RateLimitResult {
    const now = Date.now();
    try {
      // `abs` so a clock moving backwards (or fake timers) still purges.
      if (Math.abs(now - lastPurgeAt) >= PURGE_INTERVAL_MS) purgeExpired(now);

      // Prepared lazily: the table may not exist until migrations run.
      upsert ??= store.prepare(UPSERT_SQL);
      const row = upsert.get({
        key: storageKey(key),
        resetAt: now + windowMs,
        now,
      }) as
        | { count: number; reset_at: number }
        | undefined;
      if (!row) throw new Error("rate limit upsert returned no row");

      if (row.count <= limit) return { ok: true };
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
      };
    } catch (error) {
      console.warn(
        `[listae rate-limit] store unavailable, failing ${failOpen ? "open" : "closed"}:`,
        error instanceof Error ? error.message : error,
      );
      return { ok: failOpen === true };
    }
  }

  return {
    check,
    purgeExpired,
    resetForTests() {
      store.exec("DELETE FROM rate_limit_windows");
      lastPurgeAt = Number.NEGATIVE_INFINITY;
    },
  };
}

const limiter = createRateLimiter(sqlite);

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  return limiter.check(key, opts);
}

/** Deletes expired windows and returns how many were removed. */
export function purgeExpiredRateLimits(nowMs?: number): number {
  return limiter.purgeExpired(nowMs);
}

export function resetRateLimitsForTests(): void {
  limiter.resetForTests();
}
