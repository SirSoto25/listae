# Dependency & Stack Security Audit

## Project: listae
## Stack: Node.js (pnpm), Next.js 16.2.10, React 19, Auth.js (next-auth 5 beta), Drizzle + better-sqlite3
## Date: 2026-07-29

### Executive summary

`pnpm audit` reports **22 findings**: **3 critical**, **10 high**, **9 moderate**, **0 low/info**. The highest risk is **Auth.js / next-auth 5.0.0-beta.31** (fail-open auth checks, email homoglyph bypass) and **Next.js 16.2.10** (one patch behind 16.2.11+). No hardcoded production secrets were found in tracked application code; `.env` is not committed (only `.env.example`).

---

### Stack inventory

| Component | Declared (package.json) | Locked (pnpm-lock.yaml) | Notes |
|-----------|-------------------------|-------------------------|-------|
| next | 16.2.10 (exact) | 16.2.10 | Latest on registry: 16.2.12 |
| next-auth | 5.0.0-beta.31 (exact) | 5.0.0-beta.31 | **Beta**; newer beta 5.0.0-beta.32 available |
| @auth/core (transitive) | — | 0.41.2 | Via next-auth + @auth/drizzle-adapter |
| react / react-dom | 19.2.4 (exact) | 19.2.4 | |
| better-sqlite3 | ^12.11.1 | 12.11.1 | Native addon; caret range |
| nodemailer | ^9.0.3 | 9.0.3 | Magic-link email |
| sanitize-html | ^2.17.6 | 2.17.6 | Theme HTML sanitization |
| drizzle-orm / drizzle-kit | ^0.45.2 / ^0.31.10 | (lockfile) | |
| sharp (transitive) | — | 0.34.5 | Optional dep of `next` |

**Lockfile:** `pnpm-lock.yaml` is tracked. **Versioning:** Most runtime deps use `^`; `next`, `next-auth`, `react`, and `eslint-config-next` are exact-pinned.

**Total dependencies (audit metadata):** 630 (116 prod, 479 dev, 178 optional).

---

### Known vulnerabilities (`pnpm audit`)

| Package | Installed | Severity | Reachability | Advisory / theme | Fix |
|---------|-----------|----------|--------------|------------------|-----|
| next-auth | 5.0.0-beta.31 | critical | **runtime** | Fail-open auth on config errors ([GHSA-8fpg-xm3f-6cx3](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3)) | Advisory lists `>=5.0.0`; stable not on npm — try **5.0.0-beta.32+** and re-audit |
| next-auth | 5.0.0-beta.31 | critical | **runtime** | Email homoglyph `@` bypass ([GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh)) | Same as above |
| @auth/core | 0.41.2 | critical | **runtime** | Email homoglyph bypass (transitive) | `>=0.41.3` via next-auth beta.32 or pnpm override |
| next | 16.2.10 | high (×4) | **runtime** | Middleware/proxy bypass, Server Action DoS/SSRF, rewrite SSRF ([GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24), etc.) | **>=16.2.11** (registry: 16.2.12) |
| @auth/core / next-auth | 0.41.2 / beta.31 | high | **runtime** | Malformed Bearer → uncaught exception in `getToken()` | `>=0.41.3` / next-auth beta.32+ |
| sharp | 0.34.5 | high | **runtime** (if image opt. used) | libvips CVEs ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)) | Transitive via `next`; upgrade `next` / let sharp resolve to >=0.35 |
| postcss | 8.4.31 | moderate + high | **build** (Next toolchain) | XSS / source map path issues | Transitive; fixed when Next pulls >=8.5.18 |
| next-auth / @auth/core | beta.31 / 0.41.2 | moderate | **runtime** | OAuth state/PKCE cookies not provider-bound ([GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279)) | `>=0.41.3` / beta.32+ |
| next | 16.2.10 | moderate (×5) | **runtime** | Cache confusion, Edge payload, image DoS, Server Function disclosure | **>=16.2.11** |
| esbuild | 0.18.20 | moderate | **dev-only** | Dev server request leak ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)) | Via `drizzle-kit`; dev-only |
| brace-expansion | 1.1.16 / 5.0.7 | high | **dev-only** | ReDoS / OOM ([GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg)) | Via eslint toolchain |

**Severity totals (pnpm):** critical 3 | high 10 | moderate 9 | low 0 | info 0

---

### Review: flagged direct dependencies

#### sanitize-html (^2.17.6)

