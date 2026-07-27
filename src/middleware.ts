import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/resolve-locale";

const APP_ROOT_PATHS = new Set(["/", "/library", "/login", "/onboarding"]);

export function isAppRoute(pathname: string): boolean {
  if (APP_ROOT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/login/")) return true;
  if (/^\/title\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/^\/(es|en)(?=\/|$)/.test(pathname)) {
    const seg = pathname.slice(1, 3);
    if (!isLocale(seg)) {
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
    }
    return NextResponse.next();
  }

  if (isAppRoute(pathname)) {
    const locale = resolveLocaleFromAcceptLanguage(
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
