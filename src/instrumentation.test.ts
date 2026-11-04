import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function tables(): Promise<string[]> {
  const { sqlite } = await import("@/lib/db");
  return (
    sqlite
      .prepare("select name from sqlite_master where type = 'table'")
      .all() as { name: string }[]
  ).map((row) => row.name);
}

describe("instrumentation register", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = "file::memory:";
    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("applies migrations in the nodejs runtime", async () => {
    const { register } = await import("./instrumentation");
    await register();
    expect(await tables()).toEqual(
      expect.arrayContaining(["users", "__drizzle_migrations"]),
    );
  });

  it("does not migrate during next build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    const { register } = await import("./instrumentation");
    await register();
    expect(await tables()).not.toContain("users");
  });

  it("does not migrate in the edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { register } = await import("./instrumentation");
    await register();
    expect(await tables()).not.toContain("users");
  });
});
