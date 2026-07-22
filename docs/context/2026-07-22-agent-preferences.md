# Preferencias de proceso (agente)

**Actualizado:** 2026-07-22

## Ejecución

- **Siempre** hacer **cualquier** cambio o tarea mediante **subagentes** (features, fixes, docs, refactors, follow-ups): un implementer por tarea + review cuando corresponda.
- **No** ejecutar inline en la sesión padre salvo que el usuario lo pida explícitamente para esa corrida concreta.
- Antes de compactar contexto: volcar estado vivo a `docs/context/` (y ledger `.superpowers/sdd/progress.md` si aplica).
- Regla Cursor: `.cursor/rules/agent-execution-sdd.mdc` (`alwaysApply: true`).

## Cierre / PR

- **Siempre** procedimiento de PR al terminar un epic o rama feature/fix: push + `gh pr create` (opción 2 del skill *finishing-a-development-branch*).
- **No** merge local por defecto ni descartar la rama sin que el usuario elija explícitamente otra opción para esa corrida.
- Si piden guardar preferencias o docs de proceso, commitear solo esos archivos (p. ej. `.cursor/rules/` y `docs/context/`), no artefactos SDD en `.superpowers/` salvo que lo pidan.

## Relacionado

- Epic actual: `docs/context/2026-07-22-library-domains.md`
- Plan: `docs/superpowers/plans/2026-07-22-library-domains.md`
