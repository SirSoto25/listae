import { DEFAULT_LOCALE, type Locale, isLocale } from "./config";

export function stripLocalePrefix(pathname: string): {
  locale: Locale | null;
  pathname: string;
} {
  const match = /^\/(es|en)(?=\/|$)(.*)$/.exec(pathname);
  if (!match || !isLocale(match[1])) {
    return { locale: null, pathname };
  }
  const rest = match[2] || "/";
  return { locale: match[1], pathname: rest.startsWith("/") ? rest : `/${rest}` };
}

export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function switchLocalePath(pathname: string, newLocale: Locale): string {
  const search = pathname.includes("?")
    ? pathname.slice(pathname.indexOf("?"))
    : "";
  const pathOnly = search ? pathname.slice(0, pathname.indexOf("?")) : pathname;
  const { pathname: bare, locale } = stripLocalePrefix(pathOnly);
  const current = locale ?? DEFAULT_LOCALE;
  if (current === newLocale) return pathname;
  return `${localePath(newLocale, bare)}${search}`;
}
