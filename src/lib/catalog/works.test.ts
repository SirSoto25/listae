import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { migratedTestDb } from "@/test/db";

const mocks = vi.hoisted(() => ({
  resolveCatalogHit: vi.fn(),
}));

vi.mock("./search", () => ({
  resolveCatalogHit: mocks.resolveCatalogHit,
}));

let database: typeof import("@/lib/db").db;
let createManualWork: typeof import("./works").createManualWork;
let importWork: typeof import("./works").importWork;
let upsertWorkFromHit: typeof import("./works").upsertWorkFromHit;
let fillMissingWorkLocale: typeof import("./works").fillMissingWorkLocale;

function seedUser(id: string) {
  database.run(
    sql`insert or ignore into users (id, email) values (${id}, ${`${id}@example.com`})`,
  );
}

beforeAll(async () => {
  // Real schema: CHECKs and indexes from `drizzle/`, not hand-written DDL.
  database = (await migratedTestDb()).db;
  const worksModule = await import("./works");

  ({ createManualWork, importWork, upsertWorkFromHit, fillMissingWorkLocale } =
    worksModule);
});

describe("work helpers", () => {
  it("reuses a work with the same provider identity", async () => {
    const hit = {
      source: "tmdb" as const,
      externalId: "438631",
      type: "movie" as const,
      title: "Dune",
      titleEn: "Dune",
      year: 2021,
    };

    const first = await upsertWorkFromHit(hit);
    const second = await upsertWorkFromHit({
      ...hit,
      title: "Dune: Part One",
      titleEn: "Dune: Part One",
    });

    expect(second.id).toBe(first.id);
    expect(
      database.get<{ title: string }>(
        sql`select title from works where id = ${first.id}`,
      )?.title,
    ).toBe("Dune");
  });

  it("persists bilingual fields on first import", async () => {
    const hit = {
      source: "tmdb" as const,
      externalId: "movie:438631",
      type: "movie" as const,
      title: "Dune",
      titleEs: "Duna",
      titleEn: "Dune",
      synopsisEs: "Sinopsis ES",
      synopsisEn: "Synopsis EN",
      synopsis: "Synopsis EN",
      year: 2021,
    };

    const inserted = await upsertWorkFromHit(hit);

    expect(
      database.get<{
        title: string;
        titleEs: string | null;
        titleEn: string | null;
        synopsisEn: string | null;
      }>(
        sql`select title, title_es as titleEs, title_en as titleEn, synopsis_en as synopsisEn
            from works where id = ${inserted.id}`,
      ),
    ).toEqual({
      title: "Dune",
      titleEs: "Duna",
      titleEn: "Dune",
      synopsisEn: "Synopsis EN",
    });
  });

  it("reuses the caller's manual work with the same type, title and year", async () => {
    seedUser("u-dedupe");
    const first = await createManualWork({
      type: "book",
      title: "My Book",
      year: 2020,
      createdBy: "u-dedupe",
    });
    const second = await createManualWork({
      type: "book",
      title: "  my book ",
      year: 2020,
      createdBy: "u-dedupe",
    });

    expect(first.reused).toBe(false);
    expect(second).toEqual({ id: first.id, reused: true });
  });

  it("creates separate works for different users or years", async () => {
    seedUser("u-a");
    seedUser("u-b");
    const a = await createManualWork({ type: "book", title: "Shared", createdBy: "u-a" });
    const b = await createManualWork({ type: "book", title: "Shared", createdBy: "u-b" });
    const a2 = await createManualWork({ type: "book", title: "Shared", year: 1999, createdBy: "u-a" });

    expect(new Set([a.id, b.id, a2.id]).size).toBe(3);
  });

  it("stores created_by on the new row", async () => {
    seedUser("u-owner");
    const { id } = await createManualWork({ type: "movie", title: "Owned", createdBy: "u-owner" });

    expect(
      database.get<{ createdBy: string }>(
        sql`select created_by as createdBy from works where id = ${id}`,
      )?.createdBy,
    ).toBe("u-owner");
  });

  it.each([
    ["titleTooLong", { title: "x".repeat(301) }, 300],
    ["originalTitleTooLong", { originalTitle: "x".repeat(301) }, 300],
    ["synopsisTooLong", { synopsis: "x".repeat(5001) }, 5000],
    ["coverUrlTooLong", { coverUrl: `https://e.com/${"x".repeat(490)}` }, 500],
  ])("rejects over-long input with %s", async (code, extra, max) => {
    seedUser("u-long");
    await expect(
      createManualWork({ type: "book", title: "T", createdBy: "u-long", ...extra }),
    ).rejects.toMatchObject({ code, params: { max } });
  });

  it("accepts input exactly at the limits", async () => {
    seedUser("u-limit");
    await expect(
      createManualWork({
        type: "book",
        title: "x".repeat(300),
        synopsis: "y".repeat(5000),
        createdBy: "u-limit",
      }),
    ).resolves.toMatchObject({ reused: false });
  });

  it("refuses the 21st manual work within a day and says when to retry", async () => {
    seedUser("u-daily");
    for (let i = 0; i < 20; i++) {
      await createManualWork({ type: "book", title: `Daily ${i}`, createdBy: "u-daily" });
    }
    await expect(
      createManualWork({ type: "book", title: "Daily 20", createdBy: "u-daily" }),
    ).rejects.toMatchObject({
      code: "manualQuotaExceeded",
      params: { max: 20, hours: 24 },
    });
    // A duplicate is reused instead of counting against the quota.
    await expect(
      createManualWork({ type: "book", title: "Daily 3", createdBy: "u-daily" }),
    ).resolves.toMatchObject({ reused: true });
    // Another user is unaffected.
    seedUser("u-other");
    await expect(
      createManualWork({ type: "book", title: "Daily 0", createdBy: "u-other" }),
    ).resolves.toMatchObject({ reused: false });
  });

  it("forgets works older than a day for the daily quota", async () => {
    seedUser("u-old");
    for (let i = 0; i < 20; i++) {
      await createManualWork({ type: "book", title: `Old ${i}`, createdBy: "u-old" });
    }
    database.run(
      sql`update works set created_at = unixepoch() - 90000 where created_by = 'u-old'`,
    );
    await expect(
      createManualWork({ type: "book", title: "Fresh", createdBy: "u-old" }),
    ).resolves.toMatchObject({ reused: false });
  });

  it("refuses works beyond the per-user total of 500", async () => {
    seedUser("u-total");
    for (let i = 0; i < 500; i++) {
      database.run(
        sql`insert into works (id, type, title, external_source, created_by, created_at)
            values (${`bulk-${i}`}, 'book', ${`Bulk ${i}`}, 'manual', 'u-total', unixepoch() - 200000)`,
      );
    }
    await expect(
      createManualWork({ type: "book", title: "One more", createdBy: "u-total" }),
    ).rejects.toMatchObject({
      code: "manualTotalQuotaExceeded",
      params: { max: 500 },
    });
  });

  it("imports metadata resolved by the provider", async () => {
    mocks.resolveCatalogHit.mockResolvedValue({
      source: "openlibrary",
      externalId: "OL123W",
      type: "book",
      title: "Canonical title",
      titleEn: "Canonical title",
      titleEs: "Título canónico",
      year: 2024,
      pagesTotal: 250,
    });

    const imported = await importWork("openlibrary", "OL123W");

    expect(mocks.resolveCatalogHit).toHaveBeenCalledWith(
      "openlibrary",
      "OL123W",
    );
    expect(
      database.get<{
        title: string;
        titleEs: string | null;
        year: number;
        pagesTotal: number;
      }>(
        sql`select title, title_es as titleEs, year, pages_total as pagesTotal
            from works where id = ${imported.id}`,
      ),
    ).toEqual({
      title: "Canonical title",
      titleEs: "Título canónico",
      year: 2024,
      pagesTotal: 250,
    });
  });

  it("asks the provider for a missing translation only once", async () => {
    const hit = {
      source: "openlibrary" as const,
      externalId: "OL-NO-ES-W",
      type: "book" as const,
      title: "Only English",
      titleEn: "Only English",
    };
    const { id } = await upsertWorkFromHit(hit);
    mocks.resolveCatalogHit.mockReset();
    mocks.resolveCatalogHit.mockResolvedValue(hit);

    await fillMissingWorkLocale(id, "es");
    await fillMissingWorkLocale(id, "es");

    expect(mocks.resolveCatalogHit).toHaveBeenCalledTimes(1);
  });
});
