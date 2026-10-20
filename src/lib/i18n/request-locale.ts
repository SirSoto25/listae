import "server-only";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  isLocale,
  type Locale,
} from "./config";

/**
 * Locale of the current request, for server components that receive no route
 * params (`not-found.tsx`, `loading.tsx`). Resolved exactly like `<html lang>`
 * in the root layout: the header the middleware sets for /es and /en paths,
 * then the last-browsed-locale cookie, then the default.
 */
export async function requestLocale(): Promise<Locale> {
  const hint =
    (await headers()).get(LOCALE_HEADER_NAME) ??
    (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(hint) ? hint : DEFAULT_LOCALE;
}
