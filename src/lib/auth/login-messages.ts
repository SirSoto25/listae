import type { Locale } from "@/lib/i18n/config";
import { syncTranslator } from "@/lib/i18n/sync-dictionary";

const ERROR_KEYS: Record<string, string> = {
  Verification: "auth.errorVerification",
  Configuration: "auth.errorConfiguration",
  AccessDenied: "auth.errorAccessDenied",
  Default: "auth.errorDefault",
};

export function loginErrorMessage(
  error?: string | string[],
  locale: Locale = "es",
): string | null {
  if (!error) {
    return null;
  }

  const code = Array.isArray(error) ? error[0] : error;
  const t = syncTranslator(locale);
  return t(ERROR_KEYS[code ?? ""] ?? ERROR_KEYS.Default);
}
