# 011 — URL locales, i18n casero, perfiles sin prefijo

**Fecha:** 2026-07-27  
**Estado:** aceptada  
**Relacionada con:** spec `2026-07-27-i18n-design.md`; ADR 005 (perfil HTML/CSS); ADR 010 (dominios biblioteca)

## Contexto

Listae está en inglés en la UI y en metadatos de catálogo (TMDB/Open Library en `en-US`). Los usuarios hispanohablantes necesitan español en chrome de app, auth, emails y textos de plantilla de perfil, sin romper URLs públicas de perfil ni el modelo ADR 005 (HTML/CSS libre del usuario).

## Decisión

### Rutas con locale

- Rutas de app bajo `/{locale}` con `es` | `en`; default **`es`**.
- Middleware redirige URLs sin prefijo (`/library`, `/login`, …) según `Accept-Language` (solo `es`/`en`); si no hay match, **`es`**.
- Perfiles públicos **`/u/[username]`** y customize **sin** prefijo de locale (URL estable para compartir).

### i18n casero (sin next-intl en MVP)

- `messages/es.json` + `messages/en.json` + helpers en `src/lib/i18n/*` (`config`, `resolve-locale`, `get-dictionary`, `t`, `path`, `work-text`).
- Misma forma de claves y param `locale` que usaría `next-intl` en una migración futura; **no** instalar `next-intl` ahora.

### Alcance MVP

- UI: nav, biblioteca, login/onboarding, búsqueda catálogo, página título, emails magic-link.
- Etiquetas de plantilla de perfil (estados de lista); **no** traducir HTML/CSS custom del usuario.

### Obras bilingües

- Columnas `title_es`, `title_en`, `synopsis_es`, `synopsis_en`; backfill `title_en = title`, `synopsis_en = synopsis`.
- Import guarda ambos idiomas cuando el proveedor lo permita; visualización por locale de URL con fallback: locale pedido → `en` → `title`/`synopsis` legacy.

### Locale del dueño del perfil

- `users.profile_locale` (`es` | `en`, default `es`): idioma de **chrome/labels** del perfil público del owner, independiente del locale del visitante en rutas `/es/…`.

## Alternativas consideradas

- **next-intl ahora** — más dependencia y refactor de layouts; aplazado; API interna alineada para migrar después.
- **Solo cookie de locale, URLs sin prefijo** — peor para SEO/compartir idioma y no refleja idioma en la barra de direcciones; rechazado.
- **Locale en URL de perfil (`/es/u/alice`)** — rompe links existentes y mezcla identidad pública con preferencia de visitante; rechazado.
- **Traducir HTML/CSS de perfil** — fuera de alcance y conflictivo con ADR 005.

## Consecuencias

- Middleware obligatorio; mover páginas bajo `app/[locale]/`.
- `safe-return-path` y cache de búsqueda deben incluir segmento de locale.
- Tests unitarios para negociación de locale, paths, `t`, `work-text` y backfill de schema.
- Perfiles siguen en una sola URL; visitantes ven labels según `profileLocale` del owner, no según su propio `/en/…`.
