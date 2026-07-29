import { sql } from "drizzle-orm";

import { db } from "./index";

/** One-time backfill: copy legacy title/synopsis into English columns. */
export function backfillWorkI18nColumns(): void {
  db.run(sql`
    update works
    set title_en = title
    where title_en is null
  `);
  db.run(sql`
    update works
    set synopsis_en = synopsis
    where synopsis_en is null and synopsis is not null
  `);
}
