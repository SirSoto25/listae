import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { profileThemes } from "@/lib/db/schema";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "./defaults";

export async function ensureProfileTheme(userId: string) {
  await db
    .insert(profileThemes)
    .values({
      id: randomUUID(),
      userId,
      htmlTemplate: DEFAULT_HTML_TEMPLATE,
      customCss: DEFAULT_CSS,
    })
    .onConflictDoNothing({ target: profileThemes.userId });

  const theme = await db.query.profileThemes.findFirst({
    where: eq(profileThemes.userId, userId),
  });
  if (!theme) {
    throw new Error("profile theme could not be created");
  }

  return theme;
}
