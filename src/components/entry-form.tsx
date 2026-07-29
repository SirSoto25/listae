"use client";

import { useState } from "react";

import { addToList, updateEntry } from "@/app/actions/entries";
import type { Locale } from "@/lib/i18n/config";
import {
  LIST_STATUSES,
  type ListStatus,
  type ProgressUnit,
  type WorkType,
} from "@/types/domain";

export type EntryFormLabels = {
  status: string;
  score: string;
  scorePlaceholder: string;
  progress: string;
  unit: string;
  chapters: string;
  pages: string;
  episodesSuffix: string;
  episodes: string;
  notes: string;
  notesPlaceholder: string;
  save: string;
  addToLibrary: string;
  statusPlan: string;
  statusInProgress: string;
  statusCompleted: string;
  statusOnHold: string;
  statusDropped: string;
};

type EntryFormProps = {
  locale: Locale;
  labels: EntryFormLabels;
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

const STATUS_KEYS: Record<ListStatus, keyof EntryFormLabels> = {
  plan: "statusPlan",
  in_progress: "statusInProgress",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  dropped: "statusDropped",
};

export function EntryForm({
  locale,
  labels,
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
      <input type="hidden" name="locale" value={locale} />
      {returnPath && (
        <input type="hidden" name="returnPath" value={returnPath} />
      )}
      {compact && (
        <input type="hidden" name="notes" value={entry?.notes ?? ""} />
      )}

      <label className="block text-sm font-semibold text-muted">
        {labels.status}
        <select
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          name="status"
          defaultValue={entry?.status ?? "plan"}
        >
          {LIST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels[STATUS_KEYS[status]]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-muted">
        {labels.score}
        <input
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          type="number"
          name="score"
          min={1}
          max={10}
          step={1}
          defaultValue={entry?.score ?? ""}
          placeholder={labels.scorePlaceholder}
        />
      </label>

      {hasProgress && (
        <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
          <label className="block text-sm font-semibold text-muted">
            {labels.progress}
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
              {labels.unit}
              <select
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-2 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
                name="progressUnit"
                value={progressUnit}
                onChange={(event) =>
                  setProgressUnit(event.target.value as "chapters" | "pages")
                }
              >
                <option value="chapters">{labels.chapters}</option>
                <option value="pages">{labels.pages}</option>
              </select>
            </label>
          ) : (
            <div className="pt-8 text-sm text-muted">
              {episodesTotal
                ? labels.episodesSuffix.replace("{total}", String(episodesTotal))
                : labels.episodes}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <label className="block text-sm font-semibold text-muted">
          {labels.notes}
          <textarea
            className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 font-normal text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
            name="notes"
            maxLength={500}
            defaultValue={entry?.notes ?? ""}
            placeholder={labels.notesPlaceholder}
          />
        </label>
      )}

      <button
        className={`self-end rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:opacity-90 ${
          compact ? "h-11" : "h-12 w-full"
        }`}
        type="submit"
      >
        {entry ? labels.save : labels.addToLibrary}
      </button>
    </form>
  );
}
