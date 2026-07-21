import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import * as schema from "./schema";

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/listae.db";

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
