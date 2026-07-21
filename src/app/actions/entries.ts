"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { addListEntry, updateListEntry } from "@/lib/lists/entries";

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

function entryInput(formData: FormData) {
  return {
    status: formData.get("status"),
    score: formData.get("score"),
    progressValue: formData.get("progressValue"),
    progressUnit: formData.get("progressUnit"),
    notes: formData.get("notes"),
  };
}

function safeReturnPath(formData: FormData, fallback: string): string {
  const value = formData.get("returnPath");
  return typeof value === "string" && /^\/(?!\/)/.test(value)
    ? value
    : fallback;
}

export async function addToList(formData: FormData): Promise<never> {
  const userId = await requireUserId();
  const workId = String(formData.get("workId") ?? "");
  if (!workId) {
    throw new Error("work is required");
  }

  await addListEntry(userId, workId, entryInput(formData));
  revalidatePath("/library");
  revalidatePath(`/title/${workId}`);
  redirect(safeReturnPath(formData, `/title/${workId}?saved=1`));
}

export async function updateEntry(formData: FormData): Promise<never> {
  const userId = await requireUserId();
  const workId = String(formData.get("workId") ?? "");
  if (!workId) {
    throw new Error("work is required");
  }

  await updateListEntry(userId, workId, entryInput(formData));
  revalidatePath("/library");
  revalidatePath(`/title/${workId}`);
  redirect(safeReturnPath(formData, `/title/${workId}?saved=1`));
}
