import { randomBytes } from "node:crypto";

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
    vi.unstubAllEnvs();
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

  it("refuses to start in production with an insecure auth env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // A strong secret of its own: the only problem left must be AUTH_URL, no
    // matter what AUTH_SECRET the surrounding environment (e.g. CI) defines.
    process.env.AUTH_SECRET = randomBytes(32).toString("base64");
    process.env.AUTH_URL = "http://listae.example";
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { register } = await import("./instrumentation");
    await expect(register()).rejects.toThrow(/AUTH_URL/);
    // `next start` only logs a failing instrumentation hook and keeps serving.
    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/AUTH_URL/));
    expect(await tables()).not.toContain("users");
    exit.mockRestore();
    error.mockRestore();
  });

  it("does not validate the auth env during next build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.AUTH_SECRET = "build-only-secret";
    delete process.env.AUTH_URL;
    const { register } = await import("./instrumentation");
    await expect(register()).resolves.toBeUndefined();
  });

  it("does not migrate in the edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { register } = await import("./instrumentation");
    await register();
    expect(await tables()).not.toContain("users");
  });
});
