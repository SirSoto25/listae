# Listae — Library domains, profile section styling, display name

**Date:** 2026-07-22  
**Repo:** https://github.com/SirSoto25/listae  
**Status:** Approved (2026-07-22) — proceed to implementation plan  
**Related:** [2026-07-21-listae-design.md](./2026-07-21-listae-design.md), ADR 005 (profile HTML/CSS), ADR 009 (app theme — unrelated chrome)

## 1. Purpose

Reduce chaos in the personal library by separating **audiovisual** vs **reading** (with an explicit mixed “All” tab), let public profiles style those domains differently via **CSS placeholders + a domain theme picker** that writes CSS variables (ADR 005 intact), and ensure **no automatic email-derived display name** appears in the UI.

## 2. Decisions locked (brainstorming)

| Topic | Choice |
|-------|--------|
| Scope | `/library` **and** public profile |
| Library UX | Tabs **Audiovisual \| Lectura \| Todo**; filters apply to active tab |
| “Todo” tab | Single **mixed** list (current behavior) |
| Default `/library` | `domain=all` |
| Persistence | URL query params only (no DB/cookie for tab) |
| Domain styling | Placeholders + wrappers; **picker writes marked CSS var block** (approach C) |
| Free CSS | Remains editable; picker only rewrites the marked block |
| Display name | Equals **onboarding username**; never auto-fill from email |
| Username == email local-part | **Allow** + soft onboarding warning (does not block) |

## 3. Domains

| Domain | Work types |
|--------|------------|
| `audiovisual` | `anime`, `series`, `movie` |
| `reading` | `book`, `manga`, `comic` |
| `all` | all six |

Canonical helpers live in `src/types/domain.ts` (or adjacent module), e.g. `LIBRARY_DOMAINS`, `workTypesForDomain(domain)`, `domainForWorkType(type)`.

## 4. `/library`

### 4.1 URL

`/library?domain=audiovisual|reading|all&type=…&status=…&sort=…`

- Missing/invalid `domain` → **`all`**
- `type` filter constrained to types in the active domain; if `type` is outside the domain, treat as `all` types within that domain
- On domain tab change, reset `type` to `all` (keep `status`/`sort` unless product later changes this)

### 4.2 UI

- Tab control above filters
- `LibraryFilters`: Type options = types for active domain (or all six when `domain=all`)
- Entry query: `listLibraryEntries` accepts `domain` (or pre-filter types) in addition to existing filters
- Counts/copy reflect the active view

## 5. Public profile theme

### 5.1 Placeholders

| Placeholder | Behavior |
|-------------|----------|
| `{{audiovisual_lists}}` | Status sections for AV entries only |
| `{{reading_lists}}` | Status sections for reading entries only |
| `{{lists}}` | All entries (unchanged semantics) — **compat** |

Generated markup wraps each domain list in:

```html
<section class="listae-domain listae-domain--audiovisual" data-domain="audiovisual">…</section>
```

(and `--reading` / `data-domain="reading"`). Inner structure keeps existing `listae-status`, `listae-entry`, `data-type`, etc.

### 5.2 Default template + CSS

- Default HTML uses two domain sections (titles + `{{audiovisual_lists}}` / `{{reading_lists}}`) instead of a lone `{{lists}}`
- Default CSS styles `.listae-domain--audiovisual` and `.listae-domain--reading` via CSS variables (distinct look out of the box)
- **Restore default** loads the new template; stored themes that only use `{{lists}}` keep working

### 5.3 Domain theme picker (writes CSS)

On `/u/[username]/customize`:

- Controls per domain: background, accent, text color; optional heading font from a **Google Fonts allowlist** (same security posture as CSS `@import` rules)
- On apply/save path: upsert a marked block in `customCss`:

```css
/* listae:domain-vars:start */
.listae-domain--audiovisual {
  --listae-domain-bg: …;
  --listae-domain-accent: …;
  --listae-domain-fg: …;
  /* optional --listae-domain-font / @import handled per existing validator */
}
.listae-domain--reading { … }
/* listae:domain-vars:end */
```

- Rewrites **only** that block; if missing, insert at start of CSS
- User may edit CSS manually; next picker apply refreshes the marked block only
- Values still pass existing CSS validation / sanitizer before save
- Document new placeholders + picker in the customize editor hints

### 5.4 Out of profile scope

- No replacement of free HTML/CSS with a closed theme system
- No changes to iframe sandbox / no user JS

## 6. Display name = username (no email leakage)

### 6.1 Behavior

- **Onboarding:** when saving `username`, also set `displayName = username`
- **`createUser`:** do **not** set `displayName` from email (`displayNameFromEmail` removed from that path; helper may be deleted or kept unused)
- **Chrome / library / defaults:** never show email or auto-derived local-part; use `username` / synced `displayName`
- **Backfill:** for existing rows with `username` set, `UPDATE … SET display_name = username` (or equivalent) so old email local-parts disappear from UI

### 6.2 Username equals email local-part

- Still allowed (`USERNAME_PATTERN` already forbids `@`)
- If `normalizeUsername(username) === localPart(session.email).toLowerCase()`, show a **soft warning** on onboarding (copy in EN consistent with UI): e.g. “This matches the start of your sign-in email; it will appear on your public profile.”
- Submit is **not** blocked

### 6.3 `{{displayName}}` / `{{username}}`

- Remain both placeholders; after onboarding they resolve to the same string
- Default template may show one or both; no email string is ever passed into render args

## 7. Architecture / files (expected)

| Area | Files |
|------|--------|
| Domain constants | `src/types/domain.ts` (+ tests if pure helpers extracted) |
| Library query | `src/lib/lists/entries.ts` |
| Library UI | `src/app/library/page.tsx`, `src/components/library-filters.tsx`, new tabs component or inline |
| Placeholders | `src/lib/theme/placeholders.ts`, tests |
| Defaults | `src/lib/theme/defaults.ts` |
| Picker + editor | `src/components/theme-editor.tsx`, customize page; CSS block helpers e.g. `src/lib/theme/domain-vars.ts` |
| Display name | `src/app/onboarding/page.tsx`, `src/lib/auth/config.ts`, library eyebrow, backfill migration/script or one-time SQL in docs + code path |
| Docs | Context note (exists), optional ADR for domain split / displayName; customize README hint |

## 8. Testing & acceptance

**Automated**
- Domain helper unit tests
- `listLibraryEntries` filters by domain
- Placeholder tests for `{{audiovisual_lists}}` / `{{reading_lists}}` / wrappers; `{{lists}}` still works
- Domain-vars block upsert/replace idempotent tests
- Onboarding sets `displayName = username`; createUser does not set email local-part
- Warning condition unit test (local-part match)

**Manual**
- [ ] Tabs AV / Lectura / Todo; default All; filters scoped
- [ ] Profile default shows two domains; picker changes vars without wiping custom CSS outside the block
- [ ] Old theme with only `{{lists}}` still renders
- [ ] Library/profile show username, not email local-part for existing users after backfill
- [ ] Onboarding warning when username matches email local-part; can still save

## 9. Non-goals

- Separate editable display name ≠ username
- Blocking email-like usernames
- Persisting library tab in DB
- Social features / password auth

## 10. Open tuning (implementation-time)

- Exact default AV vs reading color pair (must fit cool indigo app chrome, not purple glow)
- Whether font picker is in v1 of picker or deferred to accent/bg/fg only first (spec allows optional font; implement bg/accent/fg first if time-boxed)
- Soft warning copy final wording
