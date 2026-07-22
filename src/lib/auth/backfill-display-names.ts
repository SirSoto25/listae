import { and, eq, isNotNull, ne, or, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Bulk fix: set display_name = username where they diverge or display_name is null. */
export async function backfillDisplayNamesFromUsernames(): Promise<number> {
  const result = await db
    .update(users)
    .set({ displayName: sql`${users.username}` })
    .where(
      and(
        isNotNull(users.username),
        or(isNull(users.displayName), ne(users.displayName, users.username)),
      ),
    );

  return result.changes ?? 0;
}

/** Cheap single-row fix for the signed-in user. */
export async function reconcileDisplayNameForUser(
  userId: string,
  username: string,
  displayName: string | null,
): Promise<void> {
  if (displayName === username) {
    return;
  }

  await db
    .update(users)
    .set({ displayName: username })
    .where(eq(users.id, userId));
}
