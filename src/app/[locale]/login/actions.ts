"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { isStrictEmail, normalizeEmail } from "@/lib/auth/validation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";

/**
 * Login form action: only normalizes and validates the address. The one
 * magic-link rate limit lives in `callbacks.signIn` (src/lib/auth/config.ts),
 * which also covers direct POSTs to the Auth.js endpoint (ADR 016).
 */
export async function requestMagicLink(
  rawLocale: string,
  formData: FormData,
): Promise<void> {
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const raw = formData.get("email");
  const email = normalizeEmail(typeof raw === "string" ? raw : "");
  if (!isStrictEmail(email)) {
    redirect(localePath(locale, "/login?error=EmailInvalid"));
  }

  await signIn("nodemailer", {
    email,
    redirectTo: localePath(locale, "/library"),
  });
}
