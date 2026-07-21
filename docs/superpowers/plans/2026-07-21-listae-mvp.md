# Listae MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local-first Next.js app where users magic-link in, search/add media (API + manual), track progress with MAL-like statuses and 1–10 scores, and publish a public `/u/[username]` page styled with a free HTML template + CSS (Google Fonts `@import` only).

**Architecture:** Single Next.js App Router app. Drizzle + SQLite. Auth.js magic link (dev: Magical/Ethreal or Auth.js credentials-free email provider logging links to console). Domain modules under `src/lib/` (db, auth, catalog, theme, cache). UI routes as in the spec. No Nest, Mongo, or Redis runtime.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, better-sqlite3 (or `@libsql/client` libsql file), Auth.js (next-auth v5), Vitest for unit tests, TMDB + Open Library HTTP clients.

**Skills to load while implementing:** `listae-theme-engine`, `listae-media-model`, `listae-catalog-providers`, `listae-docs-sync`, `frontend-design`, `user-profile-theme-engine`, `search-cache-store`, `test-driven-development`, `verification-before-completion`.

## Global Constraints

- Media types: `anime` | `series` | `movie` | `book` | `manga` | `comic`
- Statuses: `plan` | `in_progress` | `completed` | `on_hold` | `dropped`
- Score: integer 1–10 or null; no long reviews; optional short `notes`
- Auth: magic link only
- CSS `@import` allowlist: `fonts.googleapis.com`, `fonts.gstatic.com` only; errors must cite line/column or exact rejected import
- No user JavaScript on themed pages; iframe `sandbox` without `allow-scripts`
- Search cache via `SearchCacheStore` DB adapter; interface must allow Redis later
- Local-only deploy; commit progress to `SirSoto25/listae`
- Docs: update ADR/context when decisions change (`listae-docs-sync`)
- Package manager: `pnpm` preferred; `npm` acceptable if pnpm missing — pick one and stick to it in the repo

---

## File map (target)

```
listae/
├── .env.example
├── .gitignore
├── package.json
├── next.config.ts
├── drizzle.config.ts
├── vitest.config.ts
├── README.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # search home
│   │   ├── login/page.tsx
│   │   ├── library/page.tsx
│   │   ├── title/[id]/page.tsx
│   │   ├── u/[username]/page.tsx
│   │   ├── u/[username]/customize/page.tsx
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/                  # search, library, forms
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   └── migrate.ts
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   └── config.ts
│   │   ├── catalog/
│   │   │   ├── types.ts
│   │   │   ├── tmdb.ts
│   │   │   ├── openlibrary.ts
│   │   │   ├── search.ts
│   │   │   └── works.ts
│   │   ├── cache/
│   │   │   ├── types.ts
│   │   │   └── db-search-cache.ts
│   │   ├── lists/
│   │   │   └── entries.ts
│   │   └── theme/
│   │       ├── defaults.ts
│   │       ├── sanitize-html.ts
│   │       ├── validate-css.ts
│   │       ├── placeholders.ts
│   │       └── render.ts
│   └── types/
│       └── domain.ts
└── src/lib/theme/__tests__/
    ├── validate-css.test.ts
    ├── sanitize-html.test.ts
    └── placeholders.test.ts
```

---

### Task 1: Scaffold Next.js app + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.gitignore`, `.env.example`, `README.md`, `vitest.config.ts`
- Keep existing: `docs/`, `.cursor/`

**Interfaces:**
- Produces: runnable `pnpm dev` / `pnpm test` scripts

- [ ] **Step 1: Scaffold in the repo root without wiping docs**

From `d:\Documentos\Proyectos\listae` (docs already present):

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

If the CLI refuses a non-empty directory, scaffold into a temp folder and move `package.json`, `src/`, config files into the repo root without deleting `docs/` or `.cursor/`.

- [ ] **Step 2: Add Vitest + test script**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

In `package.json` scripts add: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: `.gitignore` and `.env.example`**

Ensure `.gitignore` includes:

