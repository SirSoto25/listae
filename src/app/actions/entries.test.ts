import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_FORM_STATE } from "@/lib/form-error";
import { migratedTestDb } from "@/test/db";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

let database: typeof import("@/lib/db").db;
let addToList: typeof import("./entries").addToList;
let updateEntry: typeof import("./entries").updateEntry;
let createManualWork: typeof import("@/lib/catalog/works").createManualWork;
let workId: string;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeAll(async () => {
  database = (await migratedTestDb()).db;
  ({ addToList, updateEntry } = await import("./entries"));
  ({ createManualWork } = await import("@/lib/catalog/works"));
  database.run(sql`
    insert into users (id, email, username, display_name)
    values ('user-actions', 'actions@example.com', 'actionsuser', 'Actions')
  `);
  workId = (await createManualWork({ type: "movie", title: "Action Movie", createdBy: "user-actions" })).id;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "actions@example.com" } });
});

describe("addToList", () => {
  it("returns a translated error for an out-of-range score", async () => {
    const state = await addToList(
      INITIAL_FORM_STATE,
      form({ workId, status: "completed", score: "11", locale: "es" }),
    );
    expect(state).toEqual({
      error: "La puntuación debe ser un número entero del 1 al 10.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves a valid entry and redirects to the title with saved=1", async () => {
    await expect(
      addToList(INITIAL_FORM_STATE, form({ workId, status: "completed", score: "8" })),
    ).rejects.toThrow(`NEXT_REDIRECT:/es/title/${workId}?saved=1`);
    const row = database.get<{ score: number }>(
      sql`select score from list_entries where work_id = ${workId}`,
    );
    expect(row.score).toBe(8);
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("falls back to the default path when returnPath is malicious", async () => {
    await expect(
      addToList(
        INITIAL_FORM_STATE,
        form({
          workId,
          status: "completed",
          returnPath: "https://evil.example/phish",
          locale: "en",
        }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/en/title/${workId}?saved=1`);
  });

  it("honours a safe returnPath", async () => {
    await expect(
      addToList(
        INITIAL_FORM_STATE,
        form({ workId, status: "completed", returnPath: "/en/library" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/en/library");
  });

  it("redirects to /login without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(
      addToList(INITIAL_FORM_STATE, form({ workId, status: "planned" })),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /login when the session email has no user", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "ghost@example.com" } });
    await expect(
      addToList(INITIAL_FORM_STATE, form({ workId, status: "planned" })),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("rejects a non-existent work instead of redirecting to success", async () => {
    const outcome = await addToList(
      INITIAL_FORM_STATE,
      form({ workId: "does-not-exist", status: "planned" }),
    ).then(
      () => "resolved",
      (error: Error) => error.message,
    );
    expect(outcome).not.toMatch(/^NEXT_REDIRECT/);
    expect(outcome).not.toBe("resolved");
  });
});

describe("updateEntry", () => {
  it("rejects when the entry does not exist (current behaviour)", async () => {
    const other = await createManualWork({ type: "book", title: "No entry", createdBy: "user-actions" });
    await expect(
      updateEntry(INITIAL_FORM_STATE, form({ workId: other.id, status: "completed" })),
    ).rejects.toThrow("list entry not found");
  });
});
