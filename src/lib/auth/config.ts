import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { headers } from "next/headers";

import { resolveLocaleFromAuthUrl } from "@/lib/auth/locale-from-url";
import { isStrictEmail, normalizeEmail } from "@/lib/auth/validation";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { createTranslator } from "@/lib/i18n/t";
import { safeReturnPath } from "@/lib/safe-return-path";
import {
  clientIpFromHeaders,
  ipRateLimitBucket,
} from "@/lib/security/client-ip";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ensureProfileTheme } from "@/lib/theme/store";

/** Magic links expire after 15 minutes (decision D11, ADR 016). */
export const MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60;

const MAGIC_LINK_EMAIL_LIMIT = { limit: 5, windowMs: 3_600_000 };
const MAGIC_LINK_IP_LIMIT = { limit: 20, windowMs: 3_600_000 };

/**
 * The one magic-link budget per mailbox: NFKC + lowercase, and `user+tag`
 * aliases collapsed so they share it.
 */
export function magicLinkRateLimitKey(identifier: string): string {
  const email = normalizeEmail(identifier);
  const at = email.lastIndexOf("@");
  if (at <= 0) return `magic-link:email:${email}`;
  const local = email.slice(0, at).split("+")[0];
  return `magic-link:email:${local}${email.slice(at)}`;
}

/**
 * Auth.js identifier normalizer, so it also covers direct POSTs to
 * `/api/auth/signin/nodemailer`. Throwing here stops the request before a
 * verification token is generated or stored.
 */
function normalizeMagicLinkIdentifier(identifier: string): string {
  const email = normalizeEmail(identifier ?? "");
  if (!isStrictEmail(email)) throw new Error("Invalid email address.");
  return email;
}

/** Request headers, or empty ones outside a request scope. */
async function currentRequestHeaders(): Promise<Headers> {
  try {
    return new Headers(await headers());
  } catch {
    return new Headers();
  }
}

function localeFromHeaders(requestHeaders: Headers): Locale {
  const fromProxy = requestHeaders.get(LOCALE_HEADER_NAME);
  if (isLocale(fromProxy)) return fromProxy;
  for (const part of (requestHeaders.get("cookie") ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === LOCALE_COOKIE_NAME && isLocale(value)) return value;
  }
  return DEFAULT_LOCALE;
}

/**
 * The single magic-link rate limit (ADR 014, ADR 016). It runs in
 * `callbacks.signIn`, which Auth.js calls before it creates the token, so a
 * refused request never leaves a `verification_tokens` row behind. Per IP
 * first (only when the IP is trusted), so a flood from one address does not
 * also burn its victims' per-email budgets; then per email.
 */
async function magicLinkAllowed(email: string): Promise<string | true> {
  const requestHeaders = await currentRequestHeaders();
  const refused = `/${localeFromHeaders(requestHeaders)}/login?error=RateLimited`;

  const ip = clientIpFromHeaders(requestHeaders);
  if (
    ip &&
    !checkRateLimit(`magic-link:ip:${ipRateLimitBucket(ip)}`, MAGIC_LINK_IP_LIMIT)
      .ok
  ) {
    return refused;
  }
  if (!checkRateLimit(magicLinkRateLimitKey(email), MAGIC_LINK_EMAIL_LIMIT).ok) {
    return refused;
  }
  return true;
}

const authSecret = process.env.AUTH_SECRET?.trim();
if (!authSecret) {
  // Its strength and the rest of the auth env are checked at start-up
  // (src/instrumentation.ts → validateAuthEnv): `next build` has no real secret.
  throw new Error("AUTH_SECRET is required");
}

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  },
  providers: [
    Nodemailer({
      // Only satisfies the provider's type/config; the real send happens in
      // sendVerificationRequest below.
      server: process.env.EMAIL_SERVER || "smtp://localhost:1025",
      from: process.env.EMAIL_FROM || "Listae <noreply@localhost>",
      maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
      normalizeIdentifier: normalizeMagicLinkIdentifier,
      // Rate limiting happens in callbacks.signIn, before the token exists.
      async sendVerificationRequest({ identifier, url }) {
        const locale = resolveLocaleFromAuthUrl(url);
        const dict = await getDictionary(locale);
        const t = createTranslator(dict);

        if (!process.env.EMAIL_SERVER) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[listae magic link] ${identifier} -> ${url}`);
          } else {
            console.warn(
              `[listae magic link] EMAIL_SERVER unset; link not sent for ${identifier}`,
            );
          }
          return;
        }

        const { createTransport } = await import("nodemailer");
        const transport = createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM || "Listae <noreply@localhost>",
          subject: t("auth.magicLinkSubject"),
          text: t("auth.magicLinkBody", { url }),
        });
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureProfileTheme(user.id);
      }
    },
  },
  callbacks: {
    async signIn({ user, email }) {
      if (email?.verificationRequest) {
        return user.email ? magicLinkAllowed(user.email) : false;
      }

      return Boolean(user.email);
    },
    async redirect({ url, baseUrl }) {
      const target = new URL(url, baseUrl);
      const base = new URL(baseUrl);

      if (target.origin !== base.origin) {
        return baseUrl;
      }

      const safePath = safeReturnPath(`${target.pathname}${target.search}`, "");
      if (!safePath) {
        return baseUrl;
      }

      return new URL(safePath, baseUrl).toString();
    },
  },
} satisfies NextAuthConfig;
