import { isIP } from "node:net";

/**
 * Where the client IP comes from (ADR 014). Nothing a client sends is trusted
 * unless the operator says which proxy wrote it:
 *
 * - `CLIENT_IP_HEADER` (recommended, e.g. `x-real-ip`): a header that the
 *   reverse proxy in front of the app **overwrites** with the socket address.
 * - `TRUSTED_PROXY_HOPS` (e.g. `1`): how many proxies **append** to
 *   `X-Forwarded-For`. The client IP is the entry that many hops from the
 *   right; everything further left is whatever the client chose to send.
 *
 * Without either, the IP is unknown (`null`): callers must then use a shared
 * bucket (search) or skip the per-IP limit while keeping the per-email one
 * (login), never fall back to client-controlled headers.
 */
export type ClientIpEnv = {
  TRUSTED_PROXY_HOPS?: string;
  CLIENT_IP_HEADER?: string;
  [name: string]: string | undefined;
};

const HEADER_NAME = /^[A-Za-z0-9-]+$/;
const HOPS = /^[1-9][0-9]?$/;

function validIp(value: string | undefined | null): string | null {
  const ip = value?.trim();
  return ip && isIP(ip) ? ip.toLowerCase() : null;
}

export function clientIpFromHeaders(
  headers: Headers,
  env: ClientIpEnv = process.env,
): string | null {
  const headerName = env.CLIENT_IP_HEADER?.trim();
  if (headerName) {
    return HEADER_NAME.test(headerName) ? validIp(headers.get(headerName)) : null;
  }

  const hops = env.TRUSTED_PROXY_HOPS?.trim() ?? "";
  if (!HOPS.test(hops)) return null;

  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim());
  const index = chain.length - Number(hops);
  return index >= 0 ? validIp(chain[index]) : null;
}

/** True when the operator configured a trusted source for the client IP. */
export function clientIpConfigured(env: ClientIpEnv = process.env): boolean {
  return Boolean(env.CLIENT_IP_HEADER?.trim() || env.TRUSTED_PROXY_HOPS?.trim());
}

/** Expands an IPv6 address (no zone, no embedded IPv4) to 8 hextets. */
function ipv6Hextets(ip: string): string[] {
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = ip.includes("::") && tail ? tail.split(":") : [];
  const fill = Array<string>(8 - left.length - right.length).fill("0");
  return [...left, ...(ip.includes("::") ? fill : []), ...right].map((h) =>
    (h || "0").replace(/^0+(?=.)/, ""),
  );
}

/**
 * The rate-limit identity of an IP: IPv4 as is, IPv6 by its /64 prefix. One
 * host usually gets a whole /64, so per-address keys would let it rotate the
 * suffix and skip every per-IP limit.
 */
export function ipRateLimitBucket(ip: string): string {
  const address = ip.trim().toLowerCase().split("%")[0];
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (mapped) return mapped[1];
  if (isIP(address) !== 6) return address;
  return `${ipv6Hextets(address).slice(0, 4).join(":")}::/64`;
}

let warned = false;
/** Logs once per process when production has no trusted client IP source. */
export function warnIfClientIpUnconfigured(
  env: ClientIpEnv = process.env,
): void {
  if (warned || env.NODE_ENV !== "production") return;
  if (env.NEXT_PHASE === "phase-production-build") return;
  if (clientIpConfigured(env)) return;
  warned = true;
  console.warn(
    "[listae security] Neither CLIENT_IP_HEADER nor TRUSTED_PROXY_HOPS is set: " +
      "client IPs are unknown, so all anonymous searches share one rate-limit " +
      "bucket and login is only limited per email (ADR 014).",
  );
}
