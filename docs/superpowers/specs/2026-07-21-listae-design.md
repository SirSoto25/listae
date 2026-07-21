# Listae — Design Spec

**Date:** 2026-07-21  
**Repo:** https://github.com/SirSoto25/listae.git  
**Status:** Draft for user review

**Docs vivos:** decisiones en [`docs/decisions/`](../../decisions/), contexto en [`docs/context/`](../../context/). Ver [`docs/README.md`](../../README.md).

## 1. Purpose

Personal media tracker inspired by MyAnimeList, expanded beyond anime/manga. Multi-user (owner + friends), **not** social: no follows, long reviews, or friend graphs. At most a **1–10 score**.

**v1 media types:** `anime`, `series`, `movie`, `book`, `manga`, `comic`.

**Primary goals:**
- Track progress with MAL-like statuses
- Hybrid catalog (external APIs + manual entry)
- Public personal list page customizable with **free CSS** + editable **HTML template**
- Local-first development and testing before any public deploy

## 2. Users & auth

- Multiple accounts (you + friends), each with their own list and profile theme
- **Auth.js magic link** (email only, no password)
- Public profile at `/u/[username]` (readable without login)
- Customize theme only when authenticated as the owner

## 3. Architecture

**Approach:** Next.js full-stack (App Router), single deployable app.

```
Next.js (App Router + TypeScript)
├── UI (catalog, library, profile, customize)
├── Server Actions / Route Handlers
├── Auth.js (magic link)
├── Drizzle ORM
│   └── SQLite (local v1) — schema compatible with Postgres later
└── External APIs
    ├── TMDB → series/movies (and anime when discoverable there)
    ├── Open Library → books (manga/comic via API match or manual)
    └── Manual entry always available; dedicated anime API (e.g. AniList) optional later
```

**Explicit non-goals for v1:** Nest/separate Node API, MongoDB, Redis as runtime dependency, social features, production hosting.

**Cache strategy:** search results cached in the **database** behind a `SearchCacheStore` interface (`get` / `set` / `invalidate`) so a Redis implementation can replace the DB adapter later without changing search callers.

## 4. Routes (v1)

| Route | Purpose |
|-------|---------|
| `/` | Home / search |
| `/login` | Request magic link |
| `/library` | Owner’s list management |
| `/title/[id]` | Work detail + add/edit list entry |
| `/u/[username]` | Public themed list page |
| `/u/[username]/customize` | HTML template + CSS editor (owner only) |

## 5. Data model

### User
- `id`, `email`, `username` (unique), `displayName`, `createdAt`

### ProfileTheme (1:1 User)
- `htmlTemplate`, `customCss`, `updatedAt`

### Work (shared catalog)
- `id`
- `type`: `anime` | `series` | `movie` | `book` | `manga` | `comic`
- `title`, `originalTitle?`, `coverUrl?`, `year?`, `synopsis?`
- `externalSource?`: `tmdb` | `openlibrary` | `manual`
- `externalId?`
- Progress totals (optional): `episodesTotal?`, `chaptersTotal?`, `pagesTotal?`
- Uniqueness: prefer unique on `(externalSource, externalId)` when source is not manual

### ListEntry
- `userId`, `workId` (unique pair)
- `status`: `plan` | `in_progress` | `completed` | `on_hold` | `dropped`
- `score`: integer 1–10 or null
- `progressValue` (episode / chapter / page depending on type)
- Progress unit for book/manga/comic: `chapters` | `pages` (chosen when adding/editing)
- `startedAt?`, `finishedAt?`, `updatedAt`
- `notes?` (short optional text — not long-form reviews)

### SearchCache
- `key` (normalized query + type filters), `payload` (JSON), `expiresAt`, `createdAt`

## 6. Tracking behavior

Statuses (MAL-style labels in UI; enum values as above):
- Plan to Watch/Read
- Watching/Reading (`in_progress`)
- Completed
- On Hold
- Dropped

Progress by type:
- **anime / series:** episode counter (vs `episodesTotal` when known)
- **movie:** status + score; numeric progress optional/not required
- **book / manga / comic:** chapters **or** pages (user-selectable unit)

Library UI: filter by type and status; sort by score, title, or `updatedAt`; quick edit status / progress / score.

## 7. Catalog flow

1. User searches with optional type filter
2. App queries TMDB (series/movies/anime-as-available) and/or Open Library (server-side keys only); anime without a good API hit uses manual entry until a dedicated source is added
3. Unified result cards (title, cover, year, source)
4. Selecting a result upserts `Work` by external identity and opens add-to-list
5. Manual create form when API has no match
6. Search responses go through `SearchCacheStore` (DB implementation in v1)

Debounce client search; cache TTL on the order of 15–60 minutes.

## 8. Profile customization (HTML + CSS)

### Editor
- Default **HTML template** provided (sections by status, covers, score, progress)
- Free CSS textarea
- Live preview in sandboxed iframe
- Restore default template action

### Public render
1. Load theme + list entries
2. Server-side placeholder substitution
3. Inject validated CSS
4. Serve page **without** executing user JavaScript

### Placeholder examples
`{{username}}`, `{{lists}}`, and per-entry fields such as `{{entry.title}}`, `{{entry.status}}`, `{{entry.score}}`, `{{entry.progress}}`, `{{entry.cover}}`

### Security
- HTML allowlist (`div`, `span`, `img`, `ul`, `li`, `a`, `h1`–`h3`, `table`, …); strip `<script>` and `on*` handlers
- CSS: no `expression`; no arbitrary remote `@import`
- **Allowed `@import`:** Google Fonts only (`fonts.googleapis.com`, `fonts.gstatic.com`)
- Background/`url()` limited to `https`
- Preview and public view in iframe `sandbox` without `allow-scripts`

### CSS validation UX
On save/validate failure, report **precise diagnostics**:
- Line (and column when available) of the offending rule, **or**
- The exact disallowed `@import` / URL that failed the allowlist  
Do not return only a generic “invalid CSS” message.

## 9. Errors & limits

- Magic link invalid/expired → clear message + resend
- External API down → serve cache hit if present; otherwise suggest manual entry
- Duplicate external work → reuse existing `Work`
- Theme validation → structured errors with line / exact import as above

**v1 limits:** no social graph, no long reviews, no Redis runtime, **local run only** (no production deploy until the owner finishes local testing).

## 10. Testing

- **Unit:** CSS/HTML sanitizer (including Google Fonts allowlist and line-level error reporting), placeholder renderer, score bounds
- **Integration:** register via magic-link test path → manual work → list entry → themed profile render
- **Manual:** TMDB / Open Library search with real API keys

## 11. Local development

- `npm`/`pnpm` scripts for migrate + `next dev`
- Env: Auth secret, magic-link email provider, `TMDB_API_KEY`, optional Open Library (no key or as required)
- SQLite file in project (gitignored)
- Progress committed to GitHub repo `SirSoto25/listae` as features land; **hosting deploy deferred**

## 12. Future (out of scope now, designed for)

- Swap `SearchCacheStore` DB adapter → Redis
- SQLite → Postgres for hosted deploy
- Richer anime-specific metadata if TMDB/other sources warrant it
- Optional short notes UI polish / tags
