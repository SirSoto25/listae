import { randomUUID } from "node:crypto";

import { and, count, eq, gt, min, sql } from "drizzle-orm";

import { createDbSearchCacheStore } from "@/lib/cache/db-search-cache";
import { db } from "@/lib/db";
import { works } from "@/lib/db/schema";
import { FormInputError } from "@/lib/form-error";
import type { Locale } from "@/lib/i18n/config";

import { resolveCatalogHit } from "./search";
import type { CatalogHit, ManualWorkInput } from "./types";

/** Providers often lack a translation; don't ask again on every page view. */
const LOCALE_FILL_RETRY_SECONDS = 7 * 24 * 60 * 60;
const LOCALE_FILL_FAILURE_RETRY_SECONDS = 15 * 60;

export function localeFillAttemptKey(workId: string, locale: Locale): string {
  return `locale-fill:${locale}:${workId}`;
}

function canonicalTitle(hit: CatalogHit): string {
  return hit.titleEn ?? hit.titleEs ?? hit.title;
}

function canonicalSynopsis(hit: CatalogHit): string | undefined {
  return hit.synopsisEn ?? hit.synopsisEs ?? hit.synopsis;
}

function bilingualValues(hit: CatalogHit) {
  return {
    title: canonicalTitle(hit),
    titleEs: hit.titleEs,
    titleEn: hit.titleEn,
    synopsis: canonicalSynopsis(hit),
    synopsisEs: hit.synopsisEs,
    synopsisEn: hit.synopsisEn,
  };
}

export async function upsertWorkFromHit(
  hit: CatalogHit,
): Promise<{ id: string }> {
  const identity = and(
    eq(works.externalSource, hit.source),
    eq(works.externalId, hit.externalId),
  );
  const existing = db
    .select({ id: works.id })
    .from(works)
    .where(identity)
    .get();

  if (existing) {
    return existing;
  }

  const id = randomUUID();
  db.insert(works)
    .values({
      id,
      type: hit.type,
      ...bilingualValues(hit),
      year: hit.year,
      coverUrl: hit.coverUrl,
      episodesTotal: hit.episodesTotal,
      chaptersTotal: hit.chaptersTotal,
      pagesTotal: hit.pagesTotal,
      externalSource: hit.source,
      externalId: hit.externalId,
    })
    .onConflictDoNothing()
    .run();

  const inserted = db
    .select({ id: works.id })
    .from(works)
    .where(identity)
    .get();
  if (!inserted) {
    throw new Error("Unable to upsert catalog work.");
  }

  return inserted;
}

export async function importWork(
  source: CatalogHit["source"],
  externalId: string,
): Promise<{ id: string }> {
  const existing = db
    .select({ id: works.id })
    .from(works)
    .where(
      and(
        eq(works.externalSource, source),
        eq(works.externalId, externalId),
      ),
    )
    .get();
  if (existing) {
    return existing;
  }

  const hit = await resolveCatalogHit(source, externalId);
  if (hit.source !== source || hit.externalId !== externalId) {
    throw new Error("catalog provider returned a mismatched identity");
  }
  return upsertWorkFromHit(hit);
}

export async function fillMissingWorkLocale(
  workId: string,
  locale: Locale,
): Promise<boolean> {
  const work = db.select().from(works).where(eq(works.id, workId)).get();
  if (
    !work?.externalSource ||
    work.externalSource === "manual" ||
    !work.externalId
  ) {
    return false;
  }

  const missingTitle =
    locale === "es" ? !work.titleEs?.trim() : !work.titleEn?.trim();
  const missingSynopsis =
    locale === "es" ? !work.synopsisEs?.trim() : !work.synopsisEn?.trim();
  if (!missingTitle && !missingSynopsis) {
    return false;
  }

  const attempts = createDbSearchCacheStore();
  const attemptKey = localeFillAttemptKey(work.id, locale);
  if ((await attempts.get(attemptKey)) !== null) {
    return false;
  }

  let hit: CatalogHit;
  try {
    hit = await resolveCatalogHit(
      work.externalSource as CatalogHit["source"],
      work.externalId,
    );
  } catch (error) {
    await attempts.set(attemptKey, "failed", LOCALE_FILL_FAILURE_RETRY_SECONDS);
    throw error;
  }
  await attempts.set(attemptKey, "checked", LOCALE_FILL_RETRY_SECONDS);

  db.update(works)
    .set({
      titleEs: hit.titleEs ?? work.titleEs,
      titleEn: hit.titleEn ?? work.titleEn,
      synopsisEs: hit.synopsisEs ?? work.synopsisEs,
      synopsisEn: hit.synopsisEn ?? work.synopsisEn,
      title: canonicalTitle(hit) || work.title,
      synopsis: canonicalSynopsis(hit) ?? work.synopsis,
    })
    .where(eq(works.id, workId))
    .run();

  return true;
}

