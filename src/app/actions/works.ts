"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createManualWork, importWork } from "@/lib/catalog/works";
import { FormInputError, type FormState } from "@/lib/form-error";
import { formErrorState } from "@/lib/form-error-state";
import { isLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { WORK_TYPES, type WorkType } from "@/types/domain";

async function requireAuthenticatedUser(): Promise<void> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
}

function requireWorkType(raw: FormDataEntryValue | null): WorkType {
  if (
    typeof raw !== "string" ||
    !WORK_TYPES.includes(raw as WorkType)
  ) {
    throw new FormInputError("invalidWorkType", "invalid work type");
  }
  return raw as WorkType;
}

function requireHttpsCoverUrl(
  raw: FormDataEntryValue | null,
): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new FormInputError(
      "invalidCoverUrl",
      "cover URL must be a valid https URL",
    );
  }

  if (parsed.protocol !== "https:") {
    throw new FormInputError("invalidCoverUrl", "cover URL must use https");
  }

  return parsed.toString();
}

function optionalInteger(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
    throw new FormInputError(
      "invalidNumber",
      "totals and year must be integers between 0 and 1000000",
      { max: 1_000_000 },
    );
  }
  return value;
}

export async function importHitAction(formData: FormData): Promise<never> {
  await requireAuthenticatedUser();
  const source = formData.get("source");
  if (source !== "tmdb" && source !== "openlibrary") {
    throw new Error("invalid catalog source");
  }

  const externalId = String(formData.get("externalId") ?? "").trim();
  if (!externalId) {
    throw new Error("catalog identity is required");
  }

  const work = await importWork(source, externalId);

  redirect(`/title/${work.id}`);
}

export async function createManualWorkAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAuthenticatedUser();
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : "es";

  let workId: string;
  try {
    const work = await createManualWork({
      type: requireWorkType(formData.get("type")),
      title: String(formData.get("title") ?? ""),
      originalTitle:
        String(formData.get("originalTitle") ?? "").trim() || undefined,
      coverUrl: requireHttpsCoverUrl(formData.get("coverUrl")),
      year: optionalInteger(formData.get("year")),
      synopsis: String(formData.get("synopsis") ?? "").trim() || undefined,
      episodesTotal: optionalInteger(formData.get("episodesTotal")),
      chaptersTotal: optionalInteger(formData.get("chaptersTotal")),
      pagesTotal: optionalInteger(formData.get("pagesTotal")),
    });
    workId = work.id;
  } catch (error) {
    return formErrorState(error, locale);
  }

  redirect(localePath(locale, `/title/${workId}`));
}
