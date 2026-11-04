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
import {
  NONCE_HEADER_NAME,
  buildCsp,
  cspHeaderName,
  cspRouteFor,
  generateNonce,
} from "@/lib/security/csp";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = generateNonce();
  const policy = buildCsp({
    nonce,
    route: cspRouteFor(pathname),
    dev: process.env.NODE_ENV === "development",
  });
  // Next reads the nonce from the request's CSP header and applies it to its
  // own scripts; the root layout reads x-nonce for the inline theme script.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER_NAME, nonce);
  requestHeaders.set("content-security-policy", policy);
  const withCsp = (response: NextResponse) => {
    response.headers.set(cspHeaderName(process.env.CSP_REPORT_ONLY), policy);
    return response;
  };

  // Profiles only get the CSP: they live outside the locale prefix (ADR 011).
  if (pathname.startsWith("/u/")) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (/^\/(es|en)(?=\/|$)/.test(pathname)) {
    const seg = pathname.slice(1, 3);
    if (!isLocale(seg)) {
      return withCsp(
        NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url)),
      );
    }
    requestHeaders.set(LOCALE_HEADER_NAME, seg);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== seg) {
      response.cookies.set(LOCALE_COOKIE_NAME, seg, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return withCsp(response);
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
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  // /u/ is matched too, for the CSP only (see the early return above).
  // Prefetches are not skipped: they also need the locale handling.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
