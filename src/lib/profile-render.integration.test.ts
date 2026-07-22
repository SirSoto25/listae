import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

let database: typeof import("@/lib/db").db;
let createManualWork: typeof import("@/lib/catalog/works").createManualWork;
let addListEntry: typeof import("@/lib/lists/entries").addListEntry;
let listLibraryEntries: typeof import("@/lib/lists/entries").listLibraryEntries;
let renderTheme: typeof import("@/lib/theme/render").renderTheme;
let buildThemeDocument: typeof import("@/lib/theme/save").buildThemeDocument;

beforeAll(async () => {
  process.env.DATABASE_URL = "file::memory:";

  database = (await import("@/lib/db")).db;
  ({ createManualWork } = await import("@/lib/catalog/works"));
  ({ addListEntry, listLibraryEntries } = await import("@/lib/lists/entries"));
  ({ renderTheme } = await import("@/lib/theme/render"));
  ({ buildThemeDocument } = await import("@/lib/theme/save"));

  database.run(sql`
    create table users (
      id text primary key,
      email text not null unique,
      username text unique,
      display_name text
    )
  `);
  database.run(sql`
    create table profile_themes (
      id text primary key,
      user_id text not null unique references users(id) on delete cascade,
      html_template text not null,
      custom_css text not null
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
