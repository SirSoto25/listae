# 010 — Library domains, profile domain styling, displayName = username

**Fecha:** 2026-07-22  
**Estado:** aceptada  
**Relacionada con:** spec `2026-07-22-library-domains-design.md`; ADR 005 (perfil HTML/CSS)

## Contexto

La biblioteca personal mezclaba anime/series/películas con libros/manga/cómics sin separación clara. Los perfiles públicos no podían estilizar esas secciones de forma distinta sin reescribir todo el CSS. Además, `displayName` se derivaba del local-part del email en `createUser`, filtrando al UI.

## Decisión

### Dominios de biblioteca

- Tres dominios: `audiovisual` (anime, series, movie), `reading` (book, manga, comic), `all` (los seis).
- Helpers canónicos en `src/types/domain.ts`.
- `/library`: tabs **Audiovisual | Lectura | Todo**; `domain` en query params (default `all`); sin persistencia en DB.
- Al cambiar tab, `type` vuelve a `all`; filtros de tipo acotados al dominio activo.

### Perfil público: placeholders + picker

- Placeholders `{{audiovisual_lists}}` y `{{reading_lists}}` con wrappers `.listae-domain--{domain}`; `{{lists}}` sigue siendo compat.
- Plantilla/CSS por defecto usa dos secciones de dominio con variables CSS distintas.
- Picker en customize escribe **solo** el bloque marcado `listae:domain-vars:start/end` (bg, accent, fg por dominio); el CSS libre fuera del bloque no se toca.
- Fuente por dominio **diferida** (misma postura de seguridad que ADR 005; v1 solo colores).

### displayName = username

- Onboarding guarda `displayName = username`; `createUser` **no** deriva display name del email.
- Chrome/biblioteca muestran `username`, nunca email ni local-part auto.
- Si `username` coincide con el local-part del email de sesión: **aviso suave** en onboarding (no bloquea submit).
- Backfill: `display_name = username` para filas existentes con username.

## Alternativas consideradas

- Persistir tab de biblioteca en DB/cookie — innecesario; URL basta.
- Bloquear usernames que parecen email — demasiado restrictivo; aviso suave suficiente.
- Picker que reemplaza todo el CSS — rompe ADR 005 y temas legacy con `{{lists}}`.
- displayName editable ≠ username — fuera de alcance v1.

## Consecuencias

- Tests unitarios para helpers, filtros, placeholders, domain-vars upsert, onboarding y warning.
- Temas antiguos con solo `{{lists}}` siguen renderizando.
- Migración/backfill documentada en código (`backfill-display-names.ts`).
