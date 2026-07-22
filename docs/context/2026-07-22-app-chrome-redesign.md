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
| 5–9 | pending | — |

### Tras Task 4

- `src/app/layout.tsx` — cookie → `html.dark`, `app-atmosphere` on body
- `src/components/theme-toggle.tsx` — listo; montaje en header = Task 5

Ledger: `.superpowers/sdd/progress.md` (scratch). Briefs del plan actual.
