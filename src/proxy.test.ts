import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, isAppRoute, preferredLocale, proxy } from "./proxy";

function nonceOf(policy: string | null): string | undefined {
  return policy?.match(/'nonce-([^']+)'/)?.[1];
}

describe("proxy CSP", () => {
  it("sends the profile policy on /u/* without redirecting", () => {
    const res = proxy(new NextRequest("http://localhost/u/demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    const policy = res.headers.get("content-security-policy");
    expect(policy).toContain("https://fonts.googleapis.com");
    expect(policy).toContain("https://fonts.gstatic.com");
    expect(nonceOf(policy)).toBeTruthy();
  });

  it("does not set locale cookies or headers on /u/*", () => {
    const res = proxy(new NextRequest("http://localhost/u/demo"));
    expect(res.cookies.getAll()).toEqual([]);
    expect(res.headers.get("x-middleware-request-x-listae-locale")).toBeNull();
  });

  it("sends the app policy on localized pages and forwards the nonce", () => {
    const res = proxy(new NextRequest("http://localhost/es/library"));
    const policy = res.headers.get("content-security-policy");
    expect(policy).not.toContain("fonts.googleapis.com");
    const nonce = nonceOf(policy);
    expect(nonce).toBeTruthy();
    // NextResponse.next({ request: { headers } }) exposes overridden request
    // headers as x-middleware-request-*; Next reads the nonce from them.
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(
      res.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(policy);
  });

  it("uses a different nonce per request", () => {
    const a = proxy(new NextRequest("http://localhost/es"));
    const b = proxy(new NextRequest("http://localhost/es"));
    expect(nonceOf(a.headers.get("content-security-policy"))).not.toBe(
      nonceOf(b.headers.get("content-security-policy")),
    );
  });

  it("matcher covers /u/ but still skips api and static assets", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    expect(re.test("/u/demo")).toBe(true);
    expect(re.test("/u/demo/customize")).toBe(true);
    expect(re.test("/es/library")).toBe(true);
    expect(re.test("/api/auth/session")).toBe(false);
    expect(re.test("/_next/static/chunk.js")).toBe(false);
    expect(re.test("/favicon.ico")).toBe(false);
  });
});

describe("isAppRoute", () => {
  it("matches app root paths", () => {
    expect(isAppRoute("/")).toBe(true);
    expect(isAppRoute("/library")).toBe(true);
    expect(isAppRoute("/login")).toBe(true);
    expect(isAppRoute("/onboarding")).toBe(true);
  });

  it("matches login subpaths and title detail", () => {
    expect(isAppRoute("/login/verify")).toBe(true);
    expect(isAppRoute("/title/550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("excludes profile and api paths", () => {
    expect(isAppRoute("/u/alice")).toBe(false);
    expect(isAppRoute("/api/auth/session")).toBe(false);
  });
});

describe("preferredLocale", () => {
  it("prefers the last browsed locale cookie over Accept-Language", () => {
    expect(preferredLocale("en", "es-ES,es;q=0.9")).toBe("en");
    expect(preferredLocale("es", "en-US,en;q=0.9")).toBe("es");
  });

  it("falls back to Accept-Language when the cookie is missing or invalid", () => {
    expect(preferredLocale(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(preferredLocale("fr", "en-US,en;q=0.9")).toBe("en");
  });
});
