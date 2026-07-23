# Preferencias de proceso (agente)

**Actualizado:** 2026-07-23

## Ejecución

- **Siempre** hacer **cualquier** cambio o tarea mediante **subagentes** (features, fixes, docs, refactors, follow-ups): un implementer por tarea + review cuando corresponda.
- **No** ejecutar inline en la sesión padre salvo que el usuario lo pida explícitamente para esa corrida concreta.
- Antes de compactar contexto: volcar estado vivo a `docs/context/` (y ledger `.superpowers/sdd/progress.md` si aplica).
- Regla Cursor: `.cursor/rules/agent-execution-sdd.mdc` (`alwaysApply: true`).

## Cierre / PR

- **Siempre** procedimiento de PR al terminar un epic o rama feature/fix: push + `gh pr create` (opción 2 del skill *finishing-a-development-branch*).
- **No** merge local por defecto ni descartar la rama sin que el usuario elija explícitamente otra opción para esa corrida.
- Si piden guardar preferencias o docs de proceso, commitear solo esos archivos (p. ej. `.cursor/rules/` y `docs/context/`), no artefactos SDD en `.superpowers/` salvo que lo pidan.


## Contexto de codigo (Graphify)

- Graphify es la herramienta de grafo de codigo del repo: antes de grep masivo o muchos Read, consultar graphify-out/GRAPH_REPORT.md o graphify query / graphify path / graphify explain.
- Regenerar (sin API key): graphify extract . --code-only y luego graphify cluster-only . --no-label.
- Regla Cursor: .cursor/rules/graphify.mdc (alwaysApply: true). Salida local en graphify-out/ (gitignored).
- MCP opcional: graphify-mcp viene con uv tool install graphifyy; anadir servidor MCP en Cursor si se quiere.


## Ponytail (code hygiene)

- Skill: `.agents/skills/ponytail/SKILL.md`; Cursor rule: `.cursor/rules/ponytail.mdc`.
- **Wave 1 in progress** on branch `chore/ponytail-wave-1` (dead code removal + small dedupes).
## Relacionado

- Epic actual: `docs/context/2026-07-22-library-domains.md`
- Plan: `docs/superpowers/plans/2026-07-22-library-domains.md`

