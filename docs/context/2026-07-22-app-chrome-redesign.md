# Contexto — App chrome redesign + dark mode (2026-07-22)

## Estado

- Spec: `docs/superpowers/specs/2026-07-22-app-chrome-redesign-dark-mode-design.md` (Approved)
- Plan: `docs/superpowers/plans/2026-07-22-app-chrome-redesign-dark-mode.md`
- Branch: `feat/app-chrome-redesign`
- Ejecución: SDD (implementer + review por tarea)

## Código canónico (fuente de verdad)

| Área | Archivo |
|------|---------|
| Preferencia tema | `src/lib/theme-preference.ts` (`THEME_COOKIE_NAME=listae-theme`) |
| Tokens light+dark | `src/app/globals.css` (`:root`, `.dark`, `.app-atmosphere`) |
| SSR tema + atmósfera | `src/app/layout.tsx` *(Task 4+)* |
| Toggle | `src/components/theme-toggle.tsx` *(Task 4+)* |
| Header | `src/components/site-header.tsx` *(Task 5+)* |

## Progreso

| Task | Estado | Commit |
|------|--------|--------|
| 1 helpers | complete | `2f3bd9e` |
| 2 light tokens | complete | `5022a8f` |
| 3 dark tokens | complete | `95f0cf7` |
| 4 layout SSR + ThemeToggle | complete | `641c05b` |
| 5 header IA | complete | (see branch log) |
| 6 library / chrome pages | complete | (see branch log) |
| 7 search / hits motion | complete | (see branch log) |
| 8 customize editor chrome | complete | (see branch log) |
| 9 ADR + spec Approved + verify | complete | (this task) |

### Notas

- Spec status: **Approved**. ADR 009 documenta cookie `listae-theme` sin `next-themes`.
- Tasks 1–8 implementation landed on `feat/app-chrome-redesign`; Task 9 closes docs + verification.

Ledger: `.superpowers/sdd/progress.md` (scratch). Briefs del plan actual.
