"use client";

import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import {
  LIBRARY_DOMAINS,
  type LibraryDomain,
  type ListStatus,
} from "@/types/domain";

export type LibraryDomainTabsLabels = {
  audiovisual: string;
  reading: string;
  all: string;
  aria: string;
};

const DOMAIN_LABEL_KEYS: Record<
  LibraryDomain,
  keyof LibraryDomainTabsLabels
> = {
  audiovisual: "audiovisual",
  reading: "reading",
  all: "all",
};

type LibraryDomainTabsProps = {
  locale: Locale;
  labels: LibraryDomainTabsLabels;
  domain: LibraryDomain;
  status: ListStatus | "all";
  sort: "updatedAt" | "score" | "title";
};

export function LibraryDomainTabs({
  locale,
  labels,
  domain,
  status,
  sort,
}: LibraryDomainTabsProps) {
  const router = useRouter();

  function selectDomain(next: LibraryDomain) {
    const params = new URLSearchParams({
      domain: next,
      type: "all",
      status,
      sort,
    });
    router.replace(`${localePath(locale, "/library")}?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label={labels.aria}
    >
      {LIBRARY_DOMAINS.map((value) => {
        const active = value === domain;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active
                ? "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                : "inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-bold text-foreground hover:border-accent hover:text-accent"
            }
            onClick={() => selectDomain(value)}
          >
            {labels[DOMAIN_LABEL_KEYS[value]]}
          </button>
        );
      })}
    </div>
  );
}
