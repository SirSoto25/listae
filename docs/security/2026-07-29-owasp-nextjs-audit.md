# Security Audit Report — Listae (OWASP Top 10 / Next.js)

**Project:** Listae  
**Stack:** Next.js 16.2.10 App Router, Auth.js (next-auth 5.0.0-beta.31) magic link, Drizzle ORM + SQLite (better-sqlite3), sanitize-html, i18n middleware, custom profile themes (ADR 005)  
**Date:** 2026-07-29  
**Scope:** Static source review — application code, config, server actions, middleware, auth, theme/XSS pipeline, catalog integrations  
**Method:** Evidence-first grep + manual trace; no exploitation, no production probing  
**Related:** [2026-07-29-api-audit.md](./2026-07-29-api-audit.md) (API-focused companion)

---

## Executive Summary

Listae’s **user-owned data plane** (list entries, profile themes, locale/username) is **well isolated**: server actions resolve the actor from the session and scope writes with `userId` / session email, not client-supplied owner IDs. Profile XSS is **defense-in-depth** (sanitize-html on write/render, placeholder escaping, sandboxed iframe, inner CSP).

The highest residual risks are **resource abuse and misconfiguration**: no rate limiting on magic-link auth or public catalog search (upstream API cost / email harassment), missing runtime `AUTH_SECRET` enforcement, empty `next.config.ts` security headers, and a **global shared `works` catalog** writable by any authenticated user without quotas.

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 2 |
| Medium | 8 |
| Low | 5 |
| Info | 6 |
| **Total** | **23** |

### Items Checked and Found Clean

