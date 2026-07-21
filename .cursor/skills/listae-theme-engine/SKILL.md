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

| Token | Meaning |
|-------|---------|
| `{{username}}` | Public username |
| `{{displayName}}` | Display name |
| `{{lists}}` | Rendered lists block (or iterate entries in template) |
| `{{entry.title}}` | Work title |
| `{{entry.type}}` | anime/series/movie/book/manga/comic |
| `{{entry.status}}` | plan/in_progress/completed/on_hold/dropped |
| `{{entry.score}}` | 1–10 or empty |
| `{{entry.progress}}` | Formatted progress |
| `{{entry.cover}}` | Cover image URL |
| `{{entry.url}}` | Link to `/title/[id]` |

Default template MUST group entries by status and include cover + title + score + progress.

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
