"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { isStrictEmail, normalizeEmail } from "@/lib/auth/validation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { safeReturnPath } from "@/lib/safe-return-path";

/** Login URL for an error that keeps where the visitor was heading. */
function loginErrorPath(
  locale: Locale,
  error: string,
  returnPath: string,
  libraryPath: string,
): string {
  const params = new URLSearchParams({ error });
  if (returnPath !== libraryPath) params.set("callbackUrl", returnPath);
  return `${localePath(locale, "/login")}?${params.toString()}`;
}

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
  // Where to land after the magic link: only known application paths, and the
  // library when nothing (or something else) was asked for.
  const libraryPath = localePath(locale, "/library");
  const callbackUrl = formData.get("callbackUrl");
  const returnPath = safeReturnPath(
    typeof callbackUrl === "string" ? callbackUrl : undefined,
    libraryPath,
  );
  if (!isStrictEmail(email)) {
    redirect(loginErrorPath(locale, "EmailInvalid", returnPath, libraryPath));
  }

  await signIn("nodemailer", { email, redirectTo: returnPath });
}
