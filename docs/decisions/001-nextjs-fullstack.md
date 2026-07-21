# 001 — Next.js full-stack (sin Nest/Mongo)

**Fecha:** 2026-07-21  
**Estado:** aceptada  
**Relacionada con:** [spec](../superpowers/specs/2026-07-21-listae-design.md)

## Contexto

Uso personal + pocos amigos. Hacía falta elegir entre Next.js monolítico, Next + Nest, o Mongo frente a SQL.

## Decisión

Una sola app **Next.js (App Router) + TypeScript**, con Server Actions / Route Handlers. Sin backend Nest separado y sin MongoDB.

## Alternativas consideradas

- **Next + Nest + Mongo** — más boilerplate y dos deploys; exceso para el tamaño del proyecto.
- **Next + SQLite-only forever** — válido al inicio, pero el schema debe poder migrar a Postgres sin reescribir la app (ver ADR 002).

## Consecuencias

- Un repo, un proceso de desarrollo, deploy futuro simple.
- La lógica de negocio vive en el mismo proyecto (organizada por carpetas/módulos).
- Relaciones de listas/usuarios/obras se modelan mejor en SQL que en documentos.
