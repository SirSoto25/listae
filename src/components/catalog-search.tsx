"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { WORK_TYPES, type WorkType } from "@/types/domain";

type CatalogSearchProps = {
  initialQuery: string;
  initialType: WorkType | "all";
};

export function CatalogSearch({
  initialQuery,
  initialType,
}: CatalogSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<WorkType | "all">(initialType);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (type !== "all") {
        params.set("type", type);
      }
      const suffix = params.toString();
      router.replace(suffix ? `/?${suffix}` : "/", { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, router, type]);

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
      <label className="group relative block">
        <span className="sr-only">Search titles</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-stone-400">
          ⌕
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-stone-300 bg-white pl-12 pr-4 text-base text-stone-950 shadow-sm outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a title, author, or series…"
          autoFocus
        />
      </label>
      <label>
        <span className="sr-only">Media type</span>
        <select
          className="h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 font-medium capitalize text-stone-800 shadow-sm outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
          value={type}
          onChange={(event) =>
            setType(event.target.value as WorkType | "all")
          }
        >
          <option value="all">All media</option>
          {WORK_TYPES.map((workType) => (
            <option key={workType} value={workType}>
              {workType}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
