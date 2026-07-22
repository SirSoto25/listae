import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import { db } from "./index";
import {
  accounts,
  listEntries,
  profileThemes,
  searchCache,
  sessions,
  users,
  verificationTokens,
  works,
} from "./schema";

const tableNames = [
  users,
  accounts,
  sessions,
  verificationTokens,
  profileThemes,
  works,
  listEntries,
  searchCache,
].map((table) => getTableConfig(table).name);

describe("database schema", () => {
  it("declares all Task 2 tables", () => {
    expect(tableNames).toEqual([
      "users",
      "accounts",
      "sessions",
      "verification_tokens",
      "profile_themes",
      "works",
      "list_entries",
      "search_cache",
    ]);
  });

  it("keeps usernames and user works unique", () => {
    expect(
      getTableConfig(users).uniqueConstraints.some(
        (constraint) => constraint.name === "users_username_unique",
      ),
    ).toBe(true);
    expect(
      getTableConfig(listEntries).uniqueConstraints.some(
        (constraint) =>
          constraint.name === "list_entries_user_id_work_id_unique",
      ),
    ).toBe(true);
  });

  it("indexes external works uniquely when source and id are present", () => {
    const externalWorkIndex = getTableConfig(works).indexes.find(
      (index) => index.config.name === "works_external_source_external_id_unique",
    );

    expect(externalWorkIndex?.config.unique).toBe(true);
    expect(externalWorkIndex?.config.where).toBeDefined();
  });

  it("enables foreign key enforcement on the runtime client", () => {
    const result = db.get<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`);
    expect(result?.foreign_keys).toBe(1);
  });
});
