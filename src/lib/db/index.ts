import "server-only";

import { drizzle } from "drizzle-orm/better-sqlite3";

import { openDatabase } from "./connection";
import * as schema from "./schema";

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/listae.db";

/** Raw connection, for migrations (`src/instrumentation.ts`) and tests. */
export const sqlite = openDatabase(dbPath);

export const db = drizzle(sqlite, { schema });
