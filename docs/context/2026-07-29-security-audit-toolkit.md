# Security audit toolkit (Listae)

**Date:** 2026-07-29  
**Branch:** `chore/security-skills`

## Project skills (`.agents/skills/`)

| Skill | Source | Use when |
|-------|--------|----------|
| `owasp-audit` | [briiirussell/cybersecurity-skills](https://github.com/briiirussell/cybersecurity-skills) | OWASP Top 10 code review, IDOR, injection, XSS, SSRF |
| `api-audit` | same | REST/GraphQL/tRPC/Server Actions API surface |
| `dependency-audit` | same | SBOM, vulnerable components, supply chain |
| `security-audit` | [toshipon/claude-code-security-audit-skill](https://github.com/toshipon/claude-code-security-audit-skill) | Full-stack audit; see `references/nextjs-security.md` for Listae stack |

## Cursor rules (`.cursor/rules/`)

- `owasp-audit.mdc`, `api-audit.mdc`, `dependency-audit.mdc` — `alwaysApply: false`; loaded when auditing.

## Global copies

Mirrored under `C:\Users\aleja\.cursor\skills\` for Cursor discovery.

## Not installed

- **cyberaudit-skill** (`npx cyberaudit-skill install --agent cursor --project`) — failed on Windows: CLI rejects `--project` (2026-07-29). Retry when upstream fixes flags or use manual install docs.
