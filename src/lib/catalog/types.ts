import type { WorkType } from "@/types/domain";

export type CatalogHit = {
  source: "tmdb" | "openlibrary";
  externalId: string;
  type: WorkType;
  title: string;
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
