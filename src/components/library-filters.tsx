"use client";

import { useRouter } from "next/navigation";

import {
  LIST_STATUSES,
  WORK_TYPES,
  type ListStatus,
  type WorkType,
} from "@/types/domain";

type LibraryFiltersProps = {
  type: WorkType | "all";
  status: ListStatus | "all";
  sort: "updatedAt" | "score" | "title";
};

export function LibraryFilters({
  type,
  status,
  sort,
}: LibraryFiltersProps) {
  const router = useRouter();

  function update(name: string, value: string) {
    const params = new URLSearchParams({
      type,
      status,
      sort,
      [name]: value,
    });
    router.replace(`/library?${params.toString()}`);
  }

  const selectClass =
    "h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 outline-none focus:border-amber-600";

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-stone-500">
        Type
        <select
          className={selectClass}
          value={type}
          onChange={(event) => update("type", event.target.value)}
        >
          <option value="all">All types</option>
          {WORK_TYPES.map((workType) => (
            <option key={workType} value={workType}>
              {workType}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-stone-500">
        Status
        <select
          className={selectClass}
          value={status}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="all">All statuses</option>
          {LIST_STATUSES.map((listStatus) => (
            <option key={listStatus} value={listStatus}>
              {listStatus.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-stone-500">
        Sort
        <select
          className={selectClass}
          value={sort}
          onChange={(event) => update("sort", event.target.value)}
        >
          <option value="updatedAt">Recently updated</option>
          <option value="score">Highest score</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </div>
  );
}
