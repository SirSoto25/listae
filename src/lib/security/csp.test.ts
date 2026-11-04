import { describe, expect, it } from "vitest";

import {
  buildCsp,
  cspHeaderName,
  cspRouteFor,
  generateNonce,
} from "./csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values] as [string, string[]];
      }),
  );
}

describe("buildCsp", () => {
  it("app policy uses the nonce, forbids framing and has no eval", () => {
    const policy = buildCsp({ nonce: "abc", route: "app", dev: false });
    const d = directives(policy);
    expect(d.get("script-src")).toEqual([
      "'self'",
      "'nonce-abc'",
      "'strict-dynamic'",
    ]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("font-src")).toEqual(["'self'"]);
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("img-src")).toEqual(["'self'", "https:", "data:"]);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("fonts.g");
  });

  it("profile policy allows Google Fonts for the inherited srcdoc document", () => {
    const d = directives(buildCsp({ nonce: "abc", route: "profile", dev: false }));
    expect(d.get("style-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ]);
    expect(d.get("font-src")).toEqual(["'self'", "https://fonts.gstatic.com"]);
    expect(d.get("img-src")).toEqual(["'self'", "https:", "data:"]);
    // User HTML never runs scripts: the profile keeps the strict script policy.
    expect(d.get("script-src")).toEqual([
      "'self'",
      "'nonce-abc'",
      "'strict-dynamic'",
    ]);
  });

  it("never puts a nonce in style-src (it would disable 'unsafe-inline')", () => {
    for (const route of ["app", "profile"] as const) {
      const d = directives(buildCsp({ nonce: "abc", route, dev: false }));
      expect(d.get("style-src")?.some((v) => v.startsWith("'nonce-"))).toBe(
        false,
      );
    }
  });

  it("dev adds eval for React debugging and websockets for HMR", () => {
    const d = directives(buildCsp({ nonce: "abc", route: "app", dev: true }));
    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(d.get("connect-src")).toEqual(["'self'", "ws:"]);
  });
});

describe("cspRouteFor", () => {
  it("uses the profile policy for /u/* (profile and customize)", () => {
    expect(cspRouteFor("/u/demo")).toBe("profile");
    expect(cspRouteFor("/u/demo/customize")).toBe("profile");
  });

  it("uses the app policy elsewhere", () => {
    expect(cspRouteFor("/es")).toBe("app");
    expect(cspRouteFor("/en/library")).toBe("app");
    expect(cspRouteFor("/user")).toBe("app");
  });
});

describe("cspHeaderName", () => {
  it("enforces by default and switches to report-only with CSP_REPORT_ONLY=1", () => {
    expect(cspHeaderName(undefined)).toBe("Content-Security-Policy");
    expect(cspHeaderName("0")).toBe("Content-Security-Policy");
    expect(cspHeaderName("1")).toBe("Content-Security-Policy-Report-Only");
  });
});

describe("generateNonce", () => {
  it("returns a fresh base64 value each call", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a.length).toBeGreaterThanOrEqual(22);
  });
});
