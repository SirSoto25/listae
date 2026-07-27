import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { stripLocalePrefix } from "@/lib/i18n/path";

export function resolveLocaleFromAuthUrl(url: string): Locale {
  try {
    const parsed = new URL(url);
    const callbackUrl = parsed.searchParams.get("callbackUrl");
    if (callbackUrl) {
      const pathname = callbackUrl.startsWith("http")
        ? new URL(callbackUrl).pathname
        : callbackUrl.split("?")[0] ?? callbackUrl;
      const { locale } = stripLocalePrefix(pathname);
      if (locale) {
        return locale;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_LOCALE;
}
