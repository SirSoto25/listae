import type { Locale } from "./config";

type WorkTextFields = {
  title: string;
  titleEs?: string | null;
  titleEn?: string | null;
  synopsis?: string | null;
  synopsisEs?: string | null;
  synopsisEn?: string | null;
};

export function workTitle(work: WorkTextFields, locale: Locale): string {
  const primary = locale === "es" ? work.titleEs : work.titleEn;
  return (
    primary?.trim() ||
    work.titleEn?.trim() ||
    work.titleEs?.trim() ||
    work.title
  );
}

export function workSynopsis(
  work: WorkTextFields,
  locale: Locale,
): string | null {
  const primary = locale === "es" ? work.synopsisEs : work.synopsisEn;
  return (
    primary?.trim() ||
    work.synopsisEn?.trim() ||
    work.synopsisEs?.trim() ||
    work.synopsis?.trim() ||
    null
  );
}