| Area | What was verified |
|------|-------------------|
| **A01 IDOR — list entries** | `addListEntry` / `updateListEntry` bind `userId` from session; updates require existing `(userId, workId)` row |
| **A01 IDOR — themes** | `saveThemeAction` updates `profileThemes` where `userId = session user`; customize page 404 when URL username ≠ owner |
| **A01 IDOR — profile locale** | `updateProfileLocaleAction` updates only the authenticated user's row |
| **A01 BFLA — server actions** | All `'use server'` mutation paths call `auth()` and redirect unauthenticated callers |
| **A03 SQLi** | Drizzle ORM only; no string-concatenated SQL in application code |
| **A03 Command injection** | No `exec`/`spawn`/`eval` in `src/` |
| **A03 Profile stored XSS (HTML)** | `sanitizeThemeHtml` + `escapeHtml` on placeholders; tests cover script/event-handler stripping |
| **A03 Profile entry URLs** | `safeHref` / `safeCoverUrl` restrict to same-origin paths or `https:` |
| **A03 Mass assignment — catalog import** | `importHitAction` passes only `source` + `externalId` to provider; forged title/type/cover ignored (tested) |
| **A05 Open redirect — returnPath** | `safeReturnPath` whitelist + control-char rejection; unit tests cover `//evil`, `\`, `%00` |
| **A05 Open redirect — Auth.js (external)** | `redirect` callback rejects `target.origin !== baseUrl` |
| **A07 Session strategy** | Database sessions (`session: { strategy: "database" }`) — server-side revocation possible |
| **A10 SSRF — user-controlled fetch URL** | Outbound `fetch` only to fixed TMDB / Open Library hostnames; external IDs validated with regex before fetch |
| **A10 Image optimizer SSRF** | No `remotePatterns` / `images.domains` configured (default deny) |
| **Secrets in tracked files** | `.gitignore` excludes `.env*` (allows only `.env.example`); no hardcoded API keys in `src/` |
| **Public profile data minimization** | `rowsToProfileEntries` omits `notes` and email; only curated DTO fields rendered |
| **Middleware CVE-2025-29927** | Next.js **16.2.10** (post-fix line); middleware is locale-only, not sole auth boundary |
| **CSRF on Server Actions** | Next.js origin validation + Auth.js CSRF on `/api/auth/*`; no custom tokens (acceptable for SameSite session cookies) |

---

## Findings

### Critical

#### LISTAE-022 — Auth.js beta: fail-open auth on configuration errors
| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **OWASP** | A06 Vulnerable and Outdated Components |
| **CWE** | CWE-1392 |
| **File** | `package.json:21` (`next-auth@5.0.0-beta.31`) |

**Evidence:** `pnpm audit --prod` (2026-07-29) reports [GHSA-8fpg-xm3f-6cx3](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3) — affected `>=5.0.0-beta.0 <=5.0.0-beta.31`; patched in `>=5.0.0`.

**Impact:** Misconfiguration can cause existence-based auth checks to fail open (`auth()` returns a populated error object instead of denying access).

**Remediation:** Upgrade `next-auth` to stable `>=5.0.0` and verify `auth()` callers treat error states as unauthenticated.

---

#### LISTAE-023 — Auth.js beta: email homoglyph @ bypass in normalizer
| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **OWASP** | A06 Vulnerable and Outdated Components / A07 Authentication Failures |
| **CWE** | CWE-178 |
| **File** | `package.json:21` (`next-auth@5.0.0-beta.31`) |

**Evidence:** `pnpm audit --prod` reports a second critical on the same package — email normalizer validates before Unicode normalization (homoglyph `@` bypass). Patched in `>=5.0.0`.

**Impact:** Magic-link sign-in may accept visually similar addresses, enabling account confusion or takeover in edge cases.

**Remediation:** Upgrade to `next-auth >=5.0.0`; retest magic-link flow with normalized email input.

---

### High

#### LISTAE-001 — No rate limiting on magic-link authentication
| Field | Value |
|-------|-------|
| **Severity** | High |
| **OWASP** | A04 Insecure Design / A07 Authentication Failures |
| **CWE** | CWE-770 |
| **File** | `src/app/[locale]/login/page.tsx:65-71`, `src/lib/auth/config.ts:30-53`, `src/app/api/auth/[...nextauth]/route.ts:3` |

**Evidence:**
```typescript
await signIn("nodemailer", {
  email: formData.get("email"),
  callbackUrl: localePath(locale, "/library"),
});
```
No rate-limit middleware, Upstash, or Auth.js rate-limit configuration exists. `src/middleware.ts` handles locale redirects only.

**Impact:** Unauthenticated attackers can trigger unbounded verification emails (harassment, SMTP cost, domain blocklisting) and probe addresses at scale.

**Remediation:** Add per-IP and per-email rate limits on `/api/auth/*` (edge WAF or `@upstash/ratelimit`), e.g. 5/email/15 min; return generic 429 without revealing account existence.

---

#### LISTAE-002 — Unauthenticated catalog search proxies to third-party APIs without limits
| Field | Value |
|-------|-------|
| **Severity** | High |
| **OWASP** | A04 Insecure Design |
| **CWE** | CWE-770 |
| **File** | `src/app/[locale]/page.tsx:36-38`, `src/lib/catalog/search.ts:58-64` |

**Evidence:**
```typescript
const results = query ? await searchCatalog(query, type, locale) : [];
// ...
searches.push(searchTmdb(normalizedQuery, typeFilter, locale));
searches.push(searchOpenLibrary(normalizedQuery, typeFilter));
```

**Impact:** Anonymous clients can exhaust TMDB API quota and Open Library bandwidth; novel queries bypass the 30-minute DB cache.

**Remediation:** Require authentication for search, or add IP rate limiting + max query length (≤100 chars) + global daily provider quota before outbound calls.

---

### Medium

#### LISTAE-003 — `AUTH_SECRET` not enforced at application startup
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A02 Cryptographic Failures |
| **CWE** | CWE-1392 |
| **File** | `src/lib/auth/index.ts:1-5`, `src/lib/auth/config.ts:17` |

**Evidence:** No `process.env.AUTH_SECRET` guard at module load. `.env.example` documents the variable but runtime does not require it. Auth.js may derive a weak dev default when unset.

**Impact:** Production deploy without a strong secret weakens session signing and verification-token integrity.

**Remediation:** Throw at module load in `src/lib/auth/config.ts` when `AUTH_SECRET` is missing in production.

---

#### LISTAE-004 — Auth redirect callback validates origin only, not pathname shape
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A01 Broken Access Control |
| **CWE** | CWE-601 |
| **File** | `src/lib/auth/config.ts:70-78` |

**Evidence:**
```typescript
async redirect({ url, baseUrl }) {
  const target = new URL(url, baseUrl);
  if (target.origin !== baseUrl) {
    return baseUrl;
  }
  return target.toString();
}
```
External origins are blocked (tested in `config.test.ts`), but same-origin paths such as `//attacker.tld` or paths containing control bytes are not normalized/rejected. Auth.js sign-in endpoints accept `callbackUrl` query parameters that flow into this callback.

**Impact:** Potential open-redirect / phishing chain when combined with browser path normalization quirks; defense-in-depth gap vs. `safeReturnPath` which uses strict path whitelists.

**Remediation:** After origin check, reject paths matching `^//`, `[\x00-\x1f\x7f\\]`, or `%2f%2f`; allow only locale-prefixed app paths (reuse `safeReturnPath` logic).

---

#### LISTAE-005 — Global catalog pollution via authenticated import/manual-create
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A01 Broken Access Control / A04 Insecure Design |
| **CWE** | CWE-799 |
| **File** | `src/lib/catalog/works.ts:143-168`, `src/app/actions/works.ts:37-71` |

**Evidence:** `works` table is global (no `createdByUserId`). Any logged-in user can `createManualWork` or `importWork` without quotas or moderation.

**Impact:** Spam/garbage catalog entries visible on `/title/[id]` for all users.

**Remediation:** Scope manual works to creator, add per-user quotas, or require admin flag for global catalog writes.

---

#### LISTAE-006 — Catalog import / locale backfill lacks rate limits and repeats upstream fetches
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A04 Insecure Design |
| **CWE** | CWE-770 |
| **File** | `src/app/actions/works.ts:37-51`, `src/app/[locale]/title/[id]/page.tsx:41-50`, `src/lib/catalog/works.ts:102-140` |

**Evidence:** Each `importHitAction` may call `resolveCatalogHit` (HTTP). Title page calls `fillMissingWorkLocale` on every render when locale text is missing, with no per-`workId` deduplication flag.

**Impact:** Authenticated or anonymous traffic can amplify TMDB/Open Library usage and SQLite write load.

**Remediation:** Per-user import rate limits; background job + “backfill attempted” flag instead of synchronous fetch on page view.

---

#### LISTAE-007 — `coverUrl` stored without server-side HTTPS validation
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A03 Injection (stored content) |
| **CWE** | CWE-20 |
| **File** | `src/app/actions/works.ts:63`, `src/lib/catalog/works.ts:158`, `src/components/work-cover.tsx:14-18` |

**Evidence:**
```typescript
coverUrl: String(formData.get("coverUrl") ?? "").trim() || undefined,
// ...
<img src={src} alt={alt} />
```
Profile theme path validates https-only (`placeholders.ts:63-73`); main app `WorkCover` does not.

**Impact:** Stored non-HTTPS URLs, tracker pixels, or oversized resources affect all viewers of a title page; inconsistent trust boundary vs. profile rendering.

**Remediation:** Parse with `URL`, require `protocol === "https:"`, reject others server-side in `createManualWork`.

---

#### LISTAE-008 — `notes` field has client-only length bound
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A04 Insecure Design |
| **CWE** | CWE-770 |
| **File** | `src/lib/lists/entries.ts:91`, `src/components/entry-form.tsx:178` |

**Evidence:** Textarea sets `maxLength={500}` but `normalizeEntryInput` accepts arbitrary-length `notes` via direct Server Action invocation.

**Impact:** Multi-megabyte notes per entry — SQLite bloat and DoS for the owning user (notes are private, not shown on public profile).

**Remediation:** Enforce `notes.length <= 500` in `normalizeEntryInput`.

---

#### LISTAE-009 — CSS `url()` validator accepts malformed `https:` prefixes
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A03 Injection |
| **CWE** | CWE-79 |
| **File** | `src/lib/theme/validate-css.ts:70-78` |

**Evidence:**
```typescript
if (!url.toLowerCase().startsWith("https:")) {
  errors.push({ message: "CSS url() values must use HTTPS.", ... });
}
```
Strings like `https:evil.com` (missing `//`) pass validation. Profile iframe CSP allows `img-src https: data:`.

**Impact:** Weak URL validation in user-controlled CSS; potential for unexpected resource loads inside profile iframe (tracking, parser differentials). XSS via script remains blocked by iframe sandbox + CSP `script-src 'none'`.

**Remediation:** Parse with `new URL()` and require `protocol === "https:"` and a non-empty hostname, matching `@import` validation style.

---

#### LISTAE-010 — Search cache table grows unbounded from attacker queries
| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **OWASP** | A04 Insecure Design |
| **CWE** | CWE-770 |
| **File** | `src/lib/cache/db-search-cache.ts:47-57`, `src/lib/catalog/search.ts:42-86` |

**Evidence:** Each novel `(locale, type, query)` inserts/updates a `search_cache` row with no global cap or eviction beyond TTL.

**Impact:** Disk exhaustion on SQLite volume from high-cardinality search queries (amplifies LISTAE-002).

**Remediation:** Cap cache entries, LRU eviction, or rate-limit before cache write.

---

### Low

#### LISTAE-011 — No HTTP security headers on main application
| Field | Value |
|-------|-------|
| **Severity** | Low |
| **OWASP** | A05 Security Misconfiguration |
| **CWE** | CWE-16 |
| **File** | `next.config.ts:3-5` |

**Evidence:** Empty Next.js config — no `headers()` for HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or CSP.

**Impact:** Increased clickjacking and MIME-sniffing risk on non-sandboxed app pages; no CSP backstop for the inline theme-detection script in `src/app/layout.tsx:53-57`.

**Remediation:** Add `headers()` with HSTS (production), `X-Frame-Options: DENY`, `nosniff`, baseline CSP with nonces for inline scripts.

---

#### LISTAE-012 — Magic-link URLs logged to stdout when SMTP unset
| Field | Value |
|-------|-------|
| **Severity** | Low |
| **OWASP** | A09 Security Logging and Monitoring Failures |
| **CWE** | CWE-532 |
| **File** | `src/lib/auth/config.ts:39-41` |

**Evidence:**
```typescript
console.log(`[listae magic link] ${identifier} -> ${url}`);
```

**Impact:** Verification tokens in centralized logs if dev-style config reaches staging/production.

**Remediation:** Gate on `NODE_ENV === "development"`; never log full URLs in production.

---

#### LISTAE-013 — Search query length unbounded before provider calls
| Field | Value |
|-------|-------|
| **Severity** | Low |
| **OWASP** | A04 Insecure Design |
| **CWE** | CWE-770 |
| **File** | `src/lib/catalog/search.ts:37-40` |

**Evidence:** No `maxLength` on catalog search input or server-side rejection of oversized `q`.

**Impact:** Amplifies provider abuse and cache pollution (LISTAE-002/010).

**Remediation:** Reject queries over 100–200 characters in `searchCatalog` before cache/provider calls.

---

#### LISTAE-014 — Username enumeration on onboarding
| Field | Value |
|-------|-------|
| **Severity** | Low |
| **OWASP** | A07 Authentication Failures |
| **CWE** | CWE-204 |
| **File** | `src/app/[locale]/onboarding/page.tsx:85-87,110-113` |

**Evidence:** Distinct redirect `?error=taken` vs `?error=invalid` reveals whether a username is registered.

**Impact:** Attackers can enumerate valid usernames (public profiles at `/u/[username]` anyway, so impact is limited).

**Remediation:** Use a generic error message for both failure modes.

---

#### LISTAE-015 — SQLite path from `DATABASE_URL` without hardening guidance
| Field | Value |
|-------|-------|
| **Severity** | Low |
| **OWASP** | A05 Security Misconfiguration |
| **CWE** | CWE-22 |
| **File** | `src/lib/db/index.ts:8-14` |

**Evidence:**
```typescript
const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/listae.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
```
No explicit file-permission setting; path fully controlled by env var.

**Impact:** Misconfigured `DATABASE_URL` (e.g. world-readable path on shared host) exposes sessions, emails, and private notes; path traversal if env is attacker-controlled.

**Remediation:** Document required `chmod 600` on DB file; reject relative paths escaping app root; consider SQLCipher for at-rest encryption.

---

### Informational

#### LISTAE-016 — Profile theme allows arbitrary HTTPS links and images (by design, ADR 005)
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A03 Injection |
| **File** | `src/lib/theme/sanitize-html.ts:24-36`, `docs/decisions/005-profile-html-css.md` |

**Evidence:** Sanitizer allows `<a href="https://…">` and `<img src="https://…">` with `allowedSchemes: ["https"]`.

**Impact:** Users can embed tracking pixels or phishing links on public profiles; mitigated by iframe sandbox (no scripts) and CSP inside `buildThemeDocument`.

**Remediation:** Optional: add `rel="noopener noreferrer"` via sanitizer transform; user education in customize UI.

---

#### LISTAE-017 — Middleware excludes `/u/*` and `/api/*` from locale redirect (intentional)
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A05 Security Misconfiguration |
| **File** | `src/middleware.ts:39-41` |

**Evidence:** `matcher: ["/((?!api|u/|_next/static|_next/image|favicon.ico|.*\\..*).*)"]`

**Impact:** Not a vulnerability — public profiles and Auth.js routes intentionally bypass locale middleware. Auth remains page/action-level.

**Remediation:** None required; document that middleware is not an auth boundary.

---

#### LISTAE-018 — No `server-only` import guard on database module
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A05 Security Misconfiguration |
| **File** | `src/lib/db/index.ts` |

**Evidence:** `better-sqlite3` imported without `import "server-only"`. Currently only imported from Server Components/actions.

**Impact:** Future accidental client import would bundle native module / expose DB path in build errors.

**Remediation:** Add `import "server-only"` to `src/lib/db/index.ts`.

---

#### LISTAE-019 — next-auth 5.0.0-beta.31 in production dependencies
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A06 Vulnerable and Outdated Components |
| **File** | `package.json:21` |

**Evidence:** `"next-auth": "5.0.0-beta.31"` — pre-release auth framework.

**Impact:** Beta API/behavior changes and unfixed security issues possible vs. stable release.

**Remediation:** Track stable Auth.js v5 release; run `pnpm audit` in CI when upgrading.

---

#### LISTAE-020 — Public profile exposes full library metadata by design
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A01 Broken Access Control |
| **File** | `src/app/u/[username]/page.tsx:41-47` |

**Evidence:** `listLibraryEntries(user.id)` renders all entries (title, score, status, progress, cover) on public `/u/[username]`. Notes and email excluded.

**Impact:** Users may not realize lists are fully public; privacy expectation mismatch.

**Remediation:** Document visibility in UI; future ADR for private profiles if needed.

---

#### LISTAE-021 — Inline scripts use static/hardcoded content (acceptable)
| Field | Value |
|-------|-------|
| **Severity** | Info |
| **OWASP** | A03 Injection |
| **File** | `src/app/layout.tsx:53-57`, `src/app/[locale]/layout.tsx:17-20` |

**Evidence:**
```tsx
__html: `(()=>{try{var d=window.matchMedia...`
__html: `document.documentElement.lang=${JSON.stringify(locale)};`
```
Locale is server-controlled (`es`|`en` only); theme script is static. No user input in JSON-LD breakout path.

**Impact:** None currently; CSP hardening must use nonces for these blocks.

**Remediation:** When adding CSP, use nonces rather than `'unsafe-inline'`.

---

## OWASP Top 10 (2021) Category Summary

| Category | Status | Notes |
|----------|--------|-------|
| **A01 Broken Access Control** | Findings | IDOR on user data: **clean**. Global catalog write access (LISTAE-005), auth redirect hardening (LISTAE-004), public profiles by design (LISTAE-020) |
| **A02 Cryptographic Failures** | Finding | AUTH_SECRET not enforced (LISTAE-003). Magic links via email — no password hashing surface |
| **A03 Injection** | Findings | Profile HTML/CSS pipeline hardened; gaps in `coverUrl` (LISTAE-007) and CSS `url()` validation (LISTAE-009) |
| **A04 Insecure Design** | Findings | Rate limits absent (LISTAE-001, 002, 006, 008, 010, 013); catalog abuse |
| **A05 Security Misconfiguration** | Findings | Empty `next.config.ts` (LISTAE-011); SQLite deployment (LISTAE-015); middleware scope (LISTAE-017) |
| **A06 Vulnerable Components** | **Critical findings** | `pnpm audit --prod` (2026-07-29): 2 critical CVEs in `next-auth@5.0.0-beta.31` (LISTAE-022, LISTAE-023); upgrade to `>=5.0.0` |
| **A07 Authentication Failures** | Findings | Magic-link rate limit (LISTAE-001); username enum (LISTAE-014). Database sessions — positive |
| **A08 Software/Data Integrity** | Clean | No unsafe deserialization; catalog import resolves server-side from provider |
| **A09 Logging Failures** | Finding | Magic links logged (LISTAE-012). No security event audit trail for auth failures |
| **A10 SSRF** | Clean | Fetches only to TMDB/Open Library fixed URLs; no user-supplied fetch targets |

---

## Server Action Audit Matrix

| Action | File | Auth | Ownership | Input validation | Verdict |
|--------|------|------|-----------|------------------|---------|
| `addToList` | `actions/entries.ts:54` | ✅ `requireUserId` | ✅ `userId` scoped | ⚠️ notes unbounded | Pass (1 gap) |
| `updateEntry` | `actions/entries.ts:72` | ✅ | ✅ | ⚠️ notes unbounded | Pass (1 gap) |
| `importHitAction` | `actions/works.ts:37` | ✅ session email | N/A (global catalog) | ✅ source/id whitelist | Fail — quota (LISTAE-005/006) |
| `createManualWorkAction` | `actions/works.ts:54` | ✅ | N/A (global catalog) | ⚠️ coverUrl | Fail — quota + coverUrl |
| `saveThemeAction` | `actions/theme.ts:22` | ✅ | ✅ `user.id` | ✅ CSS/HTML pipeline | **Pass** |
| `updateProfileLocaleAction` | `actions/theme.ts:60` | ✅ | ✅ | ✅ `isLocale` | **Pass** |
| Inline `signIn` | `login/page.tsx:65` | Public | N/A | email type=email | Fail — rate limit |
| Inline onboarding | `onboarding/page.tsx:64` | ✅ | ✅ email match | ✅ `USERNAME_PATTERN` | **Pass** |
| Inline `signOut` | `site-header.tsx:81` | Implicit session | N/A | N/A | Pass |
| Inline locale form | `customize/page.tsx:84` | ✅ delegates | ✅ | ✅ | **Pass** |

---

## XSS / Theme Pipeline Assessment (ADR 005)

| Layer | Control | Status |
|-------|---------|--------|
| HTML template write | `sanitizeThemeHtml` (sanitize-html, https-only links) | ✅ |
| HTML render | Placeholder `escapeHtml`; entry URLs via `safeHref` | ✅ |
| CSS write | `validateThemeCss` (@import allowlist, expression ban, url check) | ⚠️ LISTAE-009 |
| CSS render | Re-validated in `prepareThemeContent` | ✅ |
| Document wrapper | `escapeStyleEndTags`; CSP meta in iframe doc | ✅ |
| iframe | `sandbox=""` (no scripts, no same-origin) | ✅ |
| Main app pages | React text escaping | ✅ except `WorkCover` src (LISTAE-007) |

**Profile iframe note:** `sandbox=""` applies all sandbox restrictions. User JS cannot run. External `<a href="https://…">` links are allowed inside the iframe document — navigation stays sandboxed without `allow-top-navigation`.

---

## Prioritized Remediation Roadmap

| Priority | ID | Action |
|----------|-----|--------|
| Immediate | LISTAE-022, LISTAE-023 | Upgrade `next-auth` to stable `>=5.0.0` |
| Immediate | LISTAE-001 | Rate-limit magic-link auth (IP + email) |
| Immediate | LISTAE-002 | Rate-limit or auth-gate catalog search |
| This week | LISTAE-003 | Assert `AUTH_SECRET` at boot |
| This week | LISTAE-004 | Harden Auth.js redirect pathname validation |
| This week | LISTAE-005 | Catalog write quotas / ownership model |
| Short-term | LISTAE-006–008, 010 | Provider fetch dedup, coverUrl https, notes max length, cache cap |
| Short-term | LISTAE-009 | Strict CSS `url()` parsing |
| Scheduled | LISTAE-011–015 | Security headers, logging hygiene, query bounds, onboarding messages, SQLite hardening |
| Monitor | LISTAE-016–021 | Document / track; no code change required now |

---

## Dependency & Secret Scan Notes

- **Secrets in repo:** `.env.local` is **gitignored** (`.gitignore:37`) and **not tracked** (`git ls-files` — no match). Safe for commit hygiene; keep `AUTH_SECRET` out of version control.
- **Lockfile:** Project uses `pnpm-lock.yaml`; `npm audit` fails with ENOLOCK — use `pnpm audit --prod` in CI.
- **Pinned versions:** `next@16.2.10`, `sanitize-html@2.17.6`, `better-sqlite3@12.11.1`, `next-auth@5.0.0-beta.31`.
- **`pnpm audit --prod` (2026-07-29):** 2 **critical** advisories on `next-auth` beta.31 — see LISTAE-022, LISTAE-023. Priority upgrade to stable `>=5.0.0`.

---

*Static analysis only. No code was modified. No commits made. Re-audit after remediations with adversarial verification per OWASP audit skill.*
