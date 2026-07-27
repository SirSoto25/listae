"use client";

import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import {
  LIST_STATUSES,
  workTypesForDomain,
  type LibraryDomain,
  type ListStatus,
  type WorkType,
} from "@/types/domain";

export type LibraryFiltersLabels = {
  type: string;
  allTypes: string;
  status: string;
  allStatuses: string;
  sort: string;
  sortUpdated: string;
  sortScore: string;
  sortTitle: string;
  statusPlan: string;
  statusInProgress: string;
  statusCompleted: string;
  statusOnHold: string;
  statusDropped: string;
};

const STATUS_LABEL_KEYS: Record<ListStatus, keyof LibraryFiltersLabels> = {
  plan: "statusPlan",
  in_progress: "statusInProgress",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  dropped: "statusDropped",
};

type LibraryFiltersProps = {
  locale: Locale;
  labels: LibraryFiltersLabels;
  domain: LibraryDomain;
  type: WorkType | "all";
  status: ListStatus | "all";
  sort: "updatedAt" | "score" | "title";
};

export function LibraryFilters({
  locale,
  labels,
  domain,
  type,
  status,
  sort,
}: LibraryFiltersProps) {
  const router = useRouter();
  const typeOptions = workTypesForDomain(domain);

  function update(name: string, value: string) {
    const params = new URLSearchParams({
      domain,
      type,
      status,
      sort,
      [name]: value,
    });
    router.replace(`${localePath(locale, "/library")}?${params.toString()}`);
  }

  const selectClass =
    "h-11 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20";

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-background p-3">
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">
        {labels.type}
        <select
          className={selectClass}
          value={type}
          onChange={(event) => update("type", event.target.value)}
        >
          <option value="all">{labels.allTypes}</option>
          {typeOptions.map((workType) => (
            <option key={workType} value={workType}>
              {workType}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">
        {labels.status}
        <select
          className={selectClass}
          value={status}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="all">{labels.allStatuses}</option>
          {LIST_STATUSES.map((listStatus) => (
            <option key={listStatus} value={listStatus}>
              {labels[STATUS_LABEL_KEYS[listStatus]]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">
        {labels.sort}
        <select
          className={selectClass}
          value={sort}
          onChange={(event) => update("sort", event.target.value)}
        >
          <option value="updatedAt">{labels.sortUpdated}</option>
          <option value="score">{labels.sortScore}</option>
          <option value="title">{labels.sortTitle}</option>
        </select>
      </label>
    </div>
  );
}
