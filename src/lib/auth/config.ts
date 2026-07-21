import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";

import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { ensureProfileTheme } from "@/lib/theme/store";

import { displayNameFromEmail } from "./validation";

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "Listae <noreply@localhost>",
      async sendVerificationRequest({ identifier, url }) {
        if (!process.env.EMAIL_SERVER) {
          console.log(`[listae magic link] ${identifier} -> ${url}`);
          return;
        }

        const { createTransport } = await import("nodemailer");
        const transport = createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? "Listae <noreply@localhost>",
          subject: "Sign in to Listae",
          text: `Sign in to Listae:\n${url}\n`,
        });
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id && user.email) {
        await db
          .update(users)
          .set({ displayName: displayNameFromEmail(user.email) })
          .where(eq(users.id, user.id));
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

      if (target.pathname === "/library") {
        return `${baseUrl}/onboarding`;
      }

      return target.toString();
    },
  },
} satisfies NextAuthConfig;
