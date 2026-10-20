import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { listEntries, works } from "@/lib/db/schema";
import { FormInputError } from "@/lib/form-error";
import type { Locale } from "@/lib/i18n/config";
import { syncTranslator } from "@/lib/i18n/sync-dictionary";
import { workTitle } from "@/lib/i18n/work-text";
import type { ProfileEntry } from "@/lib/theme/placeholders";
import {
  LIST_STATUSES,
  parseLibraryDomain,
  workTypesForDomain,
  type LibraryDomain,
  type ListStatus,
  type ProgressUnit,
  type WorkType,
} from "@/types/domain";

export function parseScore(raw: unknown): number | null {
  if (raw === "" || raw === null || raw === undefined) {
    return null;
  }

  const score = Number(raw);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new FormInputError("invalidScore", "score must be 1-10");
  }

  return score;
}

export type EntryInput = {
  status: unknown;
  score?: unknown;
  progressValue?: unknown;
  progressUnit?: unknown;
  notes?: unknown;
};

type ProgressTotals = {
  episodesTotal?: number | null;
  chaptersTotal?: number | null;
  pagesTotal?: number | null;
};

export type NormalizedEntryInput = {
  status: ListStatus;
  score: number | null;
  progressValue: number;
  progressUnit: ProgressUnit | null;
  notes: string | null;
};

export type LibraryFilters = {
  domain?: LibraryDomain;
  type?: WorkType | "all";
  status?: ListStatus | "all";
  sort?: "updatedAt" | "score" | "title";
};

const MAX_PROGRESS = 100_000;

function parseProgress(raw: unknown): number {
  if (raw === "" || raw === null || raw === undefined) {
    return 0;
  }

  const progress = Number(raw);
  if (!Number.isSafeInteger(progress) || progress < 0 || progress > MAX_PROGRESS) {
    throw new FormInputError(
      "invalidProgress",
      `progress must be an integer between 0 and ${MAX_PROGRESS}`,
      { max: MAX_PROGRESS },
    );
  }

  return progress;
}

/** Catalogs report 0 for unknown/unannounced totals; never cap on those. */
function knownTotal(total: number | null | undefined): number | null {
  return total && total > 0 ? total : null;
}

export function normalizeEntryInput(
  workType: WorkType,
  input: EntryInput,
  totals: ProgressTotals = {},
): NormalizedEntryInput {
  if (
    typeof input.status !== "string" ||
    !LIST_STATUSES.includes(input.status as ListStatus)
  ) {
    throw new FormInputError("invalidStatus", "invalid list status");
  }

  const notesRaw = String(input.notes ?? "").trim();
  if (notesRaw.length > 500) {
    throw new FormInputError("notesTooLong", "notes must be at most 500 characters", {
      max: 500,
    });
  }

  const base = {
    status: input.status as ListStatus,
    score: parseScore(input.score),
    notes: notesRaw || null,
  };

  if (workType === "movie") {
    return {
      ...base,
      progressValue: 0,
      progressUnit: null,
    };
  }

  const progressValue = parseProgress(input.progressValue);
  if (workType === "anime" || workType === "series") {
    const episodesTotal = knownTotal(totals.episodesTotal);
    if (episodesTotal !== null && progressValue > episodesTotal) {
      throw new FormInputError(
        "progressExceedsEpisodes",
        `progress cannot exceed ${episodesTotal} episodes`,
        { total: episodesTotal },
      );
    }
    return {
      ...base,
      progressValue,
      progressUnit: "episodes",
    };
  }

  if (input.progressUnit !== "chapters" && input.progressUnit !== "pages") {
    throw new FormInputError(
      "invalidProgressUnit",
      "progress unit must be chapters or pages",
    );
  }
  const total = knownTotal(
    input.progressUnit === "chapters"
      ? totals.chaptersTotal
      : totals.pagesTotal,
  );
  if (total !== null && progressValue > total) {
    throw new FormInputError(
      input.progressUnit === "chapters"
        ? "progressExceedsChapters"
        : "progressExceedsPages",
      `progress cannot exceed ${total} ${input.progressUnit}`,
      { total },
    );
  }

  return {
    ...base,
    progressValue,
    progressUnit: input.progressUnit,
  };
}

export async function getEntry(userId: string, workId: string) {
  return db.query.listEntries.findFirst({
    where: and(eq(listEntries.userId, userId), eq(listEntries.workId, workId)),
  });
}

export async function addListEntry(
  userId: string,
  workId: string,
  input: EntryInput,
) {
  const work = await db.query.works.findFirst({
    where: eq(works.id, workId),
  });
  if (!work) {
    throw new Error("work not found");
  }

  const values = normalizeEntryInput(work.type, input, {
    episodesTotal: work.episodesTotal,
    chaptersTotal: work.chaptersTotal,
    pagesTotal: work.pagesTotal,
  });
  const now = new Date();
  const id = randomUUID();
  await db
    .insert(listEntries)
    .values({ id, userId, workId, ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: [listEntries.userId, listEntries.workId],
      set: { ...values, updatedAt: now },
    });

  return getEntry(userId, workId);
}

export async function updateListEntry(
  userId: string,
  workId: string,
  input: EntryInput,
) {
  const existing = await getEntry(userId, workId);
  if (!existing) {
    throw new Error("list entry not found");
  }

  return addListEntry(userId, workId, input);
}

export async function listLibraryEntries(
  userId: string,
  filters: LibraryFilters = {},
) {
  const conditions = [eq(listEntries.userId, userId)];
  const domain = parseLibraryDomain(filters.domain ?? "all");
  const allowed = workTypesForDomain(domain);
  const type =
    filters.type &&
    filters.type !== "all" &&
    (allowed as readonly string[]).includes(filters.type)
      ? filters.type
      : "all";

  if (type !== "all") {
    conditions.push(eq(works.type, type));
  } else if (domain !== "all") {
    conditions.push(inArray(works.type, [...allowed]));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(listEntries.status, filters.status));
  }

  const sort =
    filters.sort === "title"
      ? asc(works.title)
      : filters.sort === "score"
        ? desc(listEntries.score)
        : desc(listEntries.updatedAt);

  return db
    .select({ entry: listEntries, work: works })
    .from(listEntries)
    .innerJoin(works, eq(listEntries.workId, works.id))
    .where(and(...conditions))
    .orderBy(sort);
}
export function rowsToProfileEntries(
  rows: Awaited<ReturnType<typeof listLibraryEntries>>,
  locale: Locale,
): ProfileEntry[] {
  const t = syncTranslator(locale);

  return rows.map(({ entry, work }) => {
    const total =
      work.type === "anime" || work.type === "series"
        ? work.episodesTotal
        : entry.progressUnit === "chapters"
          ? work.chaptersTotal
          : entry.progressUnit === "pages"
            ? work.pagesTotal
            : null;
    const progress =
      work.type === "movie"
        ? t("profile.noProgressTracking")
        : `${entry.progressValue}${total ? ` / ${total}` : ""} ${entry.progressUnit ?? "items"}`;

    return {
      title: workTitle(work, locale),
      type: work.type,
      status: entry.status,
      score: entry.score,
      progress,
      cover: work.coverUrl,
      url: `/title/${work.id}`,
    };
  });
}

