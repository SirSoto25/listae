/**
 * Auth environment checks (ADR 016). Run once at server start-up from
 * `src/instrumentation.ts`, never at import time: `next build` runs with
 * `NODE_ENV=production` and a throwaway secret, and must keep working.
 *
 * Always an error:
 * - `AUTH_SECRET` missing.
 * - `AUTH_TRUST_HOST` without `AUTH_URL`: Auth.js would build magic links
 *   from the request's `Host` / `X-Forwarded-Host`, which a client controls.
 * - `AUTH_URL` that is not an absolute http(s) URL.
 *
 * Errors in production, warnings elsewhere (so a copied `.env.example` still
 * runs `next dev`):
 * - `AUTH_SECRET` equal to the `.env.example` placeholder, or with less than
 *   32 bytes of estimated entropy.
 *
 * Production only:
 * - `AUTH_URL` missing or not `https://`.
 * - `EMAIL_SERVER` missing (magic links would never be delivered).
 */

export const AUTH_SECRET_PLACEHOLDER = "generate-with-openssl-rand-base64-32";

const MIN_SECRET_BYTES = 32;
/** Below this many distinct characters a secret is clearly not random. */
const MIN_DISTINCT_CHARS = 12;

export type AuthEnv = {
  NODE_ENV?: string;
  AUTH_SECRET?: string;
  AUTH_URL?: string;
  AUTH_TRUST_HOST?: string;
  EMAIL_SERVER?: string;
  [name: string]: string | undefined;
};

export type AuthEnvResult = { secret: string; warnings: string[] };

/**
 * Upper bound of the random bytes behind a secret, from its alphabet: hex
 * carries 4 bits per character, base64/base64url 6, anything else 8.
 */
export function estimatedSecretBytes(secret: string): number {
  if (new Set(secret).size < MIN_DISTINCT_CHARS) return 0;
  if (/^[0-9a-f]+$/i.test(secret)) return Math.floor(secret.length / 2);
  const unpadded = secret.replace(/=+$/, "");
  if (/^[A-Za-z0-9+/_-]+$/.test(unpadded)) {
    return Math.floor((unpadded.length * 6) / 8);
  }
  return Buffer.byteLength(secret, "utf8");
}

function secretProblem(secret: string): string | null {
  if (secret === AUTH_SECRET_PLACEHOLDER) {
    return "AUTH_SECRET is still the .env.example placeholder. Generate one with `openssl rand -base64 32`.";
  }
  if (estimatedSecretBytes(secret) < MIN_SECRET_BYTES) {
    return `AUTH_SECRET must carry at least ${MIN_SECRET_BYTES} bytes of entropy (e.g. \`openssl rand -base64 32\`).`;
  }
  return null;
}

function truthy(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return Boolean(v) && v !== "false" && v !== "0";
}

export function validateAuthEnv(env: AuthEnv): AuthEnvResult {
  const production = env.NODE_ENV === "production";
  const warnings: string[] = [];

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is required.");

  const weakSecret = secretProblem(secret);
  if (weakSecret) {
    if (production) throw new Error(weakSecret);
    warnings.push(`${weakSecret} Allowed outside production only.`);
  }

  const rawUrl = env.AUTH_URL?.trim();
  if (!rawUrl && truthy(env.AUTH_TRUST_HOST)) {
    throw new Error(
      "AUTH_TRUST_HOST requires AUTH_URL: without it, sign-in links are built from the request Host header.",
    );
  }

  if (rawUrl) {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error(`AUTH_URL must be an absolute URL (got ${JSON.stringify(rawUrl)}).`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("AUTH_URL must be an http(s) URL.");
    }
    if (url.username || url.password) {
      throw new Error("AUTH_URL must not contain credentials.");
    }
    if (production && url.protocol !== "https:") {
      throw new Error("AUTH_URL must use https:// in production.");
    }
  } else if (production) {
    throw new Error(
      "AUTH_URL is required in production (the public https:// origin of the app).",
    );
  }

  if (production && !env.EMAIL_SERVER?.trim()) {
    throw new Error(
      "EMAIL_SERVER is required in production: without it, magic links are never delivered.",
    );
  }

  return { secret, warnings };
}

let checked = false;
/** Validates `process.env` once per process and logs the warnings. */
export function assertAuthEnv(env: AuthEnv = process.env): void {
  if (checked) return;
  const { warnings } = validateAuthEnv(env);
  for (const warning of warnings) console.warn(`[listae auth] ${warning}`);
  checked = true;
}

/**
 * Start-up guard for `src/instrumentation.ts` (Node.js runtime only). A
 * failing instrumentation hook is only logged by `next start`, which keeps
 * serving, so in production the process exits instead.
 */
export function assertAuthEnvOrExit(env: AuthEnv = process.env): void {
  try {
    assertAuthEnv(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[listae auth] Refusing to start: ${message}`);
    if (env.NODE_ENV === "production") process.exit(1);
    throw error;
  }
}
