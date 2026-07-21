import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

let database: typeof import("@/lib/db").db;
let createManualWork: typeof import("./works").createManualWork;
let upsertWorkFromHit: typeof import("./works").upsertWorkFromHit;

beforeAll(async () => {
  process.env.DATABASE_URL = "file::memory:";

  const [worksModule, dbModule] = await Promise.all([
    import("./works"),
    import("@/lib/db"),
  ]);

  database = dbModule.db;
  ({ createManualWork, upsertWorkFromHit } = worksModule);
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
    create unique index works_external_source_external_id_unique
    on works (external_source, external_id)
    where external_source is not null and external_id is not null
  `);
});

describe("work helpers", () => {
  it("reuses a work with the same provider identity", async () => {
    const hit = {
      source: "tmdb" as const,
      externalId: "438631",
      type: "movie" as const,
      title: "Dune",
      year: 2021,
    };

    const first = await upsertWorkFromHit(hit);
    const second = await upsertWorkFromHit({ ...hit, title: "Dune: Part One" });

    expect(second.id).toBe(first.id);
    expect(
      database.get<{ title: string }>(
        sql`select title from works where id = ${first.id}`,
      )?.title,
    ).toBe("Dune: Part One");
  });

  it("creates independent manual works", async () => {
    const first = await createManualWork({ type: "book", title: "My Book" });
    const second = await createManualWork({ type: "book", title: "My Book" });

    expect(second.id).not.toBe(first.id);
  });
});