```
node_modules
.next
.env
.env.local
*.db
*.db-*
data/
```

`.env.example`:

```
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000
# Dev: leave EMAIL unset to log magic links to server console
# EMAIL_SERVER=smtp://...
# EMAIL_FROM=Listae <noreply@localhost>
TMDB_API_KEY=
DATABASE_URL=file:./data/listae.db
```

- [ ] **Step 4: Smoke-run**

```bash
pnpm test
pnpm dev
```

Expected: Vitest exits 0 (0 tests OK); Next serves `/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
git push
```

---

### Task 2: Domain types + Drizzle schema + SQLite

**Files:**
- Create: `src/types/domain.ts`, `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`
- Modify: `package.json` (deps), `README.md` (migrate notes)

**Interfaces:**
- Produces: `db` export; tables `users`, `accounts`, `sessions`, `verificationTokens`, `profileThemes`, `works`, `listEntries`, `searchCache`

- [ ] **Step 1: Install Drizzle**

```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

- [ ] **Step 2: Write `src/types/domain.ts`**

```ts
export const WORK_TYPES = [
  "anime",
  "series",
  "movie",
  "book",
  "manga",
  "comic",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const LIST_STATUSES = [
  "plan",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const EXTERNAL_SOURCES = ["tmdb", "openlibrary", "manual"] as const;
export type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

export const PROGRESS_UNITS = ["episodes", "chapters", "pages"] as const;
export type ProgressUnit = (typeof PROGRESS_UNITS)[number];
```

- [ ] **Step 3: Write schema `src/lib/db/schema.ts`**

Include Auth.js Drizzle adapter tables (`users`, `accounts`, `sessions`, `verificationTokens`) plus:

```ts
// profileThemes: id, userId unique FK, htmlTemplate text, customCss text, updatedAt
// works: id, type, title, originalTitle, coverUrl, year, synopsis,
//   externalSource, externalId, episodesTotal, chaptersTotal, pagesTotal, createdAt
//   uniqueIndex on (externalSource, externalId) where both set
// listEntries: id, userId, workId, status, score (int nullable), progressValue,
//   progressUnit, notes, startedAt, finishedAt, updatedAt
//   unique(userId, workId)
// searchCache: key pk, payload text, expiresAt int, createdAt int
```

Use `text` enums or `text` + app-level validation. Prefer `sqliteTable` from `drizzle-orm/sqlite-core`.

Extend Auth `users` with `username` (unique, nullable until onboarding) and `displayName`.

- [ ] **Step 4: `src/lib/db/index.ts` + drizzle config**

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dbPath =
  process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/listae.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
```

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:./data/listae.db" },
});
```

Scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:push": "drizzle-kit push"`.

- [ ] **Step 5: Push schema**

```bash
pnpm db:push
```

Expected: `data/listae.db` created with tables.

- [ ] **Step 6: Commit**

```bash
git add src/types src/lib/db drizzle.config.ts package.json pnpm-lock.yaml README.md
git commit -m "feat: add Drizzle schema for users, works, lists, cache"
git push
```

---

### Task 3: Auth.js magic link (dev console provider)

**Files:**
- Create: `src/lib/auth/config.ts`, `src/lib/auth/index.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx` (session provider if needed for client bits)

**Interfaces:**
- Produces: `auth()`, `signIn`, `signOut` from `src/lib/auth/index.ts`
- Consumes: Drizzle schema users/accounts/sessions/verificationTokens

- [ ] **Step 1: Install Auth.js**

