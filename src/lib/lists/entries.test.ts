import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

let parseScore: typeof import("./entries").parseScore;
let normalizeEntryInput: typeof import("./entries").normalizeEntryInput;
let listLibraryEntries: typeof import("./entries").listLibraryEntries;
let addListEntry: typeof import("./entries").addListEntry;
let createManualWork: typeof import("@/lib/catalog/works").createManualWork;
let database: typeof import("@/lib/db").db;

beforeAll(async () => {
  process.env.DATABASE_URL = "file::memory:";

  const [entriesModule, dbModule, worksModule] = await Promise.all([
    import("./entries"),
    import("@/lib/db"),
    import("@/lib/catalog/works"),
  ]);

  parseScore = entriesModule.parseScore;
  normalizeEntryInput = entriesModule.normalizeEntryInput;
  listLibraryEntries = entriesModule.listLibraryEntries;
  addListEntry = entriesModule.addListEntry;
  createManualWork = worksModule.createManualWork;
  database = dbModule.db;

  database.run(sql`
    create table users (
      id text primary key,
      email text not null unique,
      username text unique,
      display_name text
    )
  `);
  database.run(sql`
    create table works (
      id text primary key,
      type text not null,
      title text not null,
      original_title text,
      cover_url text,
      year integer,
      synopsis text,
      external_source text,
      external_id text,
      episodes_total integer,
      chapters_total integer,
      pages_total integer,
      created_at integer not null default (unixepoch())
    )
  `);
  database.run(sql`
    create table list_entries (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      work_id text not null references works(id) on delete cascade,
      status text not null,
      score integer,
      progress_value integer not null default 0,
      progress_unit text,
      notes text,
      started_at integer,
      finished_at integer,
      updated_at integer not null default (unixepoch()),
      unique(user_id, work_id)
    )
  `);
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
    ).toThrow("progress must be a non-negative integer");
    expect(() =>
      normalizeEntryInput("book", {
        status: "in_progress",
        progressValue: "1.5",
        progressUnit: "chapters",
      }),
    ).toThrow("progress must be a non-negative integer");
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
    const movie = await createManualWork({ type: "movie", title: "AV Movie" });
    const book = await createManualWork({ type: "book", title: "Reading Book" });

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