export const MAX_TITLE_LENGTH = 300;
export const MAX_ORIGINAL_TITLE_LENGTH = 300;
export const MAX_SYNOPSIS_LENGTH = 5000;
export const MAX_COVER_URL_LENGTH = 500;
export const MANUAL_WORKS_PER_DAY = 20;
export const MANUAL_WORKS_PER_USER = 500;
const DAY_SECONDS = 24 * 60 * 60;

function requireMaxLength(
  value: string | undefined,
  max: number,
  code:
    | "titleTooLong"
    | "originalTitleTooLong"
    | "synopsisTooLong"
    | "coverUrlTooLong",
) {
  if (value !== undefined && value.length > max) {
    throw new FormInputError(code, `${code}: at most ${max} characters`, {
      max,
    });
  }
}

export async function createManualWork(
  input: ManualWorkInput,
): Promise<{ id: string; reused: boolean }> {
  const title = input.title.trim();
  if (!title) {
    throw new FormInputError("titleRequired", "A manual work title is required.");
  }
  const originalTitle = input.originalTitle?.trim() || undefined;
  const coverUrl = input.coverUrl?.trim() || undefined;
  const synopsis = input.synopsis?.trim() || undefined;
  requireMaxLength(title, MAX_TITLE_LENGTH, "titleTooLong");
  requireMaxLength(originalTitle, MAX_ORIGINAL_TITLE_LENGTH, "originalTitleTooLong");
  requireMaxLength(synopsis, MAX_SYNOPSIS_LENGTH, "synopsisTooLong");
  requireMaxLength(coverUrl, MAX_COVER_URL_LENGTH, "coverUrlTooLong");

  const duplicate = db
    .select({ id: works.id })
    .from(works)
    .where(
      and(
        eq(works.externalSource, "manual"),
        eq(works.createdBy, input.createdBy),
        eq(works.type, input.type),
        sql`lower(trim(${works.title})) = ${title.toLowerCase()}`,
        input.year === undefined
          ? sql`${works.year} is null`
          : eq(works.year, input.year),
      ),
    )
    .get();
  if (duplicate) {
    return { id: duplicate.id, reused: true };
  }

  const total =
    db
      .select({ n: count() })
      .from(works)
      .where(
        and(
          eq(works.createdBy, input.createdBy),
          eq(works.externalSource, "manual"),
        ),
      )
      .get()?.n ?? 0;
  if (total >= MANUAL_WORKS_PER_USER) {
    throw new FormInputError(
      "manualTotalQuotaExceeded",
      "manual works limit per user reached",
      { max: MANUAL_WORKS_PER_USER },
    );
  }

  const recent = db
    .select({ n: count(), oldest: min(works.createdAt) })
    .from(works)
    .where(
      and(
        eq(works.createdBy, input.createdBy),
        eq(works.externalSource, "manual"),
        gt(works.createdAt, sql`unixepoch() - ${DAY_SECONDS}`),
      ),
    )
    .get();
  if (recent && recent.n >= MANUAL_WORKS_PER_DAY) {
    const oldestSec = recent.oldest ? recent.oldest.getTime() / 1000 : 0;
    const waitSec = oldestSec + DAY_SECONDS - Date.now() / 1000;
    throw new FormInputError(
      "manualQuotaExceeded",
      "daily manual works limit reached",
      {
        max: MANUAL_WORKS_PER_DAY,
        hours: Math.min(24, Math.max(1, Math.ceil(waitSec / 3600))),
      },
    );
  }

  const id = randomUUID();
  db.insert(works)
    .values({
      id,
      type: input.type,
      title,
      originalTitle,
      coverUrl,
      year: input.year,
      synopsis,
      externalSource: "manual",
      createdBy: input.createdBy,
      episodesTotal: input.episodesTotal,
      chaptersTotal: input.chaptersTotal,
      pagesTotal: input.pagesTotal,
    })
    .run();

  return { id, reused: false };
}
