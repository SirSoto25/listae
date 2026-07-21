import type { WorkType } from "@/types/domain";

import type { CatalogHit } from "./types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

type TmdbResult = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

type TmdbResponse = {
  results?: TmdbResult[];
};

let hasLoggedMissingKey = false;

function yearFromDate(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isInteger(year) ? year : undefined;
}

function mapResult(
  result: TmdbResult,
  requestedType: WorkType | "all",
): CatalogHit | null {
  const mediaType =
    result.media_type ??
    (requestedType === "movie" ? "movie" : requestedType === "all" ? undefined : "tv");
  if (mediaType !== "movie" && mediaType !== "tv") {
    return null;
  }

  const title = mediaType === "movie" ? result.title : result.name;
  if (!title) {
    return null;
  }

  const type: WorkType =
    mediaType === "movie"
      ? "movie"
      : requestedType === "anime"
        ? "anime"
        : "series";
  const year = yearFromDate(
    mediaType === "movie" ? result.release_date : result.first_air_date,
  );

  return {
    source: "tmdb",
    externalId: String(result.id),
    type,
    title,
    ...(year === undefined ? {} : { year }),
    ...(result.poster_path
      ? { coverUrl: `${TMDB_IMAGE_BASE_URL}${result.poster_path}` }
      : {}),
  };
}

export async function searchTmdb(
  query: string,
  typeFilter: WorkType | "all",
): Promise<CatalogHit[]> {
  if (!["all", "anime", "series", "movie"].includes(typeFilter)) {
    return [];
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    if (!hasLoggedMissingKey) {
      console.warn("TMDB_API_KEY is not configured; TMDB search is disabled.");
      hasLoggedMissingKey = true;
    }
    return [];
  }

  const endpoint =
    typeFilter === "all"
      ? "search/multi"
      : typeFilter === "movie"
        ? "search/movie"
        : "search/tv";
  const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`TMDB search failed with status ${response.status}`);
  }

  const data = (await response.json()) as TmdbResponse;
  return (data.results ?? [])
    .map((result) => mapResult(result, typeFilter))
    .filter((hit): hit is CatalogHit => hit !== null);
}
