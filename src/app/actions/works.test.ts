import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createManualWork: vi.fn(),
  importWork: vi.fn(),
  upsertWorkFromHit: vi.fn(),
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

  it("redirects to the new title in the form's locale", async () => {
    mocks.createManualWork.mockResolvedValue({ id: "work-1" });

    await expect(
      createManualWorkAction({ error: null }, manualForm({})),
    ).rejects.toThrow("REDIRECT:/en/title/work-1");
  });
});
