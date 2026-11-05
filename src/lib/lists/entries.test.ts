import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { migratedTestDb } from "@/test/db";

let parseScore: typeof import("./entries").parseScore;
let normalizeEntryInput: typeof import("./entries").normalizeEntryInput;
let listLibraryEntries: typeof import("./entries").listLibraryEntries;
let addListEntry: typeof import("./entries").addListEntry;
let createManualWork: typeof import("@/lib/catalog/works").createManualWork;
let database: typeof import("@/lib/db").db;

beforeAll(async () => {
  // Real schema: CHECKs and indexes from `drizzle/`, not hand-written DDL.
  const dbModule = await migratedTestDb();
  const [entriesModule, worksModule] = await Promise.all([
    import("./entries"),
    import("@/lib/catalog/works"),
  ]);

  parseScore = entriesModule.parseScore;
  normalizeEntryInput = entriesModule.normalizeEntryInput;
  listLibraryEntries = entriesModule.listLibraryEntries;
  addListEntry = entriesModule.addListEntry;
  createManualWork = worksModule.createManualWork;
  database = dbModule.db;

  database.run(sql`
    insert into users (id, email, username, display_name)
    values ('user-domain', 'domain@example.com', 'domainuser', 'Domain User')
  `);
});

describe("parseScore", () => {
  it.each(["", null, undefined])("returns null for %s", (raw) => {
    expect(parseScore(raw)).toBeNull();
  });

  it.each([1, "7", 10])("accepts integer scores from 1 to 10", (raw) => {
    expect(parseScore(raw)).toBe(Number(raw));
  });

  it.each([0, 11, 1.5, "not-a-score"])("rejects invalid scores", (raw) => {
    expect(() => parseScore(raw)).toThrow("score must be 1-10");
  });
});

describe("normalizeEntryInput", () => {
  it("uses episode progress for anime and series", () => {
    expect(
      normalizeEntryInput("anime", {
        status: "in_progress",
        score: "8",
        progressValue: "4",
      }),
    ).toMatchObject({
      status: "in_progress",
      score: 8,
      progressValue: 4,
      progressUnit: "episodes",
    });
  });

  it("removes numeric progress from movies", () => {
    expect(
      normalizeEntryInput("movie", {
        status: "completed",
        score: "",
        progressValue: "99",
        progressUnit: "pages",
      }),
    ).toMatchObject({
      score: null,
      progressValue: 0,
      progressUnit: null,
    });
  });

  it.each(["book", "manga", "comic"] as const)(
    "accepts chapter or page progress for %s",
    (type) => {
      expect(
        normalizeEntryInput(type, {
          status: "plan",
          progressValue: "12",
          progressUnit: "pages",
        }),
      ).toMatchObject({
        progressValue: 12,
        progressUnit: "pages",
      });
    },
  );

  it("rejects negative or fractional progress", () => {
    expect(() =>
      normalizeEntryInput("series", {
        status: "in_progress",
        progressValue: "-1",
      }),
    ).toThrow("progress must be an integer between 0 and 100000");
    expect(() =>
      normalizeEntryInput("book", {
        status: "in_progress",
        progressValue: "1.5",
        progressUnit: "chapters",
      }),
    ).toThrow("progress must be an integer between 0 and 100000");
  });

  it("rejects progress values outside the safe integer range", () => {
    expect(() =>
      normalizeEntryInput("series", {
        status: "in_progress",
        progressValue: "1e21",
      }),
    ).toThrow("progress must be an integer between 0 and 100000");
  });

  it("treats a zero catalog total as unknown instead of a hard cap", () => {
    expect(
      normalizeEntryInput(
        "series",
        { status: "in_progress", progressValue: "3" },
        { episodesTotal: 0 },
      ).progressValue,
    ).toBe(3);
  });

  it("rejects invalid reading progress units", () => {
    expect(() =>
      normalizeEntryInput("book", {
        status: "in_progress",
        progressValue: "1",
        progressUnit: "episodes",
      }),
    ).toThrow("progress unit must be chapters or pages");
  });

  it("rejects notes longer than 500 characters", () => {
    expect(() =>
      normalizeEntryInput("movie", {
        status: "plan",
        notes: "x".repeat(501),
      }),
    ).toThrow("notes must be at most 500 characters");
  });

  it("enforces the total for the selected progress unit", () => {
    const totals = { chaptersTotal: 12, pagesTotal: 300 };

    expect(() =>
      normalizeEntryInput(
        "book",
        {
          status: "in_progress",
          progressValue: "13",
          progressUnit: "chapters",
        },
        totals,
      ),
    ).toThrow("progress cannot exceed 12 chapters");
    expect(
      normalizeEntryInput(
        "book",
        {
          status: "in_progress",
          progressValue: "13",
          progressUnit: "pages",
        },
        totals,
      ),
    ).toMatchObject({ progressValue: 13, progressUnit: "pages" });
  });
});

describe("listLibraryEntries domain filter", () => {
  it('returns only audiovisual works when domain is "audiovisual"', async () => {
    const movie = await createManualWork({ type: "movie", title: "AV Movie", createdBy: "user-domain" });
    const book = await createManualWork({ type: "book", title: "Reading Book", createdBy: "user-domain" });

    await addListEntry("user-domain", movie.id, { status: "plan" });
    await addListEntry("user-domain", book.id, {
      status: "plan",
      progressValue: 0,
      progressUnit: "pages",
    });

    const rows = await listLibraryEntries("user-domain", {
      domain: "audiovisual",
    });

    expect(rows.map((row) => row.work.type)).toEqual(["movie"]);
    expect(rows.map((row) => row.work.title)).toEqual(["AV Movie"]);
  });
});
