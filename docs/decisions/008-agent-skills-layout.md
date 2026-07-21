# 008 — Global template skills + Listae project skills

**Fecha:** 2026-07-21  
**Estado:** aceptada

## Contexto

Se quería desarrollo más guiado y reutilizable: plantillas globales + especialización Listae, en inglés y autoactivadas. También rules de stack/seguridad/docs.

## Decisión

- **Globales** en `~/.agents/skills/` (junto a `frontend-design` / `find-skills`):
  - `user-profile-theme-engine`
  - `media-tracking-domain`
  - `search-cache-store`
  - `living-project-docs`
- **Proyecto** en `listae/.cursor/skills/`:
  - `listae-theme-engine`
  - `listae-media-model`
  - `listae-catalog-providers`
  - `listae-docs-sync`
- **Rules** en `listae/.cursor/rules/`: `stack`, `security-theme`, `docs`
- Skills en **inglés**, sin `disable-model-invocation` (auto)

## Consecuencias

- El agente debe cargar dominio Listae al tocar schema/tema/catálogo/docs.
- Las plantillas globales sirven para futuros trackers sin copiar todo el repo.
