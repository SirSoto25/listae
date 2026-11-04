import { describe, expect, it, vi } from "vitest";

import {
  clientIpFromHeaders,
  ipRateLimitBucket,
  warnIfClientIpUnconfigured,
} from "./client-ip";

const xff = (value: string, extra: Record<string, string> = {}) =>
  new Headers({ "x-forwarded-for": value, ...extra });

describe("clientIpFromHeaders with TRUSTED_PROXY_HOPS", () => {
  it("takes the hop appended by the only trusted proxy", () => {
    expect(
      clientIpFromHeaders(xff("6.6.6.6, 2.2.2.2"), { TRUSTED_PROXY_HOPS: "1" }),
    ).toBe("2.2.2.2");
  });

  it("walks one hop further left per extra trusted proxy", () => {
    expect(
      clientIpFromHeaders(xff("6.6.6.6, 2.2.2.2"), { TRUSTED_PROXY_HOPS: "2" }),
    ).toBe("6.6.6.6");
  });

  it("returns null when there are fewer hops than trusted proxies", () => {
    expect(
      clientIpFromHeaders(xff("6.6.6.6, 2.2.2.2"), { TRUSTED_PROXY_HOPS: "3" }),
    ).toBeNull();
  });

  it.each([undefined, "", "abc", "0", "-1", "1.5"])(
    "never trusts x-forwarded-for when hops is %j",
    (hops) => {
      expect(
        clientIpFromHeaders(xff("6.6.6.6, 2.2.2.2"), {
          TRUSTED_PROXY_HOPS: hops,
        }),
      ).toBeNull();
    },
  );

  it("ignores a hop that is not an IP address", () => {
    expect(
      clientIpFromHeaders(xff("6.6.6.6, not-an-ip"), {
        TRUSTED_PROXY_HOPS: "1",
      }),
    ).toBeNull();
  });

  it("is not fooled by a spoofed, rotating x-forwarded-for prefix", () => {
    const seen = new Set<string | null>();
    for (let i = 0; i < 50; i++) {
      seen.add(
        clientIpFromHeaders(xff(`10.0.0.${i}, 1.1.${i}.1, 2.2.2.2`), {
          TRUSTED_PROXY_HOPS: "1",
        }),
      );
    }
    expect([...seen]).toEqual(["2.2.2.2"]);
  });

  it("without any configuration, spoofed x-forwarded-for gives no IP", () => {
    for (let i = 0; i < 20; i++) {
      expect(clientIpFromHeaders(xff(`10.0.0.${i}`), {})).toBeNull();
    }
  });
});

describe("clientIpFromHeaders with CLIENT_IP_HEADER", () => {
  it("reads the header the proxy overwrites, ahead of hops", () => {
    const headers = xff("6.6.6.6, 2.2.2.2", { "x-real-ip": "9.9.9.9" });
    expect(
      clientIpFromHeaders(headers, {
        CLIENT_IP_HEADER: "x-real-ip",
        TRUSTED_PROXY_HOPS: "1",
      }),
    ).toBe("9.9.9.9");
  });

  it("does not read x-real-ip unless it is configured", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-real-ip": "9.9.9.9" }), {}),
    ).toBeNull();
  });

  it("rejects a list or garbage in the configured header", () => {
    for (const value of ["9.9.9.9, 1.1.1.1", "unknown", "9.9.9.9:443"]) {
      expect(
        clientIpFromHeaders(new Headers({ "x-real-ip": value }), {
          CLIENT_IP_HEADER: "x-real-ip",
        }),
      ).toBeNull();
    }
  });

  it("returns null for an invalid header name instead of throwing", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-real-ip": "9.9.9.9" }), {
        CLIENT_IP_HEADER: "bad header",
      }),
    ).toBeNull();
  });

  it("returns null when the configured header is missing", () => {
    expect(
      clientIpFromHeaders(new Headers(), { CLIENT_IP_HEADER: "x-real-ip" }),
    ).toBeNull();
  });
});

describe("ipRateLimitBucket", () => {
  it("keeps an IPv4 address as is", () => {
    expect(ipRateLimitBucket("203.0.113.5")).toBe("203.0.113.5");
  });

  it("unwraps IPv4-mapped IPv6", () => {
    expect(ipRateLimitBucket("::ffff:203.0.113.5")).toBe("203.0.113.5");
  });

  it("groups IPv6 addresses by /64 so a host cannot rotate its suffix", () => {
    expect(ipRateLimitBucket("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(ipRateLimitBucket("2001:DB8:1:2:ffff:1:2:3")).toBe(
      "2001:db8:1:2::/64",
    );
    expect(ipRateLimitBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipRateLimitBucket("::1")).toBe("0:0:0:0::/64");
  });
});

describe("warnIfClientIpUnconfigured", () => {
  it("warns once, only in a production server without an IP source", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnIfClientIpUnconfigured({ NODE_ENV: "development" });
    warnIfClientIpUnconfigured({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
    });
    warnIfClientIpUnconfigured({
      NODE_ENV: "production",
      CLIENT_IP_HEADER: "x-real-ip",
    });
    expect(warn).not.toHaveBeenCalled();

    warnIfClientIpUnconfigured({ NODE_ENV: "production" });
    warnIfClientIpUnconfigured({ NODE_ENV: "production" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("CLIENT_IP_HEADER");
    warn.mockRestore();
  });
});
