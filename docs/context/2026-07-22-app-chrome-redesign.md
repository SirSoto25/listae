# Contexto — App chrome redesign + dark mode (2026-07-22)

## Estado

- Spec aprobada: `docs/superpowers/specs/2026-07-22-app-chrome-redesign-dark-mode-design.md`
- Plan: `docs/superpowers/plans/2026-07-22-app-chrome-redesign-dark-mode.md`
- Branch: `feat/app-chrome-redesign`
- Ejecución: Subagent-Driven Development (implementer + review por tarea)

## Decisiones de producto (resumen)

- Identidad light fresca (canvas `#F4F7FB`, acento índigo `#4F5BD5`), atmósfera fría
- Dark mode + `system` vía cookie `listae-theme` (sin `next-themes`)
- Solo chrome oficial; perfiles `/u/[username]` fuera de alcance
- Tokens primero → migrar pantallas → dark → toggle

## Código como contexto (actualizar al cerrar tareas)

| Área | Archivos canónicos |
|------|-------------------|
| Preferencia tema | `src/lib/theme-preference.ts` |
| Tokens | `src/app/globals.css` (`:root` + `.dark`) |
| SSR tema | `src/app/layout.tsx` |
| Toggle | `src/components/theme-toggle.tsx` |
| Header | `src/components/site-header.tsx` |
| ADR | `docs/decisions/009-app-theme-preference.md` (Task 9) |

## Progreso

| Task | Estado | Commits |
|------|--------|---------|
| 1 theme-preference helpers | complete | `2f3bd9e` |

Ledger scratch: `.superpowers/sdd/progress.md`. Commits reales en `git log feat/app-chrome-redesign`.

### Código canónico tras Task 1

- `src/lib/theme-preference.ts` — `THEME_COOKIE_NAME`, `parseThemePreference`, `resolveTheme`, `themeClassName`
- Tests: `src/lib/theme-preference.test.ts`
