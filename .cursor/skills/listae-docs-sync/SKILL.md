---
name: listae-docs-sync
description: Keep Listae Markdown docs in sync — ADRs under docs/decisions, living notes under docs/context, specs/plans under docs/superpowers. Use after product/architecture decisions, session wrap-ups, or before claiming a milestone complete in the listae repo.
---

# Listae docs sync

Extends global template skill `living-project-docs`.

## Paths

| Kind | Path |
|------|------|
| Map | `docs/README.md` |
| ADRs | `docs/decisions/NNN-slug.md` + index in `docs/decisions/README.md` |
| Context | `docs/context/` |
| Specs | `docs/superpowers/specs/` |
| Plans | `docs/superpowers/plans/` |

## Mandatory updates

- New decision → new ADR + index row (next number after 007+)
- Scope/status change → update `docs/context/2026-07-21-producto-y-alcance.md` or add dated note
- Agents/skills tooling changes → update or add under `docs/context/`
- Do not finish a milestone that changed decisions without docs + commit to GitHub when the user wants progress pushed

## Language

- Product conversation with the user: Spanish OK
- ADR/skill body for agents: prefer English (match existing ADRs mix — keep new ADRs consistent; Spanish context notes OK if already established)

Existing context notes are in Spanish; keep that folder bilingual-friendly: do not rewrite history without ask.
