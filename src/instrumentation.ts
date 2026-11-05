/**
 * Runs once per server process before it handles requests (Next.js
 * instrumentation hook). Applies pending migrations here, not when `db` is
 * imported, so several workers never race on the migration journal.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` may load instrumentation in several workers: never migrate there.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Fail fast on an insecure auth configuration (ADR 016), before touching
  // the database. Never at import time: `next build` has no real secrets.
  const { assertAuthEnvOrExit } = await import("@/lib/auth/env");
  assertAuthEnvOrExit();
  const { sqlite } = await import("@/lib/db");
  const { runMigrations } = await import("@/lib/db/migrate");
  runMigrations(sqlite);
  // Profiles still on the previous default theme get the responsive,
  // localizable one (T1.8). A failure rolls back and must not stop the app.
  try {
    const { db } = await import("@/lib/db");
    const { upgradeLegacyDefaultThemes } = await import(
      "@/lib/theme/legacy-defaults"
    );
    const upgraded = upgradeLegacyDefaultThemes(db);
    if (upgraded > 0) {
      console.info(`[listae] upgraded ${upgraded} profile theme(s) to the new default`);
    }
  } catch (error) {
    console.error("[listae] profile theme upgrade failed", error);
  }
  const { warnIfClientIpUnconfigured } = await import("@/lib/security/client-ip");
  warnIfClientIpUnconfigured();
}