```bash
pnpm add next-auth@beta @auth/drizzle-adapter nodemailer
pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Auth config with Email provider**

In `src/lib/auth/config.ts`, use Drizzle adapter + Email provider. For local dev without SMTP, set a custom `sendVerificationRequest` that `console.log`s the URL:

```ts
async sendVerificationRequest({ url, identifier }) {
  console.log(`[listae magic link] ${identifier} -> ${url}`);
}
```

Callbacks: on first sign-in ensure `displayName` defaults from email local-part; if `username` null, redirect to a minimal `/onboarding` (can be part of login flow: after magic link, prompt username once).

Minimum viable: after login, if `!user.username`, show form on `/login` or `/onboarding` that sets unique `username` (slug `[a-z0-9_]{3,32}`).

- [ ] **Step 3: Wire route + login page**

`src/app/api/auth/[...nextauth]/route.ts` exports handlers.

`src/app/login/page.tsx`: email form calling `signIn("nodemailer", { email, callbackUrl: "/library" })`. Show hint: “Check server console for the magic link in local dev.”

- [ ] **Step 4: Manual test**

```bash
pnpm dev
```

Request link → copy URL from console → session works → set username if prompted.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: add Auth.js magic link login for local dev"
git push
```

---

### Task 4: CSS validator + HTML sanitizer (TDD)

**Files:**
- Create: `src/lib/theme/validate-css.ts`, `src/lib/theme/sanitize-html.ts`, `src/lib/theme/__tests__/validate-css.test.ts`, `src/lib/theme/__tests__/sanitize-html.test.ts`
- Skills: `listae-theme-engine`, TDD

**Interfaces:**
- Produces:
  - `validateThemeCss(css: string): { ok: true; css: string } | { ok: false; errors: ThemeCssError[] }`
  - `ThemeCssError = { message: string; line?: number; column?: number; snippet?: string }`
  - `sanitizeThemeHtml(html: string): string`

- [ ] **Step 1: Write failing CSS tests**

```ts
// src/lib/theme/__tests__/validate-css.test.ts
import { describe, expect, it } from "vitest";
import { validateThemeCss } from "../validate-css";

describe("validateThemeCss", () => {
  it("allows Google Fonts @import", () => {
    const css = `@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\nbody { color: red; }`;
    const result = validateThemeCss(css);
    expect(result.ok).toBe(true);
  });

  it("rejects non-Google @import with exact snippet", () => {
    const css = `@import url("https://evil.example/x.css");\nbody{}`;
    const result = validateThemeCss(css);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].snippet).toMatch(/evil\.example/);
      expect(result.errors[0].line).toBe(1);
    }
  });

  it("rejects expression()", () => {
    const css = `body { width: expression(alert(1)); }`;
    const result = validateThemeCss(css);
    expect(result.ok).toBe(false);
  });

  it("rejects non-https url()", () => {
    const css = `body { background: url("http://insecure/x.png"); }`;
    const result = validateThemeCss(css);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/theme/__tests__/validate-css.test.ts
```

Expected: fail (module missing).

- [ ] **Step 3: Implement `validate-css.ts`**

- Scan line-by-line for `@import`; allow only hosts `fonts.googleapis.com` and `fonts.gstatic.com`
- Reject `/expression\s*\(/i`, `/url\s*\(\s*['"]?(?!https:)/i` (allow `https:` only; allow bare relative if you choose — Listae: **https only**)
- Return `{ ok: true, css }` or errors with `line` / `snippet`

- [ ] **Step 4: Tests pass for CSS**

```bash
pnpm test src/lib/theme/__tests__/validate-css.test.ts
```

- [ ] **Step 5: HTML sanitizer tests + impl**

Tests: strips `<script>`, `onclick=`, keeps `<div>`, `<img src="https://...">`. Use a small allowlist walker (e.g. `linkedom` or `sanitize-html` package with explicit allowlist). Prefer dependency `sanitize-html` with locked allowTags/allowAttributes.

```bash
pnpm add sanitize-html
pnpm add -D @types/sanitize-html
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme
git commit -m "feat: validate theme CSS and sanitize theme HTML"
git push
```

---

### Task 5: Placeholders + default template + render

**Files:**
- Create: `src/lib/theme/defaults.ts`, `src/lib/theme/placeholders.ts`, `src/lib/theme/render.ts`, `src/lib/theme/__tests__/placeholders.test.ts`

