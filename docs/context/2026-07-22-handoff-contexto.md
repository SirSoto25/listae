# Handoff de contexto — Listae (2026-07-22)

Documento de continuidad para cuando el agente se quede sin contexto.
Leer junto con el spec, el plan y el PR.

## Estado del proyecto

| Ítem | Valor |
|------|--------|
| Repo | https://github.com/SirSoto25/listae |
| Carpeta local | `d:\Documentos\Proyectos\listae` |
| Rama de trabajo | `feat/listae-mvp` (trackea `origin/feat/listae-mvp`) |
| PR | [#1](https://github.com/SirSoto25/listae/pull/1) — OPEN, MERGEABLE |
| Último commit relevante | `f9abe59` chore: drop unused import fields; note PR and deferred minors |
| Base / docs en main | Spec + ADRs + plan ya estaban en `main`; el MVP de código vive en el PR |

## Qué está hecho (MVP)

Plan SDD completo (Tasks 1–9) + fixes de review:

- Next.js App Router + TypeScript + Tailwind + Vitest
- Drizzle + SQLite (`foreign_keys=ON`), schema users/works/listEntries/profileThemes/searchCache + tablas Auth.js
- Auth.js magic link (consola en local si no hay SMTP) + onboarding username `[a-z0-9_]{3,32}`
- Theme engine: sanitize HTML, validate CSS (todos los `@import` por línea), placeholders `{{username}}`/`{{displayName}}`/`{{lists}}`, iframe `sandbox=""`
- Catálogo: TMDB + Open Library + `SearchCacheStore` DB + stale-on-outage
- Library / title / search / manual create; import server-side por `(source, externalId)`
- Perfil público `/u/[username]` + customize owner-only
- Tests: **70** pasando (`pnpm test`); `pnpm build` OK en verificación Task 9
- Final branch review: **Approve with nits**; Importants ya corregidos (multi-`@import` + test integración perfil)

## Docs canónicos

- Spec: `docs/superpowers/specs/2026-07-21-listae-design.md` (Approved)
- Plan: `docs/superpowers/plans/2026-07-21-listae-mvp.md`
- ADRs: `docs/decisions/` (001–008+)
- Estado MVP: `docs/context/2026-07-21-mvp-impl-status.md`
- Skills proyecto: `.cursor/skills/listae-*`
- Rules: `.cursor/rules/` (`stack`, `security-theme`, `docs`)
- Skills globales: `~/.agents/skills/` (templates + `frontend-design` + `find-skills`)
- Artefactos SDD locales (untracked, no en git): `.superpowers/sdd/*`

## Verificación local (en curso el 2026-07-22)

- Se creó `.env.local` (no commitear) con `AUTH_SECRET`, `AUTH_URL=http://localhost:3000`, `DATABASE_URL=file:./data/listae.db`, `TMDB_API_KEY` vacío
- `pnpm db:push` OK; `data/listae.db` existe
- `pnpm dev` llegó a Ready en :3000; el proceso a veces lo arrancó un subagente → **la terminal integrada de Cursor no siempre es visible**
- Magic link se loguea como `[listae magic link] email -> url` en la salida de Next
- El usuario **no encontraba la consola**; se le indicó abrir Terminal nueva → `cd listae` → `pnpm dev` para ver el link
- Checklist manual aún pendiente de marcar en `2026-07-21-mvp-impl-status.md` (login completo, obra manual, TMDB, filtros, tema en UI)

### Cómo retomar verificación

1. Terminal visible del usuario: `cd d:\Documentos\Proyectos\listae && pnpm dev`
2. Si el puerto 3000 está ocupado por un Next huérfano: matar el `node` en :3000 o usar otro puerto
3. http://localhost:3000/login → pedir link → copiar de **esa** terminal
4. Seguir checklist en `docs/context/2026-07-21-mvp-impl-status.md` sección “Verificación manual”
5. TMDB: el usuario debe pegar `TMDB_API_KEY` en `.env.local` y reiniciar dev

## Pendiente / decisiones abiertas

1. **Usuario:** terminar verificación manual en navegador y marcar el checklist
2. **Usuario:** mergear [PR #1](https://github.com/SirSoto25/listae/pull/1) a `main` cuando esté contento
3. **Opcional / diferido (minors):** dedup obras manuales; shape-check `parseCachedHits`; migraciones Drizzle versionadas; login redirect hop; extract mapper ProfileEntry duplicado
4. **Post-MVP:** SMTP real, Postgres, Redis adapter, AniList, deploy público

## Preferencias del usuario (sesión)

- Comunicación en **español**
- Docs vivos: `docs/decisions/` + `docs/context/`
- Implementación con **subagentes** (SDD); paralelo solo cuando no haya conflictos de archivos
- Stack: Next full-stack, no Nest/Mongo; SQLite local-first; Auth magic link; CSS libre + plantilla HTML; Google Fonts `@import` only
- Avances a GitHub `SirSoto25/listae`

## Comandos rápidos

```powershell
cd d:\Documentos\Proyectos\listae
pnpm test
pnpm db:push
pnpm dev
& "C:\Program Files\GitHub CLI\gh.exe" pr view 1
```

## Primera acción recomendada en la siguiente sesión

Preguntar: ¿seguimos con verificación local (consola visible + checklist) o merge del PR #1?
