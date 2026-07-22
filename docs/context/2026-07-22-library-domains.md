# Contexto — Library domains + profile list split (2026-07-22)

## Estado

- Spec Approved + plan en curso (SDD)
- Branch: `feat/library-domains`
- Preferencia fija: **siempre subagentes** → `docs/context/2026-07-22-agent-preferences.md` + `.cursor/rules/agent-execution-sdd.mdc`
- Briefs SDD de este epic: `.superpowers/sdd/ld-task-N-brief.md` (evitar colisión con briefs de otros epics)

## Progreso

| Task | Estado | Commit |
|------|--------|--------|
| 1 domain helpers | complete | `e536c20` |
| 2–9 | pending | — |

## Código canónico

- `src/types/domain.ts` — `LIBRARY_DOMAINS`, `parseLibraryDomain`, `workTypesForDomain`, `domainForWorkType`

## Antes de compactar

Volcar este archivo + `.superpowers/sdd/progress.md`.
