import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { users } from "@/lib/db/schema";

import { migratedTestDb } from "./db";

describe("migratedTestDb", () => {
  it("returns an in-memory db with the real migrated schema", async () => {
    const { db, sqlite } = await migratedTestDb();

    expect(sqlite.name).toBe(":memory:");
    db.insert(users).values({ id: "u1", email: "ana@example.com" }).run();
    expect(db.get(sql`select count(*) as n from users`)).toEqual({ n: 1 });
  });
});
