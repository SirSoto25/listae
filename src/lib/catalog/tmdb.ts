import type { WorkType } from "@/types/domain";
import type { Locale } from "@/lib/i18n/config";

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

type TmdbDetails = TmdbResult & {
  genres?: Array<{ id: number }>;
  number_of_episodes?: number;
  original_language?: string;
  overview?: string;
};

type TmdbResponse = {
  results?: TmdbResult[];
};

let hasLoggedMissingKey = false;

function tmdbLanguageForLocale(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

/** TMDB v4 read access tokens are JWTs; v3 API keys are short hex strings. */
export function isTmdbBearerToken(credential: string): boolean {
  return credential.startsWith("eyJ");
}

export function buildTmdbRequest(
  path: string,
  credential: string,
  params: Record<string, string>,
): { url: URL; headers: HeadersInit } {
  const url = new URL(`${TMDB_BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (isTmdbBearerToken(credential)) {
    return {
      url,
      headers: {
        Authorization: `Bearer ${credential}`,
        Accept: "application/json",
      },
    };
  }

  url.searchParams.set("api_key", credential);
  return { url, headers: { Accept: "application/json" } };
}

function yearFromDate(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isInteger(year) ? year : undefined;
}

function localizedTitle(details: TmdbDetails, mediaType: "movie" | "tv"): string | undefined {
  return mediaType === "movie" ? details.title : details.name;
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
    externalId: `${mediaType}:${result.id}`,
    type,
    title,
    ...(year === undefined ? {} : { year }),
    ...(result.poster_path
      ? { coverUrl: `${TMDB_IMAGE_BASE_URL}${result.poster_path}` }
      : {}),
  };
}

async function fetchTmdbDetails(
  mediaType: "movie" | "tv",
  id: string,
  apiKey: string,
  language?: string,
): Promise<TmdbDetails> {
  const params: Record<string, string> = {};
  if (language) {
    params.language = language;
  }
  const { url, headers } = buildTmdbRequest(`${mediaType}/${id}`, apiKey, params);
  const response = await fetch(url, { cache: "no-store", headers });
  if (!response.ok) {
    throw new Error(`TMDB lookup failed with status ${response.status}`);
  }

  return (await response.json()) as TmdbDetails;
}

export async function searchTmdb(
  query: string,
  typeFilter: WorkType | "all",
  locale: Locale = "es",
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
  const { url, headers } = buildTmdbRequest(endpoint, apiKey, {
    query,
    include_adult: "false",
    page: "1",
    language: tmdbLanguageForLocale(locale),
  });

  const response = await fetch(url, { cache: "no-store", headers });
  if (!response.ok) {
    throw new Error(`TMDB search failed with status ${response.status}`);
  }

  const data = (await response.json()) as TmdbResponse;
  return (data.results ?? [])
    .map((result) => mapResult(result, typeFilter))
    .filter((hit): hit is CatalogHit => hit !== null);
}

function applyTmdbStructuralFields(
  hit: CatalogHit,
  mediaType: "movie" | "tv",
  details: TmdbDetails,
): CatalogHit {
  if (
    mediaType === "tv" &&
    details.original_language === "ja" &&
    details.genres?.some((genre) => genre.id === 16)
  ) {
    hit.type = "anime";
  }
  if (mediaType === "tv" && details.number_of_episodes !== undefined) {
    hit.episodesTotal = details.number_of_episodes;
  }
  return hit;
}

export async function resolveTmdbBilingual(
  externalId: string,
): Promise<CatalogHit> {
  const identity = /^(movie|tv):(\d+)$/.exec(externalId);
  if (!identity) {
    throw new Error("invalid TMDB identity");
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  const [, mediaType, id] = identity as [string, "movie" | "tv", string];
  const [esDetails, enDetails] = await Promise.all([
    fetchTmdbDetails(mediaType, id, apiKey, "es-ES"),
    fetchTmdbDetails(mediaType, id, apiKey, "en-US"),
  ]);

  const structural = enDetails.id ? enDetails : esDetails;
  const hit = mapResult(
    {
      ...structural,
      id: Number(id),
      media_type: mediaType,
    },
    "all",
  );
  if (!hit) {
    throw new Error("TMDB record is invalid");
  }

  const titleEs = localizedTitle(esDetails, mediaType)?.trim();
  const titleEn = localizedTitle(enDetails, mediaType)?.trim();
  const synopsisEs = esDetails.overview?.trim() || undefined;
  const synopsisEn = enDetails.overview?.trim() || undefined;

  applyTmdbStructuralFields(hit, mediaType, enDetails);

  return {
    ...hit,
    titleEs,
    titleEn,
    synopsisEs,
    synopsisEn,
    title: titleEn ?? titleEs ?? hit.title,
    synopsis: synopsisEn ?? synopsisEs,
  };
}

export async function resolveTmdb(externalId: string): Promise<CatalogHit> {
  return resolveTmdbBilingual(externalId);
}
