import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { migratedTestDb } from "@/test/db";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "../defaults";
import { upsertDomainVarsBlock } from "../domain-vars";
import {
  LEGACY_DEFAULT_CSS,
  LEGACY_DEFAULT_HTML_TEMPLATE,
  upgradeLegacyDefaultTheme,
  upgradeLegacyDefaultThemes,
} from "../legacy-defaults";
import { sanitizeThemeHtml } from "../sanitize-html";

const CUSTOM_COLORS = {
  audiovisual: { bg: "#102030", accent: "#ffcc00", fg: "#ffffff" },
  reading: { bg: "#203010", accent: "#00ccff", fg: "#eeeeee" },
};

describe("upgradeLegacyDefaultTheme", () => {
  it("upgrades the exact previous default to the new default", () => {
    expect(
      upgradeLegacyDefaultTheme({
        htmlTemplate: LEGACY_DEFAULT_HTML_TEMPLATE,
        customCss: LEGACY_DEFAULT_CSS,
      }),
    ).toEqual({ htmlTemplate: DEFAULT_HTML_TEMPLATE, customCss: DEFAULT_CSS });
  });

  it("is recognized after the save pipeline sanitized the template or the browser sent CRLF", () => {
    const sanitized = upgradeLegacyDefaultTheme({
      htmlTemplate: sanitizeThemeHtml(LEGACY_DEFAULT_HTML_TEMPLATE),
      customCss: LEGACY_DEFAULT_CSS,
    });
    const crlf = upgradeLegacyDefaultTheme({
      htmlTemplate: LEGACY_DEFAULT_HTML_TEMPLATE.replace(/\n/g, "\r\n"),
      customCss: LEGACY_DEFAULT_CSS.replace(/\n/g, "\r\n"),
    });

    expect(sanitized).toEqual({
      htmlTemplate: DEFAULT_HTML_TEMPLATE,
      customCss: DEFAULT_CSS,
    });
    expect(crlf).toEqual(sanitized);
  });

  it("keeps the user's domain colors when only the colors changed", () => {
    const result = upgradeLegacyDefaultTheme({
      htmlTemplate: LEGACY_DEFAULT_HTML_TEMPLATE,
      customCss: upsertDomainVarsBlock(LEGACY_DEFAULT_CSS, CUSTOM_COLORS),
    });

    expect(result).toEqual({
      htmlTemplate: DEFAULT_HTML_TEMPLATE,
      customCss: upsertDomainVarsBlock(DEFAULT_CSS, CUSTOM_COLORS),
    });
    expect(result!.customCss).toContain("#ffcc00");
    expect(result!.customCss).toContain("table-layout: auto");
  });

  it("upgrades only the CSS when the HTML was customized", () => {
    const html = `${LEGACY_DEFAULT_HTML_TEMPLATE}\n<p>mine</p>`;

    expect(
      upgradeLegacyDefaultTheme({
        htmlTemplate: html,
        customCss: LEGACY_DEFAULT_CSS,
      }),
    ).toEqual({ htmlTemplate: html, customCss: DEFAULT_CSS });
  });

  it("upgrades only the HTML when the CSS was customized", () => {
    const css = `${LEGACY_DEFAULT_CSS}\n.mine { color: red; }`;

    expect(
      upgradeLegacyDefaultTheme({
        htmlTemplate: LEGACY_DEFAULT_HTML_TEMPLATE,
        customCss: css,
      }),
    ).toEqual({ htmlTemplate: DEFAULT_HTML_TEMPLATE, customCss: css });
  });

  it("returns null when both were customized, or the theme is already current", () => {
    expect(
      upgradeLegacyDefaultTheme({
        htmlTemplate: "<h1>{{displayName}}</h1>{{lists}}",
        customCss: "h1 { color: navy; }",
      }),
    ).toBeNull();
    expect(
      upgradeLegacyDefaultTheme({
        htmlTemplate: DEFAULT_HTML_TEMPLATE,
        customCss: DEFAULT_CSS,
      }),
    ).toBeNull();
  });
});

describe("upgradeLegacyDefaultThemes", () => {
  let database: typeof import("@/lib/db").db;
  let profileThemes: typeof import("@/lib/db/schema").profileThemes;
  let upgrade: typeof upgradeLegacyDefaultThemes;

  const themeOf = (userId: string) =>
    database.query.profileThemes.findFirst({
      where: eq(profileThemes.userId, userId),
    });

  const backups = () =>
    database.all<{
      user_id: string;
      html_template: string;
      custom_css: string;
      backed_up_at: number;
    }>(sql`select * from profile_themes_upgrade_backup order by user_id`);

  beforeAll(async () => {
    const dbModule = await migratedTestDb();
    database = dbModule.db;
    profileThemes = (await import("@/lib/db/schema")).profileThemes;
    upgrade = (await import("../legacy-defaults")).upgradeLegacyDefaultThemes;

    const themes = [
      ["u-exact", LEGACY_DEFAULT_HTML_TEMPLATE, LEGACY_DEFAULT_CSS],
      [
        "u-colors",
        LEGACY_DEFAULT_HTML_TEMPLATE,
        upsertDomainVarsBlock(LEGACY_DEFAULT_CSS, CUSTOM_COLORS),
      ],
      ["u-custom", "<h1>{{displayName}}</h1>{{lists}}", "h1 { color: navy; }"],
      ["u-new", DEFAULT_HTML_TEMPLATE, DEFAULT_CSS],
    ] as const;
    for (const [id, html, css] of themes) {
      database.run(sql`
        insert into users (id, email, username, display_name)
        values (${id}, ${id + "@example.com"}, ${id.replace("-", "")}, ${id})
      `);
      database.run(sql`
        insert into profile_themes (id, user_id, html_template, custom_css)
        values (${"theme-" + id}, ${id}, ${html}, ${css})
      `);
    }
  });

  it("backs up and upgrades only exact legacy defaults, and is idempotent", async () => {
    expect(upgrade(database)).toBe(2);

    const exact = await themeOf("u-exact");
    expect(exact).toMatchObject({
      htmlTemplate: DEFAULT_HTML_TEMPLATE,
      customCss: DEFAULT_CSS,
    });
    const colors = await themeOf("u-colors");
    expect(colors!.htmlTemplate).toBe(DEFAULT_HTML_TEMPLATE);
    expect(colors!.customCss).toBe(
      upsertDomainVarsBlock(DEFAULT_CSS, CUSTOM_COLORS),
    );
    expect(await themeOf("u-custom")).toMatchObject({
      htmlTemplate: "<h1>{{displayName}}</h1>{{lists}}",
      customCss: "h1 { color: navy; }",
    });
    expect(await themeOf("u-new")).toMatchObject({
      htmlTemplate: DEFAULT_HTML_TEMPLATE,
      customCss: DEFAULT_CSS,
    });

    const saved = backups();
    expect(saved.map((row) => row.user_id)).toEqual(["u-colors", "u-exact"]);
    expect(saved.find((row) => row.user_id === "u-exact")).toMatchObject({
      html_template: LEGACY_DEFAULT_HTML_TEMPLATE,
      custom_css: LEGACY_DEFAULT_CSS,
    });
    expect(saved.find((row) => row.user_id === "u-colors")!.custom_css).toContain(
      "#ffcc00",
    );

    expect(upgrade(database)).toBe(0);
    expect(backups()).toHaveLength(2);
  });
});
