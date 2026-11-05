# Decisiones (ADR)

Cada archivo = una decisión tomada. Numeración secuencial: `NNN-titulo-corto.md`.

## Plantilla

```markdown
# NNN — Título

**Fecha:** YYYY-MM-DD  
**Estado:** aceptada | superseded | rechazada  
**Relacionada con:** (links opcionales)

## Contexto
Qué problema o pregunta había.

## Decisión
Qué elegimos.

## Alternativas consideradas
- Opción A — por qué no
- Opción B — por qué no

## Consecuencias
Implicaciones positivas y negativas.
```

## Índice

| ID | Título | Estado |
|----|--------|--------|
| 001 | Next.js full-stack (sin Nest/Mongo) | aceptada |
| 002 | SQLite local + Drizzle (Postgres más adelante) | aceptada |
| 003 | Auth por magic link | aceptada |
| 004 | Caché de búsqueda en BBDD con puerto Redis | aceptada |
| 005 | Perfil con HTML template + CSS libre (Google Fonts) | aceptada |
| 006 | Deploy local-first | aceptada |
| 007 | Documentación continua en Markdown | aceptada |
| 008 | Global template skills + Listae project skills | aceptada |
| 009 | Preferencia de tema de la app (cookie) | aceptada |
| 010 | Library domains, picker de dominio, displayName = username | aceptada |
| 011 | URL locales (es/en), i18n casero, perfiles sin prefijo | aceptada |
| 012 | Migraciones al arrancar (instrumentation) + SQLite en WAL | aceptada |
| 013 | CSP con nonce, dos políticas (app y perfil `/u/*`) | aceptada |
| 014 | Rate limits en SQLite con IP de confianza (`CLIENT_IP_HEADER`) | aceptada |
| 015 | Sanitizar el documento final del perfil; placeholders solo en texto | aceptada |
| 016 | Entorno de auth validado al arrancar, magic link de 15 min, email estricto y límite único | aceptada |
