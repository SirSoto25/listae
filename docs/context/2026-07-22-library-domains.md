# Contexto — Library domains + profile list split (2026-07-22)

## Estado

Diseño escrito: `docs/superpowers/specs/2026-07-22-library-domains-design.md`  
**Status:** Draft — pendiente review del usuario antes del plan.  
**No implementar** hasta aprobación de la spec.

## Decisiones locked (resumen)

| Tema | Elección |
|------|----------|
| Library | Tabs AV \| Lectura \| Todo; Todo mezclado; default `domain=all`; query params |
| Perfil | `{{audiovisual_lists}}` / `{{reading_lists}}` + wrappers; `{{lists}}` compat |
| Estilos | Picker escribe bloque `/* listae:domain-vars:… */` (vars CSS); CSS libre OK |
| Display name | = username onboarding; no email; backfill; aviso si username = local-part email |

## Antes de compactar

Volcar progreso a este archivo + spec. No confiar solo en el chat.
