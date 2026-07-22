import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
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

export const metadata: Metadata = {
  title: "Listae — Track what you watch and read",
  description: "A personal library for films, series, anime, books, and comics.",
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

  return (
    <html
      lang="en"
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
      <body className="app-atmosphere flex min-h-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
