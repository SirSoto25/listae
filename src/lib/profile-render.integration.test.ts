import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { migratedTestDb } from "@/test/db";

let database: typeof import("@/lib/db").db;
let createManualWork: typeof import("@/lib/catalog/works").createManualWork;
let addListEntry: typeof import("@/lib/lists/entries").addListEntry;
let listLibraryEntries: typeof import("@/lib/lists/entries").listLibraryEntries;
let renderTheme: typeof import("@/lib/theme/render").renderTheme;
let buildThemeDocument: typeof import("@/lib/theme/save").buildThemeDocument;
let syncTranslator: typeof import("@/lib/i18n/sync-dictionary").syncTranslator;

beforeAll(async () => {
  // Real schema: CHECKs and indexes from `drizzle/`, not hand-written DDL.
  database = (await migratedTestDb()).db;
  ({ createManualWork } = await import("@/lib/catalog/works"));
  ({ addListEntry, listLibraryEntries } = await import("@/lib/lists/entries"));
  ({ renderTheme } = await import("@/lib/theme/render"));
  ({ buildThemeDocument } = await import("@/lib/theme/save"));
  ({ syncTranslator } = await import("@/lib/i18n/sync-dictionary"));

});

describe("manual work to themed profile render", () => {
  it("renders the saved entry and rejects invalid profile CSS", async () => {
    database.run(sql`
      insert into users (id, email, username, display_name)
      values ('user-1', 'reader@example.com', 'reader', 'Reader One')
    `);
    database.run(sql`
      insert into profile_themes (id, user_id, html_template, custom_css)
      values (
        'theme-1',
        'user-1',
        '<main><h1>{{username}}</h1>{{lists}}</main>',
        'body { color: rebeccapurple; }'
      )
    `);

    const work = await createManualWork({
      type: "book",
      title: "Manual Odyssey",
      createdBy: "user-1",
      pagesTotal: 300,
    });
    await addListEntry("user-1", work.id, {
      status: "in_progress",
      score: 9,
      progressValue: 120,
      progressUnit: "pages",
    });

    const rows = await listLibraryEntries("user-1");
    const theme = database.get<{
      htmlTemplate: string;
      customCss: string;
    }>(sql`
      select html_template as htmlTemplate, custom_css as customCss
      from profile_themes where user_id = 'user-1'
    `)!;
    const rendered = renderTheme({
      template: theme.htmlTemplate,
      css: theme.customCss,
      username: "reader",
      displayName: "Reader One",
      entries: rows.map(({ entry, work: savedWork }) => ({
        title: savedWork.title,
        type: savedWork.type,
        status: entry.status,
        score: entry.score,
        progress: `${entry.progressValue} / ${savedWork.pagesTotal} pages`,
        cover: savedWork.coverUrl,
        url: `/title/${savedWork.id}`,
      })),
      t: syncTranslator("en"),
    });

    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      return;
    }
    const document = buildThemeDocument(rendered.html, rendered.css);
    expect(document).toContain("reader");
    expect(document).toContain("Manual Odyssey");
    expect(document).toContain("Score: 9");

    const invalid = renderTheme({
      template: theme.htmlTemplate,
      css: `@import url("https://fonts.googleapis.com/css2?family=Inter");@import url("https://evil.example/x.css");`,
      username: "reader",
      displayName: "Reader One",
      entries: [],
      t: syncTranslator("en"),
    });
    expect(invalid).toMatchObject({
      ok: false,
      errors: [
        {
          line: 1,
          snippet: `@import url("https://evil.example/x.css");`,
        },
      ],
    });
  });
});
