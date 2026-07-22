"use client";

import { useState } from "react";

import { addToList, updateEntry } from "@/app/actions/entries";
import {
  LIST_STATUSES,
  type ListStatus,
  type ProgressUnit,
  type WorkType,
} from "@/types/domain";

type EntryFormProps = {
  workId: string;
  workType: WorkType;
  episodesTotal?: number | null;
  chaptersTotal?: number | null;
  pagesTotal?: number | null;
  entry?: {
    status: ListStatus;
    score: number | null;
    progressValue: number;
    progressUnit: ProgressUnit | null;
    notes?: string | null;
  } | null;
  compact?: boolean;
  returnPath?: string;
};

const statusLabels: Record<ListStatus, string> = {
  plan: "Plan",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
};

export function EntryForm({
  workId,
  workType,
  episodesTotal,
  chaptersTotal,
  pagesTotal,
  entry,
  compact = false,
  returnPath,
}: EntryFormProps) {
  const isReading = ["book", "manga", "comic"].includes(workType);
  const hasProgress = workType !== "movie";
  const action = entry ? updateEntry : addToList;
  const [progressUnit, setProgressUnit] = useState<"chapters" | "pages">(
    entry?.progressUnit === "pages" ? "pages" : "chapters",
  );
  const progressMax = isReading
    ? progressUnit === "pages"
      ? pagesTotal
      : chaptersTotal
    : episodesTotal;

  return (
    <form
      action={action}
      className={
        compact
          ? "grid gap-3 sm:grid-cols-3 lg:grid-cols-[1.2fr_.8fr_1fr_auto]"
          : "space-y-5"
      }
    >
      <input type="hidden" name="workId" value={workId} />
      {returnPath && (
        <input type="hidden" name="returnPath" value={returnPath} />
      )}
      {compact && (
        <input type="hidden" name="notes" value={entry?.notes ?? ""} />
      )}

      <label className="block text-sm font-semibold text-muted">
        Status
        <select
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          name="status"
          defaultValue={entry?.status ?? "plan"}
        >
          {LIST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-muted">
        Score
        <input
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          type="number"
          name="score"
          min={1}
          max={10}
          step={1}
          defaultValue={entry?.score ?? ""}
          placeholder="— / 10"
        />
      </label>

      {hasProgress && (
        <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
          <label className="block text-sm font-semibold text-muted">
            Progress
            <input
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
              type="number"
              name="progressValue"
              min={0}
              step={1}
              max={progressMax ?? undefined}
              defaultValue={entry?.progressValue ?? 0}
            />
          </label>
          {isReading ? (
            <label className="block text-sm font-semibold text-muted">
              Unit
              <select
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-2 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
                name="progressUnit"
                value={progressUnit}
                onChange={(event) =>
                  setProgressUnit(event.target.value as "chapters" | "pages")
                }
              >
                <option value="chapters">Chapters</option>
                <option value="pages">Pages</option>
              </select>
            </label>
          ) : (
            <div className="pt-8 text-sm text-muted">
              {episodesTotal
                ? `/ ${episodesTotal} episodes`
                : "episodes"}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <label className="block text-sm font-semibold text-muted">
          Notes
          <textarea
            className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
            name="notes"
            maxLength={500}
            defaultValue={entry?.notes ?? ""}
            placeholder="A short note for yourself"
          />
        </label>
      )}

      <button
        className={`self-end rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:opacity-90 ${
          compact ? "h-11" : "h-12 w-full"
        }`}
        type="submit"
      >
        {entry ? "Save" : "Add to library"}
      </button>
    </form>
  );
}
