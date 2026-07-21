---
name: listae-media-model
description: Listae domain model for works and list entries — media types, MAL-like statuses, 1–10 scores, and type-specific progress. Use when editing Drizzle schema, ListEntry/Work types, library filters, or progress/score UI in the listae repo.
---

# Listae media model

Extends global template skill `media-tracking-domain`. Spec: `docs/superpowers/specs/2026-07-21-listae-design.md`.

## Work.type

`anime` | `series` | `movie` | `book` | `manga` | `comic`

## ListEntry.status

`plan` | `in_progress` | `completed` | `on_hold` | `dropped`

## Score

`score`: integer 1–10 or null. No long reviews. Optional short `notes` only.

## Progress

- **anime / series:** `progressValue` = episodes; use `episodesTotal` on Work when known
- **movie:** status + score; progress not required
- **book / manga / comic:** `progressUnit` = `chapters` | `pages`; `progressValue` accordingly; totals on Work when known

## Constraints

- Unique `(userId, workId)` on ListEntry
- Prefer unique `(externalSource, externalId)` on Work when not `manual`
- Multi-user, **not** social (no follows/friends graph)

## UI expectations

`/library`: filter by type + status; sort by score, title, `updatedAt`; quick-edit status/progress/score.
