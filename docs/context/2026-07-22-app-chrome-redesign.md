# Contexto — App chrome redesign + dark mode (2026-07-22)

## Estado

- Spec Approved + plan ejecutado (Tasks 1–9) en `feat/app-chrome-redesign`
- Final review: Approve with nits → fix wave `37b911b`
- Tests: 83/83 PASS

## Código canónico

| Área | Archivo |
|------|---------|
| Preferencia | `src/lib/theme-preference.ts` (`listae-theme`) |
| Tokens | `src/app/globals.css` |
| SSR + atmósfera | `src/app/layout.tsx` |
| Toggle | `src/components/theme-toggle.tsx` |
| Header | `src/components/site-header.tsx` |
| ADR | `docs/decisions/009-app-theme-preference.md` |

## Pendiente manual (browser)

- FOUC / system vs OS
- Contraste visual dark en banners emerald (fast-follow)

## Fast-follow opcionales

- Tokens success/danger
- Pasar preferencia SSR al ThemeToggle (evitar label flash)
- Comentar/quitar lectura `sec-ch-prefers-color-scheme` sin Accept-CH
