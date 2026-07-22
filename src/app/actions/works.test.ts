import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  importWork: vi.fn(),
  upsertWorkFromHit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/catalog/works", () => ({
  createManualWork: vi.fn(),
  importWork: mocks.importWork,
  upsertWorkFromHit: mocks.upsertWorkFromHit,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { importHitAction } from "./works";

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
