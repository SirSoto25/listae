# Estado de implementación del MVP (2026-07-21)

## Resumen

La implementación planificada para el MVP está completa en
`feat/listae-mvp`. El código cubre la app Next.js, persistencia SQLite con
Drizzle, autenticación por magic link, catálogo híbrido, biblioteca personal y
perfiles públicos personalizables.

## Checklist de implementación

- [x] Task 1 — Scaffold Next.js, Vitest y scripts base.
- [x] Task 2 — Esquema Drizzle para usuarios, catálogo, listas y caché.
- [x] Task 3 — Auth.js magic link y onboarding de username.
- [x] Task 4 — Validación CSS y sanitización HTML.
- [x] Task 5 — Render de placeholders y tema por defecto.
- [x] Task 6 — Búsqueda TMDB/Open Library con `SearchCacheStore`.
- [x] Task 7 — Alta manual, tracking, detalle de obra y filtros de biblioteca.
- [x] Task 8 — Perfil público y editor HTML/CSS protegido para el propietario.
- [x] Task 9 — README, estado durable y verificación automatizada.

## Evidencia automatizada

Ejecutada el 2026-07-21 desde `feat/listae-mvp`:

- [x] `pnpm test` — 13 archivos y 68 tests pasaron.
- [x] `pnpm build` — compilación, TypeScript y generación de rutas completaron
  correctamente.
- [x] El build incluye `/`, `/login`, `/onboarding`, `/library`,
  `/title/[id]`, `/u/[username]` y `/u/[username]/customize`.

## Verificación manual

Los checks HTTP de tareas anteriores se conservan como evidencia; los flujos
que requieren interacción completa de navegador o credenciales reales quedan
marcados como pendientes y no se consideran verificados por los unit tests.

- [ ] Magic link login + guardar username — el enlace por consola, callback,
  sesión y pantalla de onboarding tuvieron smoke test; falta repetir el flujo
  completo en navegador guardando el username.
- [ ] Crear obra manual + entrada de lista + score — pendiente en navegador.
- [ ] Buscar con TMDB — pendiente con un `TMDB_API_KEY` real.
- [ ] Probar filtros de biblioteca — pendiente en navegador.
- [ ] Confirmar rechazo de tema mostrando línea/import concreto — cubierto por
  tests automatizados; pendiente confirmar el mensaje en el editor.
- [x] Abrir `/u/[username]` sin login — smoke HTTP devolvió 200; el editor
  anónimo redirigió a login.

## Diferido después del MVP

- SMTP de producción y despliegue público.
- Migración de SQLite a Postgres.
- Adaptador Redis para `SearchCacheStore`.
- Fuente dedicada de anime, por ejemplo AniList.
