import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "./connection";
import { runMigrations } from "./migrate";

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Sqlite = ReturnType<typeof openDatabase>;

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

type JournalEntry = { tag: string };

function journal(): { entries: JournalEntry[] } & Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS, "meta/_journal.json"), "utf8"),
  );
}

/** A copy of `drizzle/` that only knows about the first migration (`0000`). */
function firstMigrationOnly(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "listae-0000-"));
  tempDirs.push(dir);
  const full = journal();
  const [first] = full.entries;
  fs.mkdirSync(path.join(dir, "meta"));
  fs.writeFileSync(
    path.join(dir, "meta/_journal.json"),
    JSON.stringify({ ...full, entries: [first] }),
  );
  fs.copyFileSync(
    path.join(MIGRATIONS, `${first.tag}.sql`),
    path.join(dir, `${first.tag}.sql`),
  );
  return dir;
}

/** Recreates what `drizzle-kit push` left behind before `0001`: schema, no journal. */
function pushFirstSchema(sqlite: Sqlite) {
  const [first] = journal().entries;
  const sql = fs.readFileSync(path.join(MIGRATIONS, `${first.tag}.sql`), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) sqlite.exec(statement);
  }
}

/** Seeds a user, a work and one entry per `entries` row (pre-`0001`, no CHECKs). */
function seed(
  sqlite: Sqlite,
  entries: { id: string; score?: number | null; progressValue?: number; progressUnit?: string | null; status?: string }[],
) {
  sqlite
    .prepare("insert into users (id, email, username) values (?, ?, ?)")
    .run("u1", "ana@example.com", "ana");
  sqlite
    .prepare("insert into works (id, type, title, external_source, external_id) values (?, ?, ?, ?, ?)")
    .run("w1", "anime", "Frieren", "tmdb", "1");
  sqlite
    .prepare("insert into sessions (session_token, user_id, expires) values (?, ?, ?)")
    .run("s1", "u1", 2_000_000_000);
  sqlite
    .prepare("insert into profile_themes (id, user_id, html_template, custom_css) values (?, ?, ?, ?)")
    .run("t1", "u1", "<p>hi</p>", "p{}");
  const insert = sqlite.prepare(
    "insert into list_entries (id, user_id, work_id, status, score, progress_value, progress_unit) values (?, ?, ?, ?, ?, ?, ?)",
  );
  entries.forEach((entry, index) => {
    // One work per entry: (user_id, work_id) is unique.
    const workId = index === 0 ? "w1" : `w${index + 1}`;
    if (index > 0) {
      sqlite
        .prepare("insert into works (id, type, title) values (?, ?, ?)")
        .run(workId, "book", `Book ${index}`);
    }
    insert.run(
      entry.id,
      "u1",
      workId,
      entry.status ?? "plan",
      entry.score ?? null,
      entry.progressValue ?? 0,
      entry.progressUnit ?? null,
    );
  });
}

/** In-memory database at `0000` with `rows` seeded, then fully migrated. */
function migrateFrom0000(
  seedRows: (sqlite: Sqlite) => void,
): Sqlite {
  const sqlite = openDatabase(":memory:");
  runMigrations(sqlite, firstMigrationOnly());
  seedRows(sqlite);
  runMigrations(sqlite, MIGRATIONS);
  return sqlite;
}

