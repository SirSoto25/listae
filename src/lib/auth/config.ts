import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";

import { resolveLocaleFromAuthUrl } from "@/lib/auth/locale-from-url";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { createTranslator } from "@/lib/i18n/t";
import { safeReturnPath } from "@/lib/safe-return-path";
import { ensureProfileTheme } from "@/lib/theme/store";

const authSecret = process.env.AUTH_SECRET?.trim();
if (!authSecret) {
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
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "Listae <noreply@localhost>",
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
          from: process.env.EMAIL_FROM ?? "Listae <noreply@localhost>",
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
        return true;
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