- **Audit:** No advisory for installed 2.17.6.
- **Usage:** `src/lib/theme/sanitize-html.ts` — explicit `allowedTags`, `allowedAttributes`, `allowedSchemes: ["https"]`, no protocol-relative URLs.
- **Risk:** Configuration-dependent XSS if allowlist is loosened; keep tests (`sanitize-html.test.ts`) when changing tags/attributes.

#### next-auth (5.0.0-beta.31)

- **Audit:** Multiple **critical/high** Auth.js advisories; pinned to last vulnerable beta per audit ranges.
- **App:** Magic link via Nodemailer, database sessions, Drizzle adapter (`src/lib/auth/config.ts`).
- **Risk:** Beta channel + advisories affecting email normalization and auth fail-open behavior are **production-relevant** for this app.
- **Action:** Bump to **5.0.0-beta.32** (ships `@auth/core@0.41.3`), run `pnpm audit` again; watch for stable `5.0.0`. Ensure `AUTH_SECRET` is set in all non-local environments (not asserted in code today).

#### better-sqlite3 (^12.11.1)

- **Audit:** Clean.
- **Risk:** Native binary supply chain; file DB path from `DATABASE_URL` — protect DB file permissions in deployment; not suitable for multi-instance serverless without external DB.

#### nodemailer (^9.0.3)

- **Audit:** Clean for direct dep.
- **Usage:** Optional SMTP; dev falls back to console logging when `EMAIL_SERVER` unset — good for local dev, ensure SMTP is configured in production.

---

### Lockfile notes

- **Beta / prerelease:** `next-auth@5.0.0-beta.31` exact-pinned (good for reproducibility; still prerelease).
- **Unpinned transitives:** `@auth/core@0.41.2` lags patched `0.41.3` until next-auth or overrides update.
- **Caret direct deps:** Most non-Next packages use `^` — acceptable with committed lockfile; CI should use `pnpm install --frozen-lockfile` when pipelines exist (no `.github/workflows` found at audit time).

---

### Secret scanning (tracked files)

Patterns searched: API keys, `sk_live_` / `sk_test_`, `ghp_`, `AKIA…`, PEM private keys, high-entropy JWT literals in app code.

| Result | Details |
|--------|---------|
| **No committed secrets** | `.env` / `.env.local` not tracked; `.env.example` has placeholders only |
| **Expected matches** | Schema/column names (`session_token`, `verification_tokens`), auth docs in `.cursor/` / `.agents/` skills, test fixtures (`token=abc`, sample TMDB key `abc123`) |
| **Env usage** | `TMDB_API_KEY`, `AUTH_SECRET`, `EMAIL_*`, `DATABASE_URL` read server-side; no `NEXT_PUBLIC_*` secrets in app source |

**Recommendation:** Add startup assertion for `AUTH_SECRET` (and production `EMAIL_SERVER`) in auth bootstrap; consider `import "server-only"` in `src/lib/db/index.ts` and `src/lib/catalog/tmdb.ts`.

---

### Supply chain / framework notes

- **Postinstall scripts:** No custom `postinstall` in root `package.json`; review if adding deps with lifecycle scripts.
- **Auth email normalization:** Homoglyph advisory is especially relevant for magic-link sign-in — prioritize Auth.js patch path.
- **Next.js:** Single-locale App Router + middleware — review [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) against your middleware/proxy setup after upgrading.

---

### Prioritized action plan

1. **Critical — Auth.js:** Upgrade `next-auth` to **5.0.0-beta.32** (or latest 5.x beta), align `@auth/drizzle-adapter`, re-run `pnpm audit`. If advisories remain until stable 5.0.0, document residual risk and monitor [Auth.js advisories](https://github.com/nextauthjs/next-auth/security).
2. **High — Next.js:** Bump `next` and `eslint-config-next` to **>=16.2.11** (e.g. **16.2.12**), run tests and `next build`.
3. **High — Transitive sharp/libvips:** Confirm resolved `sharp` >=0.35 after Next upgrade (`pnpm why sharp`).
4. **Medium — Dev tooling:** Plan `drizzle-kit` / eslint upgrades for esbuild and brace-expansion (dev-only; lower release priority).
5. **Medium — Hardening:** Assert required env vars at startup; add `server-only` to DB/TMDB modules; keep `sanitize-html` allowlist strict.

---

### Commands run

```bash
pnpm audit
pnpm audit --json
pnpm view next-auth version
pnpm view next version
git grep (secret patterns)
```

Audit JSON metadata: vulnerabilities `{ critical: 3, high: 10, moderate: 9, low: 0, info: 0 }`.
