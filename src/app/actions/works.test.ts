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

  function importForm(fields: Record<string, string> = {}) {
    const formData = new FormData();
    formData.set("source", "tmdb");
    formData.set("externalId", "438631");
    formData.set("locale", "es");
    formData.set("returnTo", "/es?q=dune");
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    return formData;
  }

  it("resolves provider metadata server-side instead of trusting the form", async () => {
    const formData = importForm({
      title: "Forged title",
      type: "book",
      year: "1900",
      coverUrl: "https://evil.example/cover.jpg",
    });

    await expect(
      importHitAction({ error: null }, formData),
    ).rejects.toThrow("REDIRECT:/es/title/server-work");
    expect(mocks.importWork).toHaveBeenCalledWith("tmdb", "438631");
    expect(mocks.upsertWorkFromHit).not.toHaveBeenCalled();
  });

  it("redirects to the title in the form's locale", async () => {
    await expect(
      importHitAction({ error: null }, importForm({ locale: "en" })),
    ).rejects.toThrow("REDIRECT:/en/title/server-work");
  });

  it("falls back to the default locale when the locale field is forged", async () => {
    await expect(
      importHitAction({ error: null }, importForm({ locale: "fr" })),
    ).rejects.toThrow("REDIRECT:/es/title/server-work");
  });

  it("limits imports per user, not per IP", async () => {
    await expect(
      importHitAction({ error: null }, importForm()),
    ).rejects.toThrow("REDIRECT:/es/title/server-work");
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("import:user:user-1", {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
  });

  it("returns the translated rate limit message instead of throwing", async () => {
    mocks.checkRateLimit.mockReturnValue({ ok: false, retryAfterSec: 1500 });

    const state = await importHitAction({ error: null }, importForm());

    expect(state.error).toBe(
      "Demasiadas solicitudes. Vuelve a intentarlo en 25 min.",
    );
    expect(mocks.importWork).not.toHaveBeenCalled();
  });

  it("translates the rate limit message to the form's locale", async () => {
    mocks.checkRateLimit.mockReturnValue({ ok: false, retryAfterSec: 1500 });

    const state = await importHitAction(
      { error: null },
      importForm({ locale: "en" }),
    );

    expect(state.error).toBe("Too many requests. Try again in 25 min.");
  });

  it("shows a form error when the catalog provider fails", async () => {
    mocks.importWork.mockRejectedValue(new Error("TMDB lookup failed with status 429"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const state = await importHitAction({ error: null }, importForm());

    expect(state.error).toMatch(/No se pudo importar/);
    expect(state.error).not.toMatch(/429/);
  });

  it("shows the provider failure in English for English forms", async () => {
    mocks.importWork.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const state = await importHitAction(
      { error: null },
      importForm({ locale: "en" }),
    );

    expect(state.error).toMatch(/Could not import/);
  });

  it("returns a form error for a forged catalog source", async () => {
    const state = await importHitAction(
      { error: null },
      importForm({ source: "manual" }),
    );

    expect(state.error).not.toBeNull();
    expect(mocks.importWork).not.toHaveBeenCalled();
  });

  it("sends anonymous users to login with a callback to the search", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      importHitAction({ error: null }, importForm({ title: "Forged title" })),
    ).rejects.toThrow("REDIRECT:/es/login?callbackUrl=%2Fes%3Fq%3Ddune");
    expect(mocks.importWork).not.toHaveBeenCalled();
    expect(mocks.upsertWorkFromHit).not.toHaveBeenCalled();
  });

  it("keeps the form's locale in the login redirect", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      importHitAction(
        { error: null },
        importForm({ locale: "en", returnTo: "/en?q=dune&type=movie" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/en/login?callbackUrl=%2Fen%3Fq%3Ddune%26type%3Dmovie",
    );
  });

  it.each(["https://evil.example/", "//evil.example", "/es/admin", ""])(
    "falls back to the home page for an unsafe returnTo (%j)",
    async (returnTo) => {
      mocks.auth.mockResolvedValue(null);

      await expect(
        importHitAction({ error: null }, importForm({ returnTo })),
      ).rejects.toThrow(/^REDIRECT:\/es\/login\?callbackUrl=%2Fes$/);
    },
  );
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
