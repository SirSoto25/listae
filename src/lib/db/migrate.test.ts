import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { openDatabase } from "./connection";
import { runMigrations } from "./migrate";

const MIGRATIONS = path.join(process.cwd(), "drizzle");

const APP_TABLES = [
  "accounts",
  "list_entries",
  "profile_themes",
  "search_cache",
  "sessions",
  "users",
  "verification_tokens",
  "works",
];

type Sqlite = ReturnType<typeof openDatabase>;

function tableNames(sqlite: Sqlite): string[] {
  return (
    sqlite
      .prepare("select name from sqlite_master where type = 'table'")
      .all() as { name: string }[]
  ).map((row) => row.name);
}

function journalRows(sqlite: Sqlite): number {
  return (
    sqlite.prepare("select count(*) as n from __drizzle_migrations").get() as {
      n: number;
    }
  ).n;
}

/** Recreates what `drizzle-kit push` leaves behind: the schema, no journal. */
function pushSchema(sqlite: Sqlite) {
  const sql = fs.readFileSync(
    path.join(MIGRATIONS, "0000_naive_siren.sql"),
    "utf8",
  );
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) sqlite.exec(statement);
  }
}

describe("runMigrations", () => {
  it("creates every table on an empty database", () => {
    const sqlite = openDatabase(":memory:");

    expect(runMigrations(sqlite, MIGRATIONS)).toEqual({
      applied: 1,
      baselined: false,
    });
    expect(tableNames(sqlite)).toEqual(
      expect.arrayContaining([...APP_TABLES, "__drizzle_migrations"]),
    );
    expect(journalRows(sqlite)).toBe(1);
    sqlite.close();
  });

  it("is idempotent", () => {
    const sqlite = openDatabase(":memory:");
    runMigrations(sqlite, MIGRATIONS);

    expect(runMigrations(sqlite, MIGRATIONS)).toEqual({
      applied: 0,
      baselined: false,
    });
    expect(journalRows(sqlite)).toBe(1);
    sqlite.close();
  });

  it("defaults to the drizzle folder in the working directory", () => {
    const sqlite = openDatabase(":memory:");
    expect(runMigrations(sqlite)).toEqual({ applied: 1, baselined: false });
    sqlite.close();
  });

  it("baselines a database created with db:push", () => {
    const sqlite = openDatabase(":memory:");
    pushSchema(sqlite);
    sqlite
      .prepare("insert into users (id, email, username) values (?, ?, ?)")
      .run("u1", "ana@example.com", "ana");

    expect(runMigrations(sqlite, MIGRATIONS)).toEqual({
      applied: 0,
      baselined: true,
    });
    expect(
      sqlite.prepare("select id, email, username from users").all(),
    ).toEqual([{ id: "u1", email: "ana@example.com", username: "ana" }]);
    expect(journalRows(sqlite)).toBe(1);

    // A later start must neither baseline again nor re-run 0000.
    expect(runMigrations(sqlite, MIGRATIONS)).toEqual({
      applied: 0,
      baselined: false,
    });
    expect(journalRows(sqlite)).toBe(1);
    sqlite.close();
  });

  it("baselines a pushed file database that already has an empty journal", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "listae-db-"));
    const file = path.join(dir, "pushed.db");
    try {
      const sqlite = openDatabase(file);
      pushSchema(sqlite);
      sqlite
        .prepare("insert into users (id, email) values (?, ?)")
        .run("u1", "ana@example.com");
      // A failed `drizzle-kit migrate` leaves an empty journal behind.
      sqlite.exec(
        "CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
      );
      sqlite.close();

      const reopened = openDatabase(file);
      expect(runMigrations(reopened, MIGRATIONS)).toEqual({
        applied: 0,
        baselined: true,
      });
      expect(reopened.prepare("select count(*) as n from users").get()).toEqual(
        { n: 1 },
      );
      expect(journalRows(reopened)).toBe(1);
      reopened.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
