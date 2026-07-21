export const WORK_TYPES = [
  "anime",
  "series",
  "movie",
  "book",
  "manga",
  "comic",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

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
