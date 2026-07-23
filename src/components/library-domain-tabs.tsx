"use client";

import { useRouter } from "next/navigation";

import {
  LIBRARY_DOMAINS,
  type LibraryDomain,
  type ListStatus,
} from "@/types/domain";

const DOMAIN_LABELS: Record<LibraryDomain, string> = {
  audiovisual: "Audiovisual",
  reading: "Reading",
  all: "All",
};

type LibraryDomainTabsProps = {
  domain: LibraryDomain;
  status: ListStatus | "all";
  sort: "updatedAt" | "score" | "title";
};

export function LibraryDomainTabs({
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
    router.replace(`/library?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Library domain"
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
            {DOMAIN_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
