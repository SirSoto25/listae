export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
/** Last locale the visitor browsed in; wins over Accept-Language on redirects. */
export const LOCALE_COOKIE_NAME = "listae-locale";
/** Request header the middleware sets so the root layout can render `<html lang>`. */
export const LOCALE_HEADER_NAME = "x-listae-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}
