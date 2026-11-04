/**
 * Runs once per server process before it handles requests (Next.js
 * instrumentation hook). Applies pending migrations here, not when `db` is
 * imported, so several workers never race on the migration journal.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` may load instrumentation in several workers: never migrate there.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { sqlite } = await import("@/lib/db");
  const { runMigrations } = await import("@/lib/db/migrate");
  runMigrations(sqlite);
  const { warnIfClientIpUnconfigured } = await import("@/lib/security/client-ip");
  warnIfClientIpUnconfigured();
}
