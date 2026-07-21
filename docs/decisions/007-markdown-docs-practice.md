# 007 — Documentación continua en Markdown

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Se quiere no perder decisiones ni contexto entre sesiones de trabajo con el agente / entre commits.

## Decisión

Mantener y actualizar archivos `.md` en:

- `docs/decisions/` — ADRs
- `docs/context/` — alcance, glosario, estado, notas de sesión
- `docs/superpowers/` — specs y planes formales

Cada decisión relevante nueva → ADR. Cada cierre de sesión o cambio de alcance → nota o actualización en `context/`.

## Consecuencias

- Un poco más de escritura por cambio, a cambio de continuidad.
- El agente debe proponer/actualizar estos docs cuando se tomen decisiones o cambie el contexto.
