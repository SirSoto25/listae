"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { switchLocalePath } from "@/lib/i18n/path";

type LocaleSwitcherProps = {
  locale: Locale;
};

const LABELS: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const other: Locale = locale === "es" ? "en" : "es";

  return (
    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
      {(["es", "en"] as const).map((loc) => {
        const active = loc === locale;
        return active ? (
          <span key={loc} className="rounded px-2 py-1 text-accent">
            {LABELS[loc]}
          </span>
        ) : (
          <Link
            key={loc}
            className="rounded px-2 py-1 text-muted hover:text-accent"
            href={switchLocalePath(pathname, loc)}
          >
            {LABELS[loc]}
          </Link>
        );
      })}
    </div>
  );
}
