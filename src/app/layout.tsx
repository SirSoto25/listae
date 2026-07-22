import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-stone-200 bg-[#f7f5f0] px-6">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between">
            <Link
              className="text-xl font-black tracking-[-0.05em] text-stone-950"
              href="/"
            >
              listae<span className="text-amber-700">.</span>
            </Link>
            <div className="flex items-center gap-5 text-sm font-bold text-stone-600">
              <Link className="hover:text-amber-700" href="/">
                Search
              </Link>
              <Link className="hover:text-amber-700" href="/library">
                Library
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
