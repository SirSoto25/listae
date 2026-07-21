# 003 — Auth por magic link

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Varias cuentas (dueño + amigos), sin features sociales. Había que elegir mecanismo de login.

## Decisión

**Auth.js** con **magic link por email** (sin contraseña).

## Alternativas consideradas

- Email + password — más fricción y gestión de secretos para un círculo pequeño.
- Sin login al inicio — impediría perfiles/listas por usuario de forma limpia.

## Consecuencias

- Necesita proveedor de email (dev: Ethereal/Mailpit/consola; prod: Resend/etc. cuando toque).
- Perfiles públicos `/u/[username]` siguen siendo legibles sin sesión.
