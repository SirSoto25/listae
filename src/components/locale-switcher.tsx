"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { switchLocalePath } from "@/lib/i18n/path";

type LocaleSwitcherProps = {
  locale: Locale;
};

const LABELS: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

const LANGUAGE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  return (
    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
      {(["es", "en"] as const).map((loc) => {
        const active = loc === locale;
        return active ? (
          <span
            key={loc}
            aria-current="true"
            className="rounded px-2 py-1 text-accent underline underline-offset-4"
            lang={loc}
            title={LANGUAGE_NAMES[loc]}
          >
            {LABELS[loc]}
          </span>
        ) : (
          // Plain <a>: a full load re-renders the root layout's <html lang>.
          <a
            key={loc}
            aria-label={LANGUAGE_NAMES[loc]}
            className="rounded px-2 py-1 text-muted hover:text-accent"
            href={`${switchLocalePath(pathname, loc)}${query ? `?${query}` : ""}`}
            hrefLang={loc}
            lang={loc}
          >
            {LABELS[loc]}
          </a>
        );
      })}
    </div>
  );
}
