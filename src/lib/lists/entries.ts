import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { listEntries, works } from "@/lib/db/schema";
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
    throw new Error("score must be 1-10");
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

function parseProgress(raw: unknown): number {
  if (raw === "" || raw === null || raw === undefined) {
    return 0;
  }

  const progress = Number(raw);
  if (!Number.isInteger(progress) || progress < 0) {
    throw new Error("progress must be a non-negative integer");
  }

  return progress;
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
    throw new Error("invalid list status");
  }

  const base = {
    status: input.status as ListStatus,
    score: parseScore(input.score),
    notes: String(input.notes ?? "").trim() || null,
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
    if (
      totals.episodesTotal !== null &&
      totals.episodesTotal !== undefined &&
      progressValue > totals.episodesTotal
    ) {
      throw new Error(
        `progress cannot exceed ${totals.episodesTotal} episodes`,
      );
    }
    return {
      ...base,
      progressValue,
      progressUnit: "episodes",
    };
  }

  if (input.progressUnit !== "chapters" && input.progressUnit !== "pages") {
    throw new Error("progress unit must be chapters or pages");
  }
  const total =
    input.progressUnit === "chapters"
      ? totals.chaptersTotal
      : totals.pagesTotal;
  if (total !== null && total !== undefined && progressValue > total) {
    throw new Error(`progress cannot exceed ${total} ${input.progressUnit}`);
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
): ProfileEntry[] {
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
        ? "No progress tracking"
        : `${entry.progressValue}${total ? ` / ${total}` : ""} ${entry.progressUnit ?? "items"}`;

    return {
      title: work.title,
      type: work.type,
      status: entry.status,
      score: entry.score,
      progress,
      cover: work.coverUrl,
      url: `/title/${work.id}`,
    };
  });
}

