/**
 * Content-Security-Policy builder (ADR 013).
 *
 * Two policies share a strict, nonce-based script policy:
 * - `app`: every page except public profiles.
 * - `profile` (`/u/*`): the theme iframe is `srcdoc`, and a `srcdoc` document
 *   inherits its parent's CSP, so this policy must also allow what user
 *   themes may load (Google Fonts CSS and font files, HTTPS images). User
 *   scripts stay impossible twice over: the iframe sandbox has no
 *   `allow-scripts`, and `script-src` only admits the per-request nonce.
 */

export type CspRoute = "app" | "profile";

export const NONCE_HEADER_NAME = "x-nonce";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

export function buildCsp({
  nonce,
  route,
  dev,
}: {
  nonce: string;
  route: CspRoute;
  dev: boolean;
}): string {
  const profile = route === "profile";
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(dev ? ["'unsafe-eval'"] : []),
      ],
    ],
    // No nonce here on purpose: a nonce would make browsers ignore
    // 'unsafe-inline', and theme <style> blocks and React style props need it.
    [
      "style-src",
      ["'self'", "'unsafe-inline'", ...(profile ? [GOOGLE_FONTS_CSS] : [])],
    ],
    ["img-src", ["'self'", "https:", "data:"]],
    ["font-src", ["'self'", ...(profile ? [GOOGLE_FONTS_FILES] : [])]],
    ["connect-src", ["'self'", ...(dev ? ["ws:"] : [])]],
    ["frame-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  return directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function cspRouteFor(pathname: string): CspRoute {
  return pathname.startsWith("/u/") ? "profile" : "app";
}

/** `CSP_REPORT_ONLY=1` is the quick rollback: report violations, block nothing. */
export function cspHeaderName(reportOnly: string | undefined): string {
  return reportOnly === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
