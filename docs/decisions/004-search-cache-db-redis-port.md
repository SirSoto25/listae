# 004 — Caché de búsqueda en BBDD con puerto Redis

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Búsquedas a TMDB / Open Library no deben repetirse en cada keystroke. Redis era tentador pero pesado para uso personal.

## Decisión

- Implementar caché de búsquedas en **tabla de la BBDD**.
- Exponer interfaz `SearchCacheStore` (`get` / `set` / `invalidate`).
- **No** desplegar Redis en v1; dejar el diseño listo para un adapter Redis si hace falta.

## Alternativas consideradas

- Solo caché in-memory de Next — se pierde al reiniciar el proceso.
- Redis desde el día 1 — overkill para tú + amigos.

## Consecuencias

- Un servicio más en el schema (`SearchCache`).
- Cambiar a Redis = nuevo adapter, mismos callers.
