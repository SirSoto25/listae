---
name: listae-theme-engine
description: Listae-specific public profile theming — HTML template placeholders, free CSS with Google Fonts-only @import, sandboxed preview, and line-precise CSS validation errors. Use when working on /u/[username], customize editor, ProfileTheme, sanitizer, or default list HTML template in the listae repo.
---

# Listae theme engine

Extends global template skill `user-profile-theme-engine`. Spec: `docs/superpowers/specs/2026-07-21-listae-design.md`. ADR: `docs/decisions/005-profile-html-css.md`.

## Routes

- Public: `/u/[username]`
- Editor (owner): `/u/[username]/customize`

## Stored fields (`ProfileTheme`)

`htmlTemplate`, `customCss`, `updatedAt`

## Placeholders (v1)

Source of truth: `src/lib/theme/placeholders.ts` (`renderProfileHtml`) and `src/lib/theme/defaults.ts` (`DEFAULT_HTML_TEMPLATE`, `DEFAULT_CSS`). There are **no** per-entry placeholders (titles, scores, covers, URLs): entries are only rendered through the block placeholders below.

| Token | Replaced with |
|-------|---------------|
| `{{username}}` | Public username (HTML-escaped) |
| `{{displayName}}` | Display name (HTML-escaped) |
| `{{lists}}` | All domains: one `section.listae-status` per non-empty status, in `LIST_STATUSES` order |
| `{{audiovisual_lists}}` | `section.listae-domain.listae-domain--audiovisual[data-domain]` with its non-empty status sections, or empty |
| `{{reading_lists}}` | `section.listae-domain.listae-domain--reading[data-domain]` with its non-empty status sections, or empty |
| `{{<audiovisual\|reading>_<plan\|in_progress\|completed\|on_hold\|dropped>}}` | One `section.listae-status[data-status]` for that domain and status (10 granular tokens), or empty |

Statuses: `plan`, `in_progress`, `completed`, `on_hold`, `dropped`. Status headings are localized via `profile.status.*`.

Generated markup:

- Status block: `section.listae-status[data-status]` > `h2.listae-status-title` + `table.listae-status-table`.
- Table head: `th.listae-col-index`, `th.listae-col-cover`, `th.listae-col-title`, `th.listae-col-score`, `th.listae-col-type`, `th.listae-col-progress`.
- Row: `tr.listae-entry[data-type][data-index]` with the matching `td.listae-col-*` cells. Cover is an `img.listae-entry-cover` only for `https:` URLs; title links are `a.listae-entry-title` only for `/…` or `https:` URLs.
- Domain CSS hooks: `--listae-domain-bg`, `--listae-domain-accent`, `--listae-domain-fg` (defined in `DEFAULT_CSS`, between `listae:domain-vars` markers).

Substitution is a single pass over `{{\w+}}`: unknown tokens stay literal, and user-controlled values are never re-scanned for placeholders.

Default template (`DEFAULT_HTML_TEMPLATE`) uses `{{displayName}}`, `{{username}}`, `{{audiovisual_lists}}` and `{{reading_lists}}`, so entries are grouped by domain and then by status, with cover, title, score, type and progress.

## CSS policy (Listae)

- Free CSS otherwise
- `@import` **only** from:
  - `https://fonts.googleapis.com/...`
  - `https://fonts.gstatic.com/...`
- Any other `@import` → error citing the **exact import line**
- Parse failures → `line` (+ `column` if available)

## Hard requirements

- No user JS
- iframe sandbox without `allow-scripts`
- Restore default template button
- Tests covering Google Fonts allow + rejected import diagnostics

When unsure, prefer stricter sanitization and clearer errors.
