import { DEFAULT_LOCALE, type Locale, isLocale } from "./config";

export function resolveLocaleFromAcceptLanguage(
  header: string | null,
): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function resolveLocaleFromPathname(pathname: string): Locale | null {
  const match = /^\/(es|en)(?=\/|$)/.exec(pathname);
  return match && isLocale(match[1]) ? match[1] : null;
}
