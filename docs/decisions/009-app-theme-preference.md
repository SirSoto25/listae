# 009 — Preferencia de tema de la app (cookie)

**Fecha:** 2026-07-22  
**Estado:** aceptada  
**Relacionada con:** spec app chrome redesign + dark mode; ADR 005 (perfiles aparte)

## Contexto
El chrome oficial necesita light/dark/system sin FOUC y sin acoplarse al CSS libre de perfiles.

## Decisión
Cookie `listae-theme` (`light` | `dark` | `system`), clase `dark` en `<html>`, tokens CSS semánticos. Sin `next-themes`. Perfiles `/u/[username]` independientes.

## Alternativas consideradas
- next-themes — dep extra y FOUC salvo cookie extra
- Solo `prefers-color-scheme` — sin forzar light/dark
- Guardar en DB/usuario — innecesario local-first

## Consecuencias
Toggle cliente + lectura SSR en layout; no mezclar con `profile_themes`.