**Interfaces:**
- Produces:
  - `DEFAULT_HTML_TEMPLATE: string`
  - `DEFAULT_CSS: string`
  - `renderProfileHtml(args: { template, username, displayName, entries }): string`
  - Entry shape: `{ title, type, status, score, progress, cover, url }`

- [ ] **Step 1: Failing placeholder tests**

```ts
import { describe, expect, it } from "vitest";
import { renderProfileHtml } from "../placeholders";

it("replaces username and entry fields", () => {
  const html = renderProfileHtml({
    template: `<h1>{{username}}</h1><div>{{entry.title}}-{{entry.score}}</div>`,
    username: "alex",
    displayName: "Alex",
    entries: [
      {
        title: "Dune",
        type: "book",
        status: "completed",
        score: 9,
        progress: "600/600p",
        cover: "https://example.com/d.jpg",
        url: "/title/1",
      },
    ],
  });
  expect(html).toContain("alex");
  expect(html).toContain("Dune-9");
});
```

Implement loop: if template contains `{{entry.` inside a `<!-- entry -->...<!-- /entry -->` block OR provide `{{lists}}` as server-built HTML from entries grouped by status. **Listae choice:** support both `{{lists}}` (pre-rendered sections) and a repeating block delimited by `{{#each entries}}` … `{{/each}}` — keep it simple: **only `{{lists}}` + top-level `{{username}}` / `{{displayName}}`**, where `{{lists}}` is generated by `buildListsHtml(entries)`.

Update test accordingly.

- [ ] **Step 2: Default template** groups by status with cover, title, score, progress.

- [ ] **Step 3: `render.ts`** — sanitize HTML template structure once; substitute; validate CSS; return `{ html, css }` or errors.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: profile placeholder renderer and default theme"
git push
```

---

### Task 6: SearchCacheStore (DB) + catalog search

**Files:**
- Create: `src/lib/cache/types.ts`, `src/lib/cache/db-search-cache.ts`, `src/lib/catalog/types.ts`, `src/lib/catalog/tmdb.ts`, `src/lib/catalog/openlibrary.ts`, `src/lib/catalog/search.ts`, `src/lib/catalog/works.ts`
- Optional test: normalize key + TTL expiry

**Interfaces:**
- Produces:
```ts
export interface SearchCacheStore {
  get(key: string): Promise<string | null>; // JSON payload
  set(key: string, payload: string, ttlSeconds: number): Promise<void>;
  invalidate(key?: string): Promise<void>;
}
export function createDbSearchCacheStore(): SearchCacheStore;
export function buildSearchCacheKey(query: string, typeFilter: string | "all"): string;
export type CatalogHit = {
  source: "tmdb" | "openlibrary";
  externalId: string;
  type: WorkType;
  title: string;
  year?: number;
  coverUrl?: string;
};
export async function searchCatalog(query: string, typeFilter: WorkType | "all"): Promise<CatalogHit[]>;
export async function upsertWorkFromHit(hit: CatalogHit): Promise<{ id: string }>;
export async function createManualWork(input: ManualWorkInput): Promise<{ id: string }>;
```

- [ ] **Step 1: Implement DB cache adapter** reading/writing `searchCache` table; skip expired rows.

- [ ] **Step 2: TMDB client** — `search/multi` or typed search; map to `CatalogHit`. Require `TMDB_API_KEY`; if missing, return `[]` and log once.

- [ ] **Step 3: Open Library** — `https://openlibrary.org/search.json?q=`

