# Security audit reports (Listae)

**Date:** 2026-07-29  
**Remediation branch:** `fix/security-remediation`

## Executive summary

| Area | Result |
|------|--------|
| **Application code (OWASP + API)** | High items addressed — rate limits, headers, input validation; see [remediation log](./2026-07-29-remediation.md) |
| **Dependencies (`pnpm audit`)** | `next` / `next-auth` bumped on remediation branch |
| **BOLA / IDOR (user-owned resources)** | **Clean** — ownership checks consistent on tested routes |

Remediation status: [2026-07-29-remediation.md](./2026-07-29-remediation.md).

## Reports

| Report | File | Scope |
|--------|------|--------|
| OWASP / Next.js application review | [2026-07-29-owasp-nextjs-audit.md](./2026-07-29-owasp-nextjs-audit.md) | Top 10, auth, XSS, SSRF, session handling |
| API surface audit | [2026-07-29-api-audit.md](./2026-07-29-api-audit.md) | Route Handlers, Server Actions, BOLA, input validation |
| Dependency & supply chain | [2026-07-29-dependency-audit.md](./2026-07-29-dependency-audit.md) | `pnpm audit`, SBOM notes, upgrade paths |

Toolkit setup and skill inventory: [../context/2026-07-29-security-audit-toolkit.md](../context/2026-07-29-security-audit-toolkit.md).
