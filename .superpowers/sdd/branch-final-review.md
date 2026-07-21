# Listae MVP — Final Whole-Branch Review

**Branch:** `feat/listae-mvp`
**Range:** `dc4ac98..113cbae` (79 files, +11268)
**Reviewer:** Senior Code Reviewer
**Date:** 2026-07-21

## Verdict: ✅ Approve with nits

The MVP is complete, spec-aligned, and well-layered. Every route, data-model,
and security control from the design spec and plan is present. Theme XSS defense
is genuinely defense-in-depth (allowlist sanitizer + escaped placeholders +
`iframe sandbox=""` + strict CSP). Auth/ownership checks are correct on every
mutating path. No Critical issues. Two Important items are low-real-impact and
may be fixed post-merge; the rest are minor/deferrable.

**Counts:** Critical **0** · Important **2** · Minor **7**

---

## Strengths

- **Theme security is layered and sound.** `renderTheme` validates CSS →
  sanitizes template (allowlist tags/attrs, `https` schemes only) → substitutes
  only server-escaped values. Output rendered in `iframe sandbox=""` with CSP
  `script-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com`.
  `buildThemeDocument` neutralizes `</style` breakout. Both public and preview
  views use the same sandbox path.
- **Import trust hardening** — `importHitAction` ignores client-supplied
  `type/title/cover` and re-resolves the hit server-side, verifying identity
  match (`works.ts`).
- **Data integrity** — unique indexes on `(externalSource, externalId)`,
  `(userId, workId)`, username/email; FK cascades; `foreign_keys = ON` pragma;
  concurrency-safe upsert (conflict-do-nothing + re-select).
- **Score/progress validation** centralized in `normalizeEntryInput` with
  1–10 bounds and per-type progress ceilings.
- **`SearchCacheStore` port** with stale-on-outage fallback (`Promise.allSettled`
  → serve stale hits when all providers fail). Cache TTL 1800s per spec.
- **CSS errors carry line/column/snippet**, satisfying the spec's precise-
  diagnostics requirement. Good unit coverage across theme, auth, cache,
  catalog, lists, and actions.

## Important (should fix; low real-world impact)

1. **CSS `@import` allowlist bypass on a single line.**
   `validateThemeCss` (`src/lib/theme/validate-css.ts:30`) inspects only the
   *first* `@import` per line (`line.match(/@import\b[^;]*(?:;|$)/i)`). A second
   import after `;` on the same line
   (`@import url(https://fonts.googleapis.com/x);@import url(https://evil/x.css);`)
   is never checked and the generic `url()` scan passes it because it is `https`.
   → The declared allowlist control is incomplete. **Mitigated** by the CSP
   `style-src` allowlist (the non-Google sheet won't load) and `sandbox=""`
   (no script execution), so it is not an XSS vector — but the validator should
   scan *all* `@import` occurrences (use `matchAll`, not per-line first-match).

2. **Missing spec §10 integration test.** Unit tests are strong, but there is no
   end-to-end path test (magic-link register → manual work → list entry →
   themed `/u/[username]` render). Spec explicitly lists this. Add before
   relying on it as a regression guard.

## Minor / Deferrable

- **Dead hidden inputs** in home import form (`page.tsx`: `type/title/year/
  coverUrl`) are never read by `importHitAction`. Remove to avoid confusion.
- **No manual-work dedup** — `createManualWork` writes `externalId: null`, so
  the partial unique index doesn't apply; repeated manual creates duplicate
  works. Acceptable per spec, but consider a soft title/type check.
- **Login redirect double-hop** — `redirect` callback rewrites `/library` →
  `/onboarding`, which bounces existing users back to `/library`. Works; extra
  hop. (Ledger "redirect hop".)
- **Provider outage during import/resolve** throws an error page (no cache for
  `resolve*`); manual entry remains available. Acceptable.
- **`parseCachedHits` casts** JSON to `CatalogHit[]` without shape validation
  (`search.ts:25`). Low risk (own-written cache). (Ledger noted.)
- **`validateThemeCss` false positives** — `expression(`/`url(` scans can match
  inside CSS string/comment content. UX-only. (Ledger noted.)
- **No committed Drizzle migrations** — schema reproduced via `db:push`. Fine
  for local-first MVP; add generated migrations before any hosted deploy.

## Spec coverage

All routes (`/`, `/login`, `/onboarding`, `/library`, `/title/[id]`,
`/u/[username]`, `/u/[username]/customize`), media types, statuses, magic-link
auth, hybrid catalog + cache, HTML/CSS theme engine (Google-Fonts-only imports,
line-level errors), and local-only constraints are implemented. Non-goals
(Nest/Mongo/Redis/social/hosting) respected.

**Path:** `d:\Documentos\Proyectos\listae\.superpowers\sdd\branch-final-review.md`

## Final fix wave

- CSS validation now checks every `@import` on a line and reports the rejected import.
- Added an integration test covering manual work creation, list entry creation, themed profile rendering, and invalid CSS rejection.
- Verification: `pnpm test` (14 files, 70 tests) and `pnpm lint` passed.
