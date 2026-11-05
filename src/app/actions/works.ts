"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createManualWork, importWork } from "@/lib/catalog/works";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { FormInputError, type FormState } from "@/lib/form-error";
import { formErrorState } from "@/lib/form-error-state";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { safeReturnPath } from "@/lib/safe-return-path";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { WORK_TYPES, type WorkType } from "@/types/domain";

/** Imports per user per hour (D8). */
const IMPORTS_PER_HOUR = 60;

async function findAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }
  const user = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, session.user.email),
  });
  return user?.id ?? null;
}

async function requireAuthenticatedUser(): Promise<string> {
  const userId = await findAuthenticatedUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

function localeFromForm(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : "es";
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

/**
 * "Follow this title" from the search results. Anonymous visitors go to the
 * login page and come back to the same search; everything the user can
 * correct or retry (rate limit, provider failure) is returned as form state
 * instead of reaching Next's error page.
 */
export async function importHitAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeFromForm(formData);
  const userId = await findAuthenticatedUserId();
  if (!userId) {
    const returnTo = safeReturnPath(
      formData.get("returnTo"),
      localePath(locale, "/"),
    );
    redirect(
      `${localePath(locale, "/login")}?callbackUrl=${encodeURIComponent(returnTo)}`,
    );
  }

  let workId: string;
  try {
    const limit = checkRateLimit(`import:user:${userId}`, {
      limit: IMPORTS_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.ok) {
      throw new FormInputError("rateLimited", "import rate limit reached", {
        minutes: Math.max(1, Math.ceil((limit.retryAfterSec ?? 60) / 60)),
      });
    }

    const source = formData.get("source");
    const externalId = String(formData.get("externalId") ?? "").trim();
    if ((source !== "tmdb" && source !== "openlibrary") || !externalId) {
      throw new FormInputError("importFailed", "invalid catalog identity");
    }

    workId = (await importWork(source, externalId)).id;
  } catch (error) {
    if (!(error instanceof FormInputError)) {
      // Provider timeouts, 429s and outages: the user can retry, and the
      // raw message (which may name internals) stays in the server log.
      console.error("[listae catalog] import failed:", error);
      return formErrorState(
        new FormInputError("importFailed", "catalog import failed"),
        locale,
      );
    }
    return formErrorState(error, locale);
  }

  redirect(localePath(locale, `/title/${workId}`));
}

export async function createManualWorkAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireAuthenticatedUser();
  const locale = localeFromForm(formData);

  let workId: string;
  try {
    const work = await createManualWork({
      createdBy: userId,
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
