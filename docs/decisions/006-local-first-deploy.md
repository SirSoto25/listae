# 006 — Deploy local-first

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

El producto se enseñará a amigos, pero antes el dueño quiere probarlo a fondo en local.

## Decisión

Desarrollo y pruebas **solo en local** por ahora. Sin deploy a hosting hasta que el dueño lo pida. El código sí se sube a GitHub (`SirSoto25/listae`) como avance.

## Alternativas consideradas

- Deploy temprano a Vercel/Netlify — útil para demos, pero fuera del momento actual.

## Consecuencias

- README centrado en `dev` local, env vars y SQLite.
- Cuando llegue el deploy: Postgres + proveedor real de email para magic links.
