# Security remediation (2026-07-29)

> Referencias `archivo:línea` a fecha 2026-07-29; pueden no coincidir con el código actual.

Branch: `fix/security-remediation`

## Fixed in this branch

| Finding | Remediation |
|---------|-------------|
| Dependency advisories (`next`, `next-auth`) | Upgraded to patched versions. `next` had new advisories later and was bumped to 16.4.5 on 2026-11-04 (with `nodemailer` 10, `sanitize-html` 2.18 and transitive overrides); see `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T0.1) |
| Missing `AUTH_SECRET` enforcement | Startup throw in `src/lib/auth/config.ts` |
| Magic-link / search abuse (LISTAE-001, API4) | In-memory rate limits on auth email + catalog search. Replaced on 2026-11-04 by SQLite-backed limits with a trusted client IP (SEC-A2, ADR 014) |
| Input bounds (notes, search query, `coverUrl`) | Server-side validation tightened |
| Missing security headers (LISTAE-011) | `next.config.ts` — nosniff, frame deny, referrer, permissions, HSTS |
| Magic links logged in production (LISTAE-012) | Full URL only when `NODE_ENV !== "production"` and `EMAIL_SERVER` unset |
| CSS `url()` prefix bypass (LISTAE-009) | Require well-formed `https:` URLs via `URL` parser |
| DB module client import risk | `import "server-only"` in `src/lib/db/index.ts` |

## Deferred (follow-up)

| Item | Rationale |
|------|-----------|
| **Full Content-Security-Policy** | Theme editor/preview uses inline styles and sandboxed `srcDoc`; app-level CSP risks breakage. Profile iframe already ships restrictive CSP. |
| **Global `works` catalog quotas** | Needs product decision on per-user import limits |
| **`search_cache` eviction / TTL** | Operational hardening; not blocking for MVP |
| **Username enumeration on login** | UX trade-off; generic errors already partially applied |
| **Production `EMAIL_SERVER` assertion** | Warn-only when unset; configure SMTP in deploy |

See also: [OWASP audit](./2026-07-29-owasp-nextjs-audit.md), [API audit](./2026-07-29-api-audit.md), [dependency audit](./2026-07-29-dependency-audit.md).
