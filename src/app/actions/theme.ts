"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileThemes, users } from "@/lib/db/schema";
import {
  prepareThemeForSave,
  type ThemeSaveInput,
} from "@/lib/theme/save";
import { ensureProfileTheme } from "@/lib/theme/store";
import type { ThemeCssError } from "@/lib/theme/validate-css";

export type SaveThemeResult =
  | { ok: true }
  | { ok: false; errors: ThemeCssError[] };

export async function saveThemeAction(
  input: ThemeSaveInput,
): Promise<SaveThemeResult> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    columns: { id: true, username: true },
    where: eq(users.email, session.user.email),
  });
  if (!user?.username) {
    redirect("/onboarding");
  }

  const result = prepareThemeForSave({
    htmlTemplate: String(input.htmlTemplate ?? ""),
    customCss: String(input.customCss ?? ""),
  });
  if (!result.ok) {
    return result;
  }

  await ensureProfileTheme(user.id);
  await db
    .update(profileThemes)
    .set({
      ...result.theme,
      updatedAt: new Date(),
    })
    .where(eq(profileThemes.userId, user.id));

  revalidatePath(`/u/${user.username}`);
  revalidatePath(`/u/${user.username}/customize`);
  return { ok: true };
}
