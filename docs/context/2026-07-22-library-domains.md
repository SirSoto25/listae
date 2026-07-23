# Contexto — Library domains + profile list split (2026-07-22)

## Estado

- Spec **Approved** (2026-07-22) — epic implementado (Tasks 1–9)
- ADR **010** — `docs/decisions/010-library-domains-and-display-name.md`
- Branch: `feat/library-domains`
- Preferencia fija: **siempre subagentes** → `docs/context/2026-07-22-agent-preferences.md` + `.cursor/rules/agent-execution-sdd.mdc`
- Briefs SDD: `.superpowers/sdd/ld-task-N-brief.md`

## Progreso

| Task | Estado | Commit |
|------|--------|--------|
| 1 domain helpers | complete | `e536c20` |
| 2 listLibraryEntries filter | complete | `7210d4b` |
| 3 library tabs + filters UI | complete | `b731b21` |
| 4 profile placeholders | complete | `b2501b1` |
| 5 default dual template | complete | `8e0643b` |
| 6 domain-vars CSS block | complete | `5dae089` |
| 7 domain theme picker UI | complete | `d982669` |
| 8 displayName = username | complete | `1fea592` |
| 9 docs ADR + context | complete | `42bce0a` |

**Deferred:** font picker por dominio (global constraint ADR 005; v1 solo bg/accent/fg).

## Código canónico

| Área | Archivos |
|------|----------|
| Domain constants | `src/types/domain.ts`, `src/types/domain.test.ts` |
| Library query | `src/lib/lists/entries.ts`, `src/lib/lists/entries.test.ts` |
| Library UI | `src/app/library/page.tsx`, `src/components/library-domain-tabs.tsx`, `src/components/library-filters.tsx` |
| Placeholders | `src/lib/theme/placeholders.ts`, `src/lib/theme/__tests__/placeholders.test.ts` |
| Defaults | `src/lib/theme/defaults.ts` |
| Domain-vars block | `src/lib/theme/domain-vars.ts`, `src/lib/theme/domain-vars.test.ts` |
| Picker + editor | `src/components/domain-theme-picker.tsx`, `src/components/theme-editor.tsx` |
| Display name | `src/app/onboarding/page.tsx`, `src/components/username-field.tsx`, `src/lib/auth/config.ts`, `src/lib/auth/backfill-display-names.ts`, `src/lib/validation.ts` |
| Docs | `docs/decisions/010-library-domains-and-display-name.md`, `docs/superpowers/specs/2026-07-22-library-domains-design.md` |

## Antes de compactar

Volcar este archivo + `.superpowers/sdd/progress.md`.
