import { eq, sql } from "drizzle-orm";

import type { db } from "@/lib/db";
import { profileThemes } from "@/lib/db/schema";

import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "./defaults";
import {
  parseDomainVarsBlock,
  upsertDomainVarsBlock,
  type DomainVarsInput,
} from "./domain-vars";
import { sanitizeThemeHtml } from "./sanitize-html";

type Database = typeof db;

export const LEGACY_DEFAULT_HTML_TEMPLATE = `
<div class="listae-profile">
  <section class="listae-profile-header">
    <h1>{{displayName}}</h1>
    <p class="listae-profile-username">@{{username}}</p>
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Audiovisual</h2>
    {{audiovisual_lists}}
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Reading</h2>
    {{reading_lists}}
  </section>
</div>
`.trim();

export const LEGACY_DEFAULT_CSS = `
:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
  background: #111827;
  color: #f9fafb;
}

body {
  margin: 0;
}

/* listae:domain-vars:start */
.listae-domain--audiovisual {
  --listae-domain-bg: #1a2238;
  --listae-domain-accent: #6b7ae8;
  --listae-domain-fg: #e8eef9;
}

.listae-domain--reading {
  --listae-domain-bg: #1c222c;
  --listae-domain-accent: #7a8a9a;
  --listae-domain-fg: #e8eef0;
}
/* listae:domain-vars:end */

.listae-profile {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 3rem 0;
}

.listae-profile-header {
  margin-bottom: 2.5rem;
}

.listae-profile-header h1,
.listae-status-title {
  margin: 0;
}

.listae-profile-username,
.listae-col-type,
.listae-col-score,
.listae-col-progress,
.listae-status-empty {
  color: #9ca3af;
}

.listae-domain-block {
  margin-top: 2.5rem;
}

.listae-domain-heading {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.listae-domain--audiovisual,
.listae-domain--reading {
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: var(--listae-domain-bg);
  color: var(--listae-domain-fg);
  border: 1px solid color-mix(in srgb, var(--listae-domain-accent) 35%, transparent);
}

.listae-domain--audiovisual .listae-status-title,
.listae-domain--reading .listae-status-title {
  color: var(--listae-domain-accent);
}

.listae-domain--audiovisual .listae-status-table td,
.listae-domain--reading .listae-status-table td {
  border-bottom-color: color-mix(in srgb, var(--listae-domain-accent) 28%, #374151);
}

.listae-domain--audiovisual .listae-entry:nth-child(even),
.listae-domain--reading .listae-entry:nth-child(even) {
  background: color-mix(in srgb, var(--listae-domain-bg) 70%, #111827);
}

.listae-domain--audiovisual .listae-entry-title,
.listae-domain--reading .listae-entry-title {
  color: var(--listae-domain-fg);
}

.listae-domain--audiovisual .listae-entry-title:hover,
.listae-domain--reading .listae-entry-title:hover {
  color: var(--listae-domain-accent);
}

.listae-status {
  margin-top: 2rem;
}

.listae-status-table {
  width: 100%;
  margin-top: 1rem;
  border-collapse: collapse;
  table-layout: fixed;
}

.listae-status-table th,
.listae-status-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #374151;
  text-align: left;
  vertical-align: middle;
}

.listae-status-table th {
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.listae-col-index {
  width: 2.5rem;
  text-align: center;
}

.listae-col-cover {
  width: 3.5rem;
}

.listae-col-score,
.listae-col-type {
  width: 6rem;
}

.listae-col-progress {
  width: 8rem;
}

.listae-entry-cover {
  display: block;
  width: 2.5rem;
  height: 3.5rem;
  border-radius: 0.25rem;
  object-fit: cover;
}

.listae-entry-title {
  overflow: hidden;
  color: #f9fafb;
  font-weight: 700;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listae-entry-title:hover {
  color: #93c5fd;
}

.listae-col-type {
  text-transform: capitalize;
}
`.trim();

