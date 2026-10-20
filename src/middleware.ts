import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/resolve-locale";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const APP_ROOT_PATHS = new Set(["/", "/library", "/login", "/onboarding"]);

export function isAppRoute(pathname: string): boolean {
  if (APP_ROOT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/login/")) return true;
  if (/^\/title\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function preferredLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  return isLocale(cookieValue)
    ? cookieValue
    : resolveLocaleFromAcceptLanguage(acceptLanguage);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/^\/(es|en)(?=\/|$)/.test(pathname)) {
    const seg = pathname.slice(1, 3);
    if (!isLocale(seg)) {
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER_NAME, seg);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== seg) {
      response.cookies.set(LOCALE_COOKIE_NAME, seg, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return response;
  }

  if (isAppRoute(pathname)) {
    // Server actions and Auth.js redirect to bare paths (/library,
    // /login/verify); keep the visitor in the locale they were browsing.
    const locale = preferredLocale(
      request.cookies.get(LOCALE_COOKIE_NAME)?.value,
      request.headers.get("accept-language"),
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|u/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
