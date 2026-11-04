import type Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const JOURNAL = "__drizzle_migrations";

function tableExists(sqlite: Database.Database, name: string): boolean {
  return (
    sqlite
      .prepare("select 1 from sqlite_master where type = 'table' and name = ?")
      .get(name) !== undefined
  );
}

function journalRows(sqlite: Database.Database): number {
  if (!tableExists(sqlite, JOURNAL)) return 0;
  return (
    sqlite.prepare(`select count(*) as n from ${JOURNAL}`).get() as {
      n: number;
    }
  ).n;
}

/**
 * Applies pending Drizzle migrations. Call it once per process at startup
 * (see `src/instrumentation.ts`): Drizzle reads the journal before `BEGIN`,
 * so concurrent callers would race.
 *
 * Databases created with `db:push` have the schema but no journal, so `0000`
 * would fail with "table already exists". Those are baselined: the first
 * migration is recorded as applied without running it, and later migrations
 * run normally. Existing rows are never touched.
 */
export function runMigrations(
  sqlite: Database.Database,
  migrationsFolder: string = path.join(process.cwd(), "drizzle"),
): { applied: number; baselined: boolean } {
  const migrations = readMigrationFiles({ migrationsFolder });
  let baselined = false;

  if (
    migrations.length > 0 &&
    tableExists(sqlite, "users") &&
    journalRows(sqlite) === 0
  ) {
    const [first] = migrations;
    sqlite.transaction(() => {
      // Same DDL Drizzle's migrator uses, so later runs see a familiar table.
      sqlite.exec(
        `CREATE TABLE IF NOT EXISTS ${JOURNAL} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
      );
      sqlite
        .prepare(`INSERT INTO ${JOURNAL} (hash, created_at) VALUES (?, ?)`)
        .run(first.hash, first.folderMillis);
    })();
    baselined = true;
  }

  const before = journalRows(sqlite);
  migrate(drizzle(sqlite), { migrationsFolder });
  return { applied: journalRows(sqlite) - before, baselined };
}
