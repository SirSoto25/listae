import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { openDatabase } from "@/lib/db/connection";
import { runMigrations } from "@/lib/db/migrate";
import { migratedTestDb } from "@/test/db";

import { clientIpFromHeaders } from "./client-ip";
import type * as RateLimitModule from "./rate-limit";

let rl: typeof RateLimitModule;
let sqlite: Database.Database;

const HOUR = 3_600_000;
const T0 = new Date("2026-11-04T12:00:00Z");

beforeAll(async () => {
  sqlite = (await migratedTestDb()).sqlite;
  rl = await import("./rate-limit");
});

beforeEach(() => {
  rl.resetRateLimitsForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function rowCount(db: Database.Database = sqlite): number {
  return (
    db.prepare("select count(*) as n from rate_limit_windows").get() as {
      n: number;
    }
  ).n;
}

describe("checkRateLimit (SQLite)", () => {
  it("allows up to the limit then blocks with retryAfterSec", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const opts = { limit: 3, windowMs: 60_000 };

    expect(rl.checkRateLimit("k", opts)).toEqual({ ok: true });
    expect(rl.checkRateLimit("k", opts)).toEqual({ ok: true });
    expect(rl.checkRateLimit("k", opts)).toEqual({ ok: true });

    vi.setSystemTime(T0.getTime() + 15_500);
    expect(rl.checkRateLimit("k", opts)).toEqual({
      ok: false,
      retryAfterSec: 45,
    });
  });

  it("opens a new window after windowMs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const opts = { limit: 1, windowMs: 1_000 };

    expect(rl.checkRateLimit("c", opts).ok).toBe(true);
    expect(rl.checkRateLimit("c", opts).ok).toBe(false);

    vi.setSystemTime(T0.getTime() + 1_000);
    expect(rl.checkRateLimit("c", opts).ok).toBe(true);
    expect(rl.checkRateLimit("c", opts).ok).toBe(false);
  });

  it("blocked attempts do not extend the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const opts = { limit: 1, windowMs: 10_000 };

    rl.checkRateLimit("w", opts);
    vi.setSystemTime(T0.getTime() + 9_000);
    expect(rl.checkRateLimit("w", opts).ok).toBe(false);
    vi.setSystemTime(T0.getTime() + 10_000);
    expect(rl.checkRateLimit("w", opts).ok).toBe(true);
  });

  it("distinct keys never reset an active window", () => {
    const magicLink = { limit: 5, windowMs: HOUR };
    for (let i = 0; i < 5; i++) {
      expect(rl.checkRateLimit("magic-link:v@x.com", magicLink).ok).toBe(true);
    }

    // The old in-memory map evicted the oldest windows after 10 000 keys.
    for (let i = 0; i < 20_000; i++) {
      rl.checkRateLimit(`search:ip:${i}`, { limit: 30, windowMs: HOUR });
    }

    expect(rl.checkRateLimit("magic-link:v@x.com", magicLink).ok).toBe(false);
    expect(rowCount()).toBe(20_001);
  });

  it("still limits very long keys after hashing them", () => {
    const key = `magic-link:${"a".repeat(5_000)}@example.com`;
    expect(rl.checkRateLimit(key, { limit: 1, windowMs: HOUR }).ok).toBe(true);
    expect(rl.checkRateLimit(key, { limit: 1, windowMs: HOUR }).ok).toBe(false);

    const stored = sqlite.prepare("select key from rate_limit_windows").get() as {
      key: string;
    };
    expect(stored.key).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("purges expired windows", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    rl.checkRateLimit("short:1", { limit: 1, windowMs: 1_000 });
    rl.checkRateLimit("short:2", { limit: 1, windowMs: 1_000 });
    rl.checkRateLimit("long", { limit: 1, windowMs: HOUR });

    expect(rl.purgeExpiredRateLimits(T0.getTime() + 1_000 + 1)).toBe(2);
    expect(rowCount()).toBe(1);
    expect(rl.checkRateLimit("long", { limit: 1, windowMs: HOUR }).ok).toBe(false);
  });

  it("purges expired windows on its own as time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    for (let i = 0; i < 50; i++) {
      rl.checkRateLimit(`old:${i}`, { limit: 1, windowMs: 1_000 });
    }

    vi.setSystemTime(T0.getTime() + 10 * 60_000);
    rl.checkRateLimit("fresh", { limit: 1, windowMs: HOUR });

    expect(rowCount()).toBe(1);
  });
});

describe("createRateLimiter", () => {
  function freshStore(file = ":memory:"): Database.Database {
    const db = openDatabase(file);
    runMigrations(db);
    return db;
  }

  it("fails closed when the store throws", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const closed = freshStore();
    closed.close();
    const limiter = rl.createRateLimiter(closed);

    expect(limiter.check("k", { limit: 5, windowMs: 1_000 })).toEqual({
      ok: false,
    });
    expect(
      limiter.check("k", { limit: 5, windowMs: 1_000, failOpen: true }),
    ).toEqual({ ok: true });
    expect(console.warn).toHaveBeenCalled();
  });

  it("fails closed when the table does not exist yet", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = rl.createRateLimiter(new Database(":memory:"));

    expect(limiter.check("k", { limit: 5, windowMs: 1_000 }).ok).toBe(false);
  });

  describe("on a database file", () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "listae-rl-"));
    });
    afterEach(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("keeps windows across a restart (new connection, same file)", () => {
      const file = path.join(dir, "listae.db");
      const opts = { limit: 5, windowMs: HOUR };

      const before = freshStore(file);
      const first = rl.createRateLimiter(before);
      for (let i = 0; i < 5; i++) {
        expect(first.check("magic-link:v@x.com", opts).ok).toBe(true);
      }
      before.close();

      const after = freshStore(file);
      const second = rl.createRateLimiter(after);
      expect(second.check("magic-link:v@x.com", opts).ok).toBe(false);
      after.close();
    });

    it("shares one budget between workers on the same file", () => {
      const file = path.join(dir, "listae.db");
      const opts = { limit: 4, windowMs: HOUR };
      const a = freshStore(file);
      const b = openDatabase(file);
      const workerA = rl.createRateLimiter(a);
      const workerB = rl.createRateLimiter(b);

      const results = [
        workerA.check("search:ip:1.2.3.4", opts).ok,
        workerB.check("search:ip:1.2.3.4", opts).ok,
        workerA.check("search:ip:1.2.3.4", opts).ok,
        workerB.check("search:ip:1.2.3.4", opts).ok,
        workerA.check("search:ip:1.2.3.4", opts).ok,
        workerB.check("search:ip:1.2.3.4", opts).ok,
      ];
      expect(results).toEqual([true, true, true, true, false, false]);
      a.close();
      b.close();
    });
  });
});

describe("rate limits keyed by trusted client IP", () => {
  it("a client rotating a spoofed x-forwarded-for still hits its limit", () => {
    const env = { TRUSTED_PROXY_HOPS: "1" };
    const opts = { limit: 30, windowMs: HOUR };
    const outcomes: boolean[] = [];
    for (let i = 0; i < 31; i++) {
      const headers = new Headers({
        // The client sends anything it likes; the proxy appends the socket IP.
        "x-forwarded-for": `198.51.${i}.${i}, 203.0.113.7`,
      });
      const ip = clientIpFromHeaders(headers, env);
      outcomes.push(rl.checkRateLimit(`search:ip:${ip}`, opts).ok);
    }
    expect(outcomes.slice(0, 30).every(Boolean)).toBe(true);
    expect(outcomes[30]).toBe(false);
  });
});
