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
import { ensureProfileTheme } from "@/lib/theme/store";

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
          console.log(`[listae magic link] ${identifier} -> ${url}`);
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

      if (target.origin !== baseUrl) {
        return baseUrl;
      }

      // Library already sends users without a username to /onboarding.
      return target.toString();
    },
  },
} satisfies NextAuthConfig;
