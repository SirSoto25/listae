# Security audit reports (Listae)

**Date:** 2026-07-29  
**Branch:** `chore/security-skills`

## Executive summary

| Area | Result |
|------|--------|
| **Application code (OWASP + API)** | **0 Critical**, **2 High** — magic-link abuse surface and missing rate limits on anonymous search |
| **Dependencies (`pnpm audit`)** | **3 critical**, **10 high** — notably `next-auth` beta track and pending **Next.js** patch |
| **BOLA / IDOR (user-owned resources)** | **Clean** — ownership checks consistent on tested routes |

Prioritize: rate limiting on auth and public search, dependency upgrades (`next`, `next-auth`), then medium/low findings in the linked reports.

## Reports

| Report | File | Scope |
|--------|------|--------|
| OWASP / Next.js application review | [2026-07-29-owasp-nextjs-audit.md](./2026-07-29-owasp-nextjs-audit.md) | Top 10, auth, XSS, SSRF, session handling |
| API surface audit | [2026-07-29-api-audit.md](./2026-07-29-api-audit.md) | Route Handlers, Server Actions, BOLA, input validation |
| Dependency & supply chain | [2026-07-29-dependency-audit.md](./2026-07-29-dependency-audit.md) | `pnpm audit`, SBOM notes, upgrade paths |

Toolkit setup and skill inventory: [../context/2026-07-29-security-audit-toolkit.md](../context/2026-07-29-security-audit-toolkit.md).