/**
 * Upgrade of profiles saved with the previous default theme (T1.8).
 *
 * LEGACY_DEFAULT_* above are a literal copy of the old defaults: never edit
 * them, they are what stored themes are compared against.
 */

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

/** Raw default (`ensureProfileTheme`) and what the save pipeline stores. */
const LEGACY_HTML_FORMS = new Set(
  [LEGACY_DEFAULT_HTML_TEMPLATE, sanitizeThemeHtml(LEGACY_DEFAULT_HTML_TEMPLATE)].map(
    normalizeNewlines,
  ),
);

const LEGACY_COLORS = parseDomainVarsBlock(LEGACY_DEFAULT_CSS)!;
const CURRENT_COLORS = parseDomainVarsBlock(DEFAULT_CSS)!;

function sameColors(a: DomainVarsInput, b: DomainVarsInput): boolean {
  return (["audiovisual", "reading"] as const).every((domain) =>
    (["bg", "accent", "fg"] as const).every(
      (key) => a[domain][key].toLowerCase() === b[domain][key].toLowerCase(),
    ),
  );
}

function upgradeLegacyCss(css: string): string | null {
  const normalized = normalizeNewlines(css);
  const colors = parseDomainVarsBlock(normalized);
  if (!colors) return null;

  // Same CSS as the old default once the user's color block is put back?
  if (upsertDomainVarsBlock(normalized, LEGACY_COLORS) !== LEGACY_DEFAULT_CSS) {
    return null;
  }

  // Untouched colors move to the new (AA-contrast) ones; chosen colors stay.
  return upsertDomainVarsBlock(
    DEFAULT_CSS,
    sameColors(colors, LEGACY_COLORS) ? CURRENT_COLORS : colors,
  );
}

export type ThemeContent = { htmlTemplate: string; customCss: string };

/**
 * Only themes that still equal the previous default are touched: HTML when
 * identical, CSS when identical apart from the user's domain colors (kept).
 * Anything else, including already-current themes, returns `null`.
 */
export function upgradeLegacyDefaultTheme(
  theme: ThemeContent,
): ThemeContent | null {
  const html = LEGACY_HTML_FORMS.has(normalizeNewlines(theme.htmlTemplate))
    ? DEFAULT_HTML_TEMPLATE
    : null;
  const css = upgradeLegacyCss(theme.customCss);
  if (html === null && css === null) return null;

  return {
    htmlTemplate: html ?? theme.htmlTemplate,
    customCss: css ?? theme.customCss,
  };
}

/**
 * Startup data migration. Single transaction (`IMMEDIATE`, so a second
 * worker waits and then finds nothing left to do) that copies each row it
 * is about to change into `profile_themes_upgrade_backup` first. The table
 * is created here instead of in a Drizzle migration: it is a one-off safety
 * net, not part of the schema. Returns the number of themes upgraded.
 */
export function upgradeLegacyDefaultThemes(database: Database): number {
  return database.transaction(
    (tx) => {
      const upgrades = tx
        .select()
        .from(profileThemes)
        .all()
        .flatMap((row) => {
          const next = upgradeLegacyDefaultTheme(row);
          return next ? [{ row, next }] : [];
        });
      if (upgrades.length === 0) return 0;

      tx.run(sql`
        CREATE TABLE IF NOT EXISTS profile_themes_upgrade_backup (
          user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          html_template text NOT NULL,
          custom_css text NOT NULL,
          backed_up_at integer NOT NULL DEFAULT (unixepoch())
        )
      `);
      for (const { row, next } of upgrades) {
        tx.run(sql`
          INSERT INTO profile_themes_upgrade_backup (user_id, html_template, custom_css)
          VALUES (${row.userId}, ${row.htmlTemplate}, ${row.customCss})
        `);
        tx.update(profileThemes)
          .set({
            htmlTemplate: next.htmlTemplate,
            customCss: next.customCss,
            updatedAt: new Date(),
          })
          .where(eq(profileThemes.id, row.id))
          .run();
      }
      return upgrades.length;
    },
    { behavior: "immediate" },
  );
}
