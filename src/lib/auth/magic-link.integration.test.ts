/**
 * Drives the real Auth.js route handlers (`/api/auth/*`) against a migrated
 * in-memory database: what a direct POST to the sign-in endpoint really does.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { migratedTestDb } from "@/test/db";

const mocks = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => mocks.headers),
}));

const ORIGIN = "http://localhost:3000";

let sqlite: import("better-sqlite3").Database;
let handlers: (typeof import("@/lib/auth"))["handlers"];
let resetRateLimitsForTests: () => void;

beforeAll(async () => {
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.stubEnv("EMAIL_SERVER", "");
  ({ sqlite } = await migratedTestDb());
  ({ handlers } = await import("@/lib/auth"));
  ({ resetRateLimitsForTests } = await import("@/lib/security/rate-limit"));
});

beforeEach(() => {
  sqlite.exec("DELETE FROM verification_tokens");
  resetRateLimitsForTests();
  mocks.headers = new Headers();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function csrf(): Promise<{ token: string; cookie: string }> {
  const res = await handlers.GET(new NextRequest(`${ORIGIN}/api/auth/csrf`));
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { token: csrfToken, cookie };
}

async function requestMagicLink(email: string): Promise<string> {
  const { token, cookie } = await csrf();
  const res = await handlers.POST(
    new NextRequest(`${ORIGIN}/api/auth/signin/nodemailer`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie,
      },
      body: new URLSearchParams({
        email,
        csrfToken: token,
        callbackUrl: `${ORIGIN}/es/library`,
      }),
    }),
  );
  return res.headers.get("location") ?? `status ${res.status}`;
}

function tokenRows(): { identifier: string; expires: number }[] {
  return sqlite
    .prepare("select identifier, expires from verification_tokens")
    .all() as { identifier: string; expires: number }[];
}

describe("magic link sign-in endpoint", () => {
  it("stores a verification token that expires in 15 minutes", async () => {
    const before = Date.now();
    expect(await requestMagicLink("Reader@Example.com")).toMatch(
      /\/api\/auth\/verify-request/,
    );

    const rows = tokenRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].identifier).toBe("reader@example.com");
    // Drizzle stores `expires` as a unix timestamp in seconds.
    const expiresMs = rows[0].expires * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(before + 899_000);
    expect(expiresMs).toBeLessThanOrEqual(Date.now() + 901_000);
  });

  it("redirects the 6th request to RateLimited without leaving a token row", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await requestMagicLink("victim@example.com")).toMatch(
        /verify-request/,
      );
    }

    expect(await requestMagicLink("Victim+again@example.com")).toBe(
      `${ORIGIN}/es/login?error=RateLimited`,
    );
    expect(tokenRows()).toHaveLength(5);
  });

  it("rejects a non-strict address before creating a token", async () => {
    const location = await requestMagicLink("x(c)@victima.com");
    expect(location).not.toMatch(/verify-request/);
    expect(tokenRows()).toHaveLength(0);
  });
});