function count(sqlite: Sqlite, table: string): number {
  return (sqlite.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function indexNames(sqlite: Sqlite, table: string): string[] {
  return (sqlite.pragma(`index_list('${table}')`) as { name: string }[]).map(
    (row) => row.name,
  );
}

describe("migration 0001", () => {
  it("cleans invalid rows before adding checks", () => {
    const sqlite = migrateFrom0000((db) =>
      seed(db, [
        { id: "e-score", score: 0 },
        { id: "e-progress", progressValue: -3 },
        { id: "e-unit", progressUnit: "" },
      ]),
    );

    expect(
      sqlite
        .prepare("select id, score, progress_value as progressValue, progress_unit as progressUnit from list_entries order by id")
        .all(),
    ).toEqual([
      { id: "e-progress", score: null, progressValue: 0, progressUnit: null },
      { id: "e-score", score: null, progressValue: 0, progressUnit: null },
      { id: "e-unit", score: null, progressValue: 0, progressUnit: null },
    ]);
    sqlite.close();
  });

  it("cleans invalid enum values instead of failing", () => {
    const sqlite = migrateFrom0000((db) => {
      seed(db, [
        { id: "e-status", status: "watching", score: 11 },
        { id: "e-ok", status: "completed", score: 10, progressValue: 12, progressUnit: "pages" },
      ]);
      db.prepare("update users set profile_locale = 'fr' where id = 'u1'").run();
      db.prepare("update works set type = 'podcast', external_source = 'imdb' where id = 'w1'").run();
      db.prepare("insert into works (id, type, title, external_source, external_id) values ('w-ol', 'novel', 'Dune', 'openlibrary', 'OL1')").run();
    });

    expect(
      sqlite.prepare("select id, status, score, progress_value as progressValue, progress_unit as progressUnit from list_entries order by id").all(),
    ).toEqual([
      { id: "e-ok", status: "completed", score: 10, progressValue: 12, progressUnit: "pages" },
      { id: "e-status", status: "plan", score: null, progressValue: 0, progressUnit: null },
    ]);
    expect(sqlite.prepare("select profile_locale as l from users").get()).toEqual({ l: "es" });
    expect(
      sqlite.prepare("select id, type, external_source as source from works where id in ('w1', 'w-ol') order by id").all(),
    ).toEqual([
      { id: "w-ol", type: "book", source: "openlibrary" },
      { id: "w1", type: "book", source: null },
    ]);
    sqlite.close();
  });

  it("keeps child rows when parent tables are rebuilt", () => {
    const sqlite = migrateFrom0000((db) =>
      seed(db, [{ id: "e1", score: 7 }, { id: "e2" }]),
    );

    expect(count(sqlite, "users")).toBe(1);
    expect(count(sqlite, "works")).toBe(2);
    expect(count(sqlite, "list_entries")).toBe(2);
    expect(count(sqlite, "sessions")).toBe(1);
    expect(count(sqlite, "profile_themes")).toBe(1);
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    sqlite.close();
  });

  it("removes orphan rows left by databases used without foreign keys", () => {
    const sqlite = migrateFrom0000((db) => {
      seed(db, [{ id: "e1" }]);
      db.pragma("foreign_keys = OFF");
      db.prepare("insert into list_entries (id, user_id, work_id, status) values ('orphan', 'ghost', 'w1', 'plan')").run();
      db.prepare("insert into sessions (session_token, user_id, expires) values ('ghost-session', 'ghost', 1)").run();
      db.pragma("foreign_keys = ON");
    });

    expect(sqlite.prepare("select id from list_entries").all()).toEqual([{ id: "e1" }]);
    expect(sqlite.prepare("select session_token as t from sessions").all()).toEqual([{ t: "s1" }]);
    sqlite.close();
  });

  it("keeps foreign keys valid", () => {
    const sqlite = migrateFrom0000((db) => seed(db, [{ id: "e1" }]));
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
    sqlite.close();
  });

  it("rejects out-of-range scores", () => {
    const sqlite = migrateFrom0000((db) => seed(db, [{ id: "e1" }]));
    expect(() =>
      sqlite.prepare("update list_entries set score = 11 where id = 'e1'").run(),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      sqlite.prepare("insert into works (id, type, title) values ('bad', 'podcast', 'x')").run(),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      sqlite.prepare("update users set profile_locale = 'fr'").run(),
    ).toThrow(/CHECK constraint failed/);
    sqlite.close();
  });

  it("creates the expected indexes", () => {
    const sqlite = migrateFrom0000(() => {});
    expect(indexNames(sqlite, "list_entries")).toEqual(
      expect.arrayContaining([
        "list_entries_user_id_work_id_unique",
        "list_entries_user_updated_idx",
        "list_entries_user_status_idx",
      ]),
    );
    expect(indexNames(sqlite, "works")).toEqual(
      expect.arrayContaining([
        "works_external_source_external_id_unique",
        "works_type_idx",
        "works_created_by_idx",
      ]),
    );
    expect(indexNames(sqlite, "users")).toEqual(
      expect.arrayContaining(["users_email_unique", "users_username_unique"]),
    );
    expect(indexNames(sqlite, "search_cache")).toContain("search_cache_expires_at_idx");
    expect(indexNames(sqlite, "sessions")).toContain("sessions_user_id_idx");
    expect(indexNames(sqlite, "verification_tokens")).toContain("verification_tokens_expires_idx");
    expect(indexNames(sqlite, "rate_limit_windows")).toContain("rate_limit_windows_reset_at_idx");
    sqlite.close();
  });

  it("adds works.created_by that is nulled when its user is deleted", () => {
    const sqlite = migrateFrom0000((db) => seed(db, []));
    sqlite.prepare("update works set created_by = 'u1' where id = 'w1'").run();
    sqlite.prepare("delete from users where id = 'u1'").run();
    expect(sqlite.prepare("select created_by as c from works where id = 'w1'").get()).toEqual({ c: null });
    sqlite.close();
  });

  it("applies on top of a baselined db:push database without losing data", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "listae-push-"));
    tempDirs.push(dir);
    const file = path.join(dir, "pushed.db");
    const pushed = openDatabase(file);
    pushFirstSchema(pushed);
    seed(pushed, [{ id: "e1", score: 0 }, { id: "e2", score: 8, progressValue: 3, progressUnit: "episodes" }]);
    pushed.close();

    const sqlite = openDatabase(file);
    expect(runMigrations(sqlite, MIGRATIONS)).toEqual({
      applied: journal().entries.length - 1,
      baselined: true,
    });
    expect(
      sqlite.prepare("select id, score, progress_value as p from list_entries order by id").all(),
    ).toEqual([
      { id: "e1", score: null, p: 0 },
      { id: "e2", score: 8, p: 3 },
    ]);
    expect(count(sqlite, "sessions")).toBe(1);
    expect(count(sqlite, "profile_themes")).toBe(1);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
    expect(count(sqlite, "__drizzle_migrations")).toBe(journal().entries.length);
    sqlite.close();
  });

  it("fails without touching data when db:push used a schema newer than 0000", () => {
    // `db:push` after this migration: the full schema exists but no journal.
    const sqlite = openDatabase(":memory:");
    runMigrations(sqlite, MIGRATIONS);
    sqlite.exec("drop table __drizzle_migrations");
    seed(sqlite, [{ id: "e1", score: 5 }]);

    expect(() => runMigrations(sqlite, MIGRATIONS)).toThrow(
      /created with db:push from a schema newer than/,
    );
    expect(count(sqlite, "list_entries")).toBe(1);
    expect(count(sqlite, "sessions")).toBe(1);
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    sqlite.close();
  });
});
