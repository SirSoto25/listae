import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  isLocale,
} from "@/lib/i18n/config";
import {
  THEME_COOKIE_NAME,
  parseThemePreference,
  resolveTheme,
  themeClassName,
} from "@/lib/theme-preference";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Language-neutral fallback for routes outside /[locale] (profile pages, error
// pages). The localized title and description live in the [locale] layout's
// generateMetadata, which overrides these values for everything beneath it.
export const metadata: Metadata = {
  title: { default: "Listae", template: "%s · Listae" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const preference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );
  const headerStore = await headers();
  const systemPrefersDark =
    headerStore.get("sec-ch-prefers-color-scheme")?.includes("dark") ?? false;
  // When Client Hints unavailable, system defaults to light on SSR and
  // the inline script below corrects before paint if cookie is system.
  const resolved = resolveTheme(preference, systemPrefersDark);
  const darkClass = themeClassName(resolved);
  const localeHint =
    headerStore.get(LOCALE_HEADER_NAME) ??
    cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const lang = isLocale(localeHint) ? localeHint : DEFAULT_LOCALE;

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${darkClass} h-full antialiased`}
    >
      <head>
        {preference === "system" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(()=>{try{var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
            }}
          />
        ) : null}
      </head>
      <body className="app-atmosphere flex min-h-full flex-col">{children}</body>
    </html>
  );
}
