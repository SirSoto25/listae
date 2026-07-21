import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/listae.db";
const dbPath = dbUrl.replace(/^file:/, "");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
