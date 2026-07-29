"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { addListEntry, updateListEntry } from "@/lib/lists/entries";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { safeReturnPath } from "@/lib/safe-return-path";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, session.user.email),
  });
  if (!user) {
    redirect("/login");
  }

  return user.id;
}

function localeFromForm(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : "es";
}

function revalidateEntryPaths(workId: string) {
  for (const loc of LOCALES) {
    revalidatePath(localePath(loc, "/library"));
    revalidatePath(localePath(loc, `/title/${workId}`));
  }
}

function entryInput(formData: FormData) {
  return {
    status: formData.get("status"),
    score: formData.get("score"),
    progressValue: formData.get("progressValue"),
    progressUnit: formData.get("progressUnit"),
    notes: formData.get("notes"),
  };
}

export async function addToList(formData: FormData): Promise<never> {
  const userId = await requireUserId();
  const workId = String(formData.get("workId") ?? "");
  if (!workId) {
    throw new Error("work is required");
  }

  await addListEntry(userId, workId, entryInput(formData));
  revalidateEntryPaths(workId);
  const locale = localeFromForm(formData);
  redirect(
    safeReturnPath(
      formData.get("returnPath"),
      localePath(locale, `/title/${workId}?saved=1`),
    ),
  );
}

export async function updateEntry(formData: FormData): Promise<never> {
  const userId = await requireUserId();
  const workId = String(formData.get("workId") ?? "");
  if (!workId) {
    throw new Error("work is required");
  }

  await updateListEntry(userId, workId, entryInput(formData));
  revalidateEntryPaths(workId);
  const locale = localeFromForm(formData);
  redirect(
    safeReturnPath(
      formData.get("returnPath"),
      localePath(locale, `/title/${workId}?saved=1`),
    ),
  );
}
