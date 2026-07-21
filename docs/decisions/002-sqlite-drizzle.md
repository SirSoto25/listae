# 002 — SQLite local + Drizzle (Postgres más adelante)

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Hacía falta BBDD para multi-usuario, obras compartidas y entradas de lista. Candidatos: Mongo, SQLite, Postgres.

## Decisión

**Drizzle ORM** con **SQLite en local** para v1. Schema pensado para poder pasar a **Postgres** cuando haya deploy público.

## Alternativas consideradas

- **MongoDB** — peor encaje para filtros por estado/tipo y relaciones.
- **Postgres desde el día 1** — bien, pero añade cuenta/infra innecesaria mientras solo se prueba en local.
- **Redis como store principal** — no; Redis solo como posible caché futura (ADR 004).

## Consecuencias

- Cero infra de BBDD al desarrollar.
- Migraciones con Drizzle; evitar SQL específico de SQLite que bloquee el salto a Postgres.
