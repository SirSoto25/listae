# Documentación de Listae

Convención del repo: **ir dejando rastro en Markdown** a medida que avanzamos.

| Carpeta | Para qué |
|---------|----------|
| `superpowers/specs/` | Specs de diseño (qué construir y por qué a alto nivel) |
| `superpowers/plans/` | Planes de implementación paso a paso |
| `decisions/` | Decisiones concretas (ADR): stack, auth, caché, etc. |
| `context/` | Contexto vivo del producto, alcance, glosario, pendientes |

## Cómo usarlo

- **Nueva decisión de arquitectura o producto** → nuevo archivo en `decisions/` (ver plantilla).
- **Contexto de conversación / alcance / “por qué estamos así”** → actualizar o añadir en `context/`.
- No sustituyen el código ni el README de la app; complementan para no perder el hilo entre sesiones.

## Índice rápido

- Spec v1: [superpowers/specs/2026-07-21-listae-design.md](./superpowers/specs/2026-07-21-listae-design.md)
- Contexto producto: [context/2026-07-21-producto-y-alcance.md](./context/2026-07-21-producto-y-alcance.md)
- Estado del MVP: [context/2026-07-21-mvp-impl-status.md](./context/2026-07-21-mvp-impl-status.md)
- Decisiones: ver [decisions/](./decisions/)
- Agent skills del repo: [../.cursor/skills/](../.cursor/skills/)
- Rules: [../.cursor/rules/](../.cursor/rules/)
