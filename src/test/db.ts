/**
 * Test helper: an in-memory `@/lib/db` with the real migrations applied.
 * Call it from `beforeAll`; each Vitest file gets its own module graph, so
 * each file gets its own fresh database.
 */
export async function migratedTestDb(): Promise<typeof import("@/lib/db")> {
  process.env.DATABASE_URL = "file::memory:";
  const dbModule = await import("@/lib/db");
  const { runMigrations } = await import("@/lib/db/migrate");
  runMigrations(dbModule.sqlite);
  return dbModule;
}
