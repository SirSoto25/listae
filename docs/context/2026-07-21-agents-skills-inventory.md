# Contexto — Agents, skills y plugins útiles para Listae

**Fecha:** 2026-07-21  
**Objetivo:** inventario de lo disponible en este Cursor + gaps a cubrir para un desarrollo más puntero y distintivo.

## 1. Ya instalado / disponible (alta utilidad)

### Proceso (Superpowers) — usar siempre en el ciclo

| Skill | Cuándo |
|-------|--------|
| `brainstorming` | Ya usado; nuevas features |
| `writing-plans` | Siguiente paso tras aprobar spec |
| `executing-plans` / `subagent-driven-development` | Implementar por tareas |
| `test-driven-development` | Módulos críticos (sanitizer CSS, placeholders, score) |
| `systematic-debugging` | Bugs / tests fallando |
| `verification-before-completion` | Antes de dar por cerrado un hito |
| `requesting-code-review` / `receiving-code-review` | Tras PRs o hitos grandes |
| `using-git-worktrees` | Features en paralelo sin ensuciar `main` |
| `dispatching-parallel-agents` | UI + schema + APIs en paralelo |
| `writing-skills` / `create-skill` | Crear skills propias de Listae (abajo) |

### UI / producto

| Recurso | Rol en Listae |
|---------|----------------|
| **shadcn** (plugin + skill + MCP) | Sistema de componentes para library/search/settings (no para el CSS libre del perfil) |
| **Figma** (plugin + skills design-to-code) | Si diseñamos pantallas en Figma antes de codear |
| User rule de frontend design (ya en Cursor) | Evitar “AI slop”; tipografía/hero/composición |

### Datos / infra (según fase)

| Recurso | Rol |
|---------|-----|
| **Neon Postgres** / **Supabase** | Cuando saltemos de SQLite local → Postgres hosted |
| **Netlify frameworks / deploy / identity / image CDN / caching** | Solo cuando toque deploy (ahora local-first; ADR 006) |
| **Netlify Image CDN** | Portadas optimizadas en deploy futuro |
| **MongoDB plugin** | **No usar** (ADR 001/002) |

### Calidad y seguridad

| Recurso | Rol |
|---------|-----|
| `review-security` / subagent **security-review** | Crítico para HTML/CSS libre, magic link, XSS |
| `review-bugbot` | Revisión automática de diffs |
| Subagents: **Code Reviewer**, **Security Engineer**, **Accessibility Auditor** | Pases de calidad |
| **Evidence Collector** / **Reality Checker** | Evitar “parece hecho” sin prueba |

### Agents de diseño (diferenciación visual)

| Subagent | Para qué en Listae |
|----------|-------------------|
| **UI Designer** | Sistema visual de la app “oficial” (no el CSS del usuario) |
| **UX Architect** | Flujos search → add → library → profile |
| **Whimsy Injector** | Toques de personalidad sin parecer template genérico |
| **Brand Guardian** | Nombre Listae, voz, consistencia |
| **Visual Storyteller** | Moodboards / dirección estética del producto |
| **Inclusive Visuals Specialist** | Portadas/avatares sin estereotipos |

### Docs / meta

| Recurso | Rol |
|---------|-----|
| `create-rule` | Rules del repo (sanitizer, stack, docs.md) |
| `docs-canvas` / `canvas` | Diagramas de modelo o flujos |
| `create-subagent` | Agente fijo “Listae theme validator” si hace falta |
| `orchestrate` | Pipelines multi-agente en hitos grandes |

## 2. No instalado — recomendado conseguir

| Skill / plugin | Por qué | Cómo |
|----------------|---------|------|
| **frontend-design** (Anthropic) | UI distintiva, anti-slop; complementa la user rule | `npx skills add anthropics/skills --skill frontend-design` ([ref](https://promptsrush.com/marketplace/skills/frontend-design)) |
| Skill Next.js App Router (comunidad) | Patrones RSC, Server Actions, caching | p. ej. `npx skills add … --skill nextjs-react-typescript` ([ejemplo](https://explainx.ai/skills/mindrally/skills/nextjs-react-typescript)) |
| Marketplace Cursor | Plugins empaquetados (MCP+skills+rules) | [cursor.com/blog/marketplace](https://cursor.com/blog/marketplace) |

**Nota:** No instalar stacks que contradigan el spec (Supabase-as-primary, Mongo, Nest) salvo decisión explícita nueva (ADR).

## 3. Skills propias a crear (esto es lo que hace el proyecto “único”)

Lo instalado es genérico. La ventaja competitiva del agente en Listae viene de skills/rules **del dominio**:

| Skill propuesta (proyecto `.cursor/skills/`) | Contenido |
|-----------------------------------------------|-----------|
| `listae-theme-engine` | Placeholders, allowlist HTML, Google Fonts only, errores con línea/`@import`, iframe sandbox |
| `listae-media-model` | Tipos de obra, estados MAL, progreso por tipo, upsert por `externalSource+externalId` |
| `listae-catalog-providers` | TMDB + Open Library + manual; `SearchCacheStore` y cuándo NO llamar APIs |
| `listae-docs-sync` | Tras cada decisión → ADR; tras sesión → `docs/context/` |

Rules sugeridas (`.cursor/rules/`):

- `stack.mdc` — Next full-stack, Drizzle, SQLite→Postgres, no Nest/Mongo
- `security-theme.mdc` — nunca ejecutar JS de usuario; diagnósticos CSS precisos
- `docs.mdc` — no cerrar hito sin actualizar docs si hubo decisión

Crear con skill `create-skill` / `create-rule` cuando arranque la implementación.

## 4. Plan de uso por fase

```
Spec OK
  → writing-plans
  → (opcional) instalar frontend-design + skill Next.js
  → create-skill listae-* + create-rule stack/security/docs

Scaffold + schema
  → TDD en sanitizer/cache
  → parallel: Frontend Developer + Backend-ish via main agent

UI app (no perfil CSS)
  → shadcn + UI Designer / Whimsy (dirección estética acordada)
  → user rule frontend + frontend-design

Perfil HTML/CSS
  → listae-theme-engine + security-review obligatorio

Hitos / PRs
  → code-reviewer + bugbot + verification-before-completion
  → push a GitHub; docs context actualizado
```

## 5. Qué NO aporta ahora

- Lovable scaffold (otro ecosistema; ya tenemos stack decidido)
- Mongo / Firebase como core
- Netlify Identity (usamos Auth.js magic link)
- Redis skills (solo puerto futuro; ADR 004)

## 6. Recomendación concreta antes de codear

1. Instalar **frontend-design** (Anthropic).  
2. Crear skills de dominio **listae-theme-engine** + **listae-media-model** (mínimo).  
3. Añadir rules `stack` + `security-theme` + `docs`.  
4. En implementación: Superpowers (plan → TDD → verify) + shadcn + security-review en el motor de temas.  
5. Agents de diseño (UI/Whimsy/Brand) en un pase corto de dirección visual **antes** de pintar pantallas, para no caer en UI genérica.
