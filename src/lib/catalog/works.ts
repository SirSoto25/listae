import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { works } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

import { resolveCatalogHit } from "./search";
import type { CatalogHit, ManualWorkInput } from "./types";

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

  const hit = await resolveCatalogHit(
    work.externalSource as CatalogHit["source"],
    work.externalId,
  );

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

export async function createManualWork(
  input: ManualWorkInput,
): Promise<{ id: string }> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("A manual work title is required.");
  }

  const id = randomUUID();
  db.insert(works)
    .values({
      id,
      type: input.type,
      title,
      originalTitle: input.originalTitle?.trim() || undefined,
      coverUrl: input.coverUrl?.trim() || undefined,
      year: input.year,
      synopsis: input.synopsis?.trim() || undefined,
      externalSource: "manual",
      episodesTotal: input.episodesTotal,
      chaptersTotal: input.chaptersTotal,
      pagesTotal: input.pagesTotal,
    })
    .run();

  return { id };
}
