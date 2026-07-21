"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createManualWork, importWork } from "@/lib/catalog/works";
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
    throw new Error("invalid work type");
  }
  return raw as WorkType;
}

function optionalInteger(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("totals and year must be non-negative integers");
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
  formData: FormData,
): Promise<never> {
  await requireAuthenticatedUser();
  const work = await createManualWork({
    type: requireWorkType(formData.get("type")),
    title: String(formData.get("title") ?? ""),
    originalTitle:
      String(formData.get("originalTitle") ?? "").trim() || undefined,
    coverUrl: String(formData.get("coverUrl") ?? "").trim() || undefined,
    year: optionalInteger(formData.get("year")),
    synopsis: String(formData.get("synopsis") ?? "").trim() || undefined,
    episodesTotal: optionalInteger(formData.get("episodesTotal")),
    chaptersTotal: optionalInteger(formData.get("chaptersTotal")),
    pagesTotal: optionalInteger(formData.get("pagesTotal")),
  });

  redirect(`/title/${work.id}`);
}
