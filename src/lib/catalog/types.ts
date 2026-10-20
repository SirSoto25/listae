import type { WorkType } from "@/types/domain";

/** Upper bound for any single catalog provider request. */
export const PROVIDER_TIMEOUT_MS = 8000;

export type CatalogHit = {
  source: "tmdb" | "openlibrary";
  externalId: string;
  type: WorkType;
  title: string;
  titleEs?: string;
  titleEn?: string;
  synopsis?: string;
  synopsisEs?: string;
  synopsisEn?: string;
  year?: number;
  coverUrl?: string;
  episodesTotal?: number;
  chaptersTotal?: number;
  pagesTotal?: number;
};

export type ManualWorkInput = {
  type: WorkType;
  title: string;
  originalTitle?: string;
  coverUrl?: string;
  year?: number;
  synopsis?: string;
  episodesTotal?: number;
  chaptersTotal?: number;
  pagesTotal?: number;
};
