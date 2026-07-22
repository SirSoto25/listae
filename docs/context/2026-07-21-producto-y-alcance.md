# Contexto — Producto y alcance (2026-07-21)

## Qué es Listae

Clon-inspiración de MyAnimeList orientado a **tracking personal** de varios medios, no a red social.

Repo: https://github.com/SirSoto25/listae.git  
Carpeta local: `d:\Documentos\Proyectos\listae`

## Para quién

- Uso personal; puede enseñarse a pocos amigos.
- Cuentas multi-usuario (yo + amigos).
- **Sin** social: no follows, no reviews largas, no amigos como grafo.
- Puntuación: **1–10** (opcional por entrada).

## Medios v1

`anime`, `series`, `movie`, `book`, `manga`, `comic`

## Tracking

- Estados estilo MAL: Plan / In progress / Completed / On Hold / Dropped
- Progreso flexible por tipo:
  - anime/series → episodios
  - movie → estado + nota (progreso numérico no obligatorio)
  - book/manga/comic → capítulos **o** páginas (elige el usuario)

## Catálogo

- Híbrido: APIs externas + alta manual
- TMDB (series/pelis; anime si encaja) + Open Library (libros)
- Anime sin buen match API → manual; API dedicada (p. ej. AniList) posible más adelante

## Perfil público

- `/u/[username]` con HTML template + CSS libre
- Plantilla por defecto para editar cómodo
- Google Fonts permitido vía `@import` allowlist
- Errores CSS con línea o import concreto

## Stack (resumen)

Next.js full-stack · Auth.js magic link · Drizzle · SQLite local · caché búsqueda en BBDD (`SearchCacheStore` → Redis opcional luego)

## Estado actual del repo

- Spec de diseño aprobada y plan del MVP ejecutado en `feat/listae-mvp`.
- MVP implementado: auth magic link, onboarding, catálogo híbrido, alta manual,
  tracking, biblioteca y perfil público personalizable.
- Suite automatizada verde: 13 archivos / 68 tests; `pnpm build` correcto el
  2026-07-21.
- Checklist y evidencia: [estado de implementación del MVP](./2026-07-21-mvp-impl-status.md).
- Pendiente antes de cerrar la validación local: completar los checks manuales
  de navegador y la búsqueda con una clave TMDB real.
- ADRs 001–008 y docs de contexto en el repo.
- Skills globales (plantillas) en `~/.agents/skills/` + skills/rules Listae en `.cursor/`.
- Rama de implementación sincronizada con GitHub.

## Próximo paso acordado

1. ~~Usuario revisa y aprueba el spec.~~ ✅
2. ~~Plan de implementación.~~ ✅ `docs/superpowers/plans/2026-07-21-listae-mvp.md`
3. ~~Ejecutar el plan (scaffold → schema → auth → theme → catalog → library → perfil).~~ ✅
4. Completar la verificación manual local documentada antes de plantear SMTP o
   hosting de producción.
