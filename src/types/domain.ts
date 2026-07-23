export const WORK_TYPES = [
  "anime",
  "series",
  "movie",
  "book",
  "manga",
  "comic",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const LIBRARY_DOMAINS = ["audiovisual", "reading", "all"] as const;
export type LibraryDomain = (typeof LIBRARY_DOMAINS)[number];

const AUDIOVISUAL_TYPES = ["anime", "series", "movie"] as const satisfies readonly WorkType[];
const READING_TYPES = ["book", "manga", "comic"] as const satisfies readonly WorkType[];

export function parseLibraryDomain(
  value?: string | null,
): LibraryDomain {
  if (value === "audiovisual" || value === "reading" || value === "all") {
    return value;
  }
  return "all";
}

export function workTypesForDomain(
  domain: LibraryDomain,
): readonly WorkType[] {
  if (domain === "audiovisual") return AUDIOVISUAL_TYPES;
  if (domain === "reading") return READING_TYPES;
  return WORK_TYPES;
}

export function domainForWorkType(
  type: WorkType,
): "audiovisual" | "reading" {
  return (AUDIOVISUAL_TYPES as readonly string[]).includes(type)
    ? "audiovisual"
    : "reading";
}

export const LIST_STATUSES = [
  "plan",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const EXTERNAL_SOURCES = ["tmdb", "openlibrary", "manual"] as const;
export type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

export const PROGRESS_UNITS = ["episodes", "chapters", "pages"] as const;
export type ProgressUnit = (typeof PROGRESS_UNITS)[number];
