import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Opens a SQLite database configured for a web server: WAL so readers do not
 * block the writer, a busy timeout instead of immediate `SQLITE_BUSY`, and
 * foreign keys on (SQLite leaves them off by default).
 *
 * No `server-only` here: migrations and scripts open the file outside React.
 */
export function openDatabase(file: string): Database.Database {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}
