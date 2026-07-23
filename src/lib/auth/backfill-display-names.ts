import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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