- [ ] **Step 4: `searchCatalog`** — check cache → fetch → set cache 1800s → return. On fetch throw, return cached payload if any.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: catalog search with DB search cache port"
git push
```

---

### Task 7: List entries + library + title pages

**Files:**
- Create: `src/lib/lists/entries.ts`, `src/app/library/page.tsx`, `src/app/title/[id]/page.tsx`, `src/components/library-filters.tsx`, `src/components/entry-form.tsx`, `src/app/actions/entries.ts`, `src/app/actions/works.ts`
- Modify: `src/app/page.tsx` (search UI)

**Interfaces:**
- Produces server actions: `addToList`, `updateEntry`, `createManualWorkAction`, `importHitAction`
- Score validation: reject `<1` or `>10`

- [ ] **Step 1: Unit test score clamp/validation helper**

```ts
export function parseScore(raw: unknown): number | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("score must be 1-10");
  return n;
}
```

- [ ] **Step 2: CRUD helpers in `entries.ts`** with progress unit rules from `listae-media-model`.

- [ ] **Step 3: `/` search page** — debounced input (300ms), type filter, results → import → redirect `/title/[id]`.

- [ ] **Step 4: `/title/[id]`** — show work + add/edit entry form (status, score, progress).

- [ ] **Step 5: `/library`** — auth required; filters; quick edit.

- [ ] **Step 6: Manual create** form linked from search empty state.

- [ ] **Step 7: Commit**

```bash
git commit -am "feat: library, title pages, and list entry tracking"
git push
```

---

### Task 8: Public profile + customize editor

**Files:**
- Create: `src/app/u/[username]/page.tsx`, `src/app/u/[username]/customize/page.tsx`, `src/app/actions/theme.ts`, `src/components/theme-editor.tsx`
- Ensure default theme row on user create / first customize

**Interfaces:**
- `saveThemeAction({ htmlTemplate, customCss })` → validate CSS → sanitize → save; return `{ ok:false, errors }` for UI
- Public page: render with `render.ts`; wrap in layout that injects `<style>` + sanitized HTML; outer preview iframe on customize

- [ ] **Step 1: Public page** loads user by username + entries + theme; 404 if missing.

- [ ] **Step 2: Customize page** owner-only (`auth()` username match); editor with default restore; show CSS errors with line/snippet.

- [ ] **Step 3: Preview iframe:**

```tsx
<iframe
  sandbox=""
  title="Theme preview"
  srcDoc={previewDoc}
  className="w-full min-h-[480px] border"
/>
```

(`sandbox=""` → no scripts).

- [ ] **Step 4: Manual test** — save CSS with bad `@import`, confirm exact error; save Google Fonts import, confirm OK; view `/u/you`.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: customizable public profile with HTML/CSS themes"
git push
```

---

### Task 9: README polish + context docs + verification

**Files:**
- Modify: `README.md`, `docs/context/2026-07-21-producto-y-alcance.md`
- Create: `docs/context/2026-07-21-mvp-impl-status.md` (checklist of tasks done)

- [ ] **Step 1: README** — setup (`pnpm i`, `pnpm db:push`, env, `pnpm dev`), magic link console note, TMDB key, scripts, link to spec.

- [ ] **Step 2: Run full unit tests**

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 3: Manual verification checklist**

- [ ] Magic link login + username
- [ ] Manual work + list entry + score
- [ ] Search with TMDB key (if present)
- [ ] Library filters
- [ ] Theme save rejection with line/import
- [ ] Public `/u/[username]` without login

- [ ] **Step 4: Commit + push**

```bash
git commit -am "docs: README and MVP verification notes"
git push
```

---

## Spec coverage (self-review)

| Spec area | Task |
|-----------|------|
| Next full-stack + SQLite + Drizzle | 1–2 |
| Magic link auth | 3 |
| Media types + statuses + score + progress | 2, 7 |
| Hybrid catalog + SearchCacheStore | 6–7 |
| Library / title / search routes | 7 |
| HTML+CSS theme + Google Fonts + line errors | 4–5, 8 |
| Public `/u/[username]` + customize | 8 |
| Local-first + GitHub commits | every task push |
| Unit tests sanitizer/placeholders/score | 4–5, 7 |
| No Nest/Mongo/Redis/social | Global constraints |

**Deferred (future plans, not this MVP):** Redis adapter impl, Postgres migrate, AniList, production email SMTP, hosting deploy.

## Placeholder scan

No TBD steps; deferred items explicitly listed above as out of this plan.
