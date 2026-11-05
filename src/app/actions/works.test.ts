import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createManualWork: vi.fn(),
  importWork: vi.fn(),
  upsertWorkFromHit: vi.fn(),
  checkRateLimit: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/db", () => ({
  db: { query: { users: { findFirst: mocks.findUser } } },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/catalog/works", () => ({
  createManualWork: mocks.createManualWork,
  importWork: mocks.importWork,
  upsertWorkFromHit: mocks.upsertWorkFromHit,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { createManualWorkAction, importHitAction } from "./works";

describe("importHitAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: "reader@example.com" } });
    mocks.findUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockReturnValue({ ok: true });
    mocks.importWork.mockResolvedValue({ id: "server-work" });
    mocks.upsertWorkFromHit.mockResolvedValue({ id: "client-work" });
  });

  it("resolves provider metadata server-side instead of trusting the form", async () => {
    const formData = new FormData();
    formData.set("source", "tmdb");
    formData.set("externalId", "438631");
    formData.set("title", "Forged title");
    formData.set("type", "book");
    formData.set("year", "1900");
    formData.set("coverUrl", "https://evil.example/cover.jpg");

    await expect(importHitAction(formData)).rejects.toThrow(
      "REDIRECT:/title/server-work",
    );
    expect(mocks.importWork).toHaveBeenCalledWith("tmdb", "438631");
    expect(mocks.upsertWorkFromHit).not.toHaveBeenCalled();
  });

  it("limits imports per user, not per IP", async () => {
    const formData = new FormData();
    formData.set("source", "tmdb");
    formData.set("externalId", "438631");

    await expect(importHitAction(formData)).rejects.toThrow(
      "REDIRECT:/title/server-work",
    );
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("import:user:user-1", {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
  });

  it("refuses imports over the hourly limit with a retry hint", async () => {
    mocks.checkRateLimit.mockReturnValue({ ok: false, retryAfterSec: 1500 });
    const formData = new FormData();
    formData.set("source", "tmdb");
    formData.set("externalId", "438631");

    await expect(importHitAction(formData)).rejects.toMatchObject({
      code: "rateLimited",
      params: { minutes: 25 },
    });
    expect(mocks.importWork).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated imports before mutating the catalog", async () => {
    mocks.auth.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("source", "tmdb");
    formData.set("externalId", "438631");
    formData.set("title", "Forged title");

    await expect(importHitAction(formData)).rejects.toThrow("REDIRECT:/login");
    expect(mocks.importWork).not.toHaveBeenCalled();
    expect(mocks.upsertWorkFromHit).not.toHaveBeenCalled();
  });
});

describe("createManualWorkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: "reader@example.com" } });
    mocks.findUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockReturnValue({ ok: true });
  });

  function manualForm(fields: Record<string, string>) {
    const formData = new FormData();
    formData.set("locale", "en");
    formData.set("type", "book");
    formData.set("title", "Dune");
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    return formData;
  }

  it("returns a translated error instead of throwing on bad input", async () => {
    const state = await createManualWorkAction(
      { error: null },
      manualForm({ coverUrl: "http://example.com/cover.jpg" }),
    );

    expect(state.error).toMatch(/https:\/\//);
    expect(mocks.createManualWork).not.toHaveBeenCalled();
  });

  it("passes the user id as createdBy", async () => {
    mocks.createManualWork.mockResolvedValue({ id: "work-1", reused: false });

    await expect(
      createManualWorkAction({ error: null }, manualForm({})),
    ).rejects.toThrow("REDIRECT:/en/title/work-1");
    expect(mocks.createManualWork).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "user-1" }),
    );
  });

  it("returns the translated quota error with the retry hint", async () => {
    const { FormInputError } = await import("@/lib/form-error");
    mocks.createManualWork.mockRejectedValue(
      new FormInputError("manualQuotaExceeded", "quota", { max: 20, hours: 5 }),
    );

    const state = await createManualWorkAction({ error: null }, manualForm({}));

    expect(state.error).toBe(
      "You have reached the limit of 20 manual works per day. Try again in 5 h.",
    );
  });

  it("redirects to the new title in the form's locale", async () => {
    mocks.createManualWork.mockResolvedValue({ id: "work-1" });

    await expect(
      createManualWorkAction({ error: null }, manualForm({})),
    ).rejects.toThrow("REDIRECT:/en/title/work-1");
  });
});
