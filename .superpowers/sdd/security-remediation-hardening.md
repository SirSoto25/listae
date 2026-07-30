# Security remediation hardening

**Branch:** `fix/security-remediation`  
**Scope:** AppSec findings from `docs/security/2026-07-29-*.md`

## Changes

1. **AUTH_SECRET** — `src/lib/auth/config.ts` throws at module load if missing/empty.
2. **Rate limiting** — `src/lib/security/rate-limit.ts` (fixed window Map + tests). Login: 5/hour per email, 20/hour per IP. Catalog search: 30/hour per IP.
3. **Search input** — `searchCatalog` rejects queries >200 chars; returns `[]` when rate-limited.
4. **Notes length** — `normalizeEntryInput` rejects notes >500 chars.
5. **coverUrl** — `createManualWorkAction` requires valid `https:` URLs.
6. **Auth redirect** — redirect callback uses `safeReturnPath` instead of permissive same-origin checks.

## Deferred

- Full CSP headers (next task)
- Works ownership column / quotas

## Verification

`pnpm test` — 143 passed.
