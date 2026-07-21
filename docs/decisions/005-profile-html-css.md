# 005 — Perfil con HTML template + CSS libre (Google Fonts)

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Se quiere personalizar la página de listas al estilo CSS custom de MAL, pero más cómodo al editar.

## Decisión

- Plantilla **HTML** editable con placeholders, más **CSS libre**.
- Plantilla por defecto incluida para no partir de cero.
- Preview y vista pública en iframe sandbox **sin JS de usuario**.
- `@import` permitido **solo** hacia Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`).
- Errores de validación CSS deben indicar **línea** (y columna si es posible) o el **`@import`/URL exacto** rechazado.

## Alternativas consideradas

- Solo tema de colores/tipografía (sin CSS libre) — demasiado limitado.
- HTML/CSS sin sanitizar — riesgo inaceptable aunque sea “entre amigos”.

## Consecuencias

- Módulo de sanitizado/validación con tests dedicados.
- UX del editor debe mostrar diagnósticos precisos, no un “CSS inválido” genérico.
