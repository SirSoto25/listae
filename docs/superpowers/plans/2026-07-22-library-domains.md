# Library Domains + Profile Section Styling + DisplayName Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the personal library into audiovisual / reading / all tabs, add profile placeholders and a domain CSS-variable picker, and sync `displayName` to the chosen username with no email-derived UI.

**Architecture:** Pure domain helpers drive library query filters and URL tabs. Profile rendering gains `{{audiovisual_lists}}` / `{{reading_lists}}` wrappers; a marked CSS block (`listae:domain-vars`) is upserted by a customize picker without replacing free CSS. Auth onboarding sets `displayName = username`; `createUser` stops email local-part assignment; one-shot backfill for existing users.

**Tech Stack:** Next.js 16 App Router, Drizzle/SQLite, Vitest, existing theme sanitize/validate pipeline.

**Spec:** `docs/superpowers/specs/2026-07-22-library-domains-design.md`

## Global Constraints

- Cookie/DB library-tab persistence: **out of scope** (URL `domain` only).
- Default missing/invalid `domain` → **`all`**.
- Domains: `audiovisual` = anime/series/movie; `reading` = book/manga/comic; `all` = six types.
- Keep `{{lists}}` for compatibility; add `{{audiovisual_lists}}` and `{{reading_lists}}`.
- Theme picker rewrites **only** the marked CSS block `/* listae:domain-vars:start */` … `/* listae:domain-vars:end */`.
- ADR 005: free HTML/CSS remains; no user JS; Google Fonts `@import` rules unchanged.
- v1 picker: **background, accent, text** per domain (font picker deferred).
- `displayName = username` at onboarding; **never** auto-fill from email in `createUser`.
- Username == email local-part: **allow** + soft warning (non-blocking).
- Before context compaction: dump living state to `docs/context/`.
- Conventional commits; exclude `.superpowers/sdd/**`; PowerShell-friendly commit messages (no literal `EOF` in PR bodies).

---

## File map

| File | Responsibility |
|------|----------------|
| `src/types/domain.ts` | `LIBRARY_DOMAINS`, helpers |
| `src/types/domain.test.ts` | Domain helper tests |
| `src/lib/lists/entries.ts` | `LibraryFilters.domain` |
| `src/lib/lists/entries.test.ts` | Extend or add domain filter tests |
| `src/components/library-domain-tabs.tsx` | Tab UI |
| `src/components/library-filters.tsx` | Domain-aware type options + query updates |
| `src/app/library/page.tsx` | Parse `domain`, wire tabs/filters |
| `src/lib/theme/placeholders.ts` | Domain list builders + wrappers |
| `src/lib/theme/__tests__/placeholders.test.ts` | Placeholder coverage |
| `src/lib/theme/defaults.ts` | Dual-domain default HTML/CSS + var block |
| `src/lib/theme/domain-vars.ts` | Parse/upsert marked CSS block |
| `src/lib/theme/domain-vars.test.ts` | Idempotent upsert tests |
| `src/components/theme-editor.tsx` | Picker UI + hints |
| `src/lib/auth/config.ts` | Remove email displayName on createUser |
| `src/lib/auth/validation.ts` | `emailLocalPart`, `usernameMatchesEmailLocalPart`; drop or stop exporting unused email display helper |
| `src/app/onboarding/page.tsx` | Set displayName; soft warning |
| Backfill | `src/lib/auth/backfill-display-names.ts` + call from onboarding/library once OR drizzle script documented |
| Docs | ADR 010, context, mark spec Approved |

---

### Task 1: Domain helpers (TDD)

**Files:**
- Modify: `src/types/domain.ts`
- Create: `src/types/domain.test.ts`

**Interfaces:**
- Produces:
  - `LIBRARY_DOMAINS = ["audiovisual", "reading", "all"] as const`
  - `type LibraryDomain = (typeof LIBRARY_DOMAINS)[number]`
  - `parseLibraryDomain(value?: string | null): LibraryDomain` → invalid/missing → `"all"`
  - `workTypesForDomain(domain: LibraryDomain): readonly WorkType[]`
  - `domainForWorkType(type: WorkType): "audiovisual" | "reading"`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  domainForWorkType,
  parseLibraryDomain,
  workTypesForDomain,
} from "./domain";

describe("parseLibraryDomain", () => {
  it("defaults missing or invalid to all", () => {
    expect(parseLibraryDomain(undefined)).toBe("all");
    expect(parseLibraryDomain("nope")).toBe("all");
  });

  it("accepts audiovisual, reading, all", () => {
    expect(parseLibraryDomain("audiovisual")).toBe("audiovisual");
    expect(parseLibraryDomain("reading")).toBe("reading");
    expect(parseLibraryDomain("all")).toBe("all");
  });
});

describe("workTypesForDomain", () => {
  it("returns AV types", () => {
    expect([...workTypesForDomain("audiovisual")]).toEqual([
      "anime",
      "series",
      "movie",
    ]);
  });

  it("returns reading types", () => {
    expect([...workTypesForDomain("reading")]).toEqual([
      "book",
      "manga",
      "comic",
    ]);
  });

  it("returns all six for all", () => {
    expect(workTypesForDomain("all")).toHaveLength(6);
  });
});

describe("domainForWorkType", () => {
  it("maps movie to audiovisual and book to reading", () => {
    expect(domainForWorkType("movie")).toBe("audiovisual");
    expect(domainForWorkType("book")).toBe("reading");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- src/types/domain.test.ts`

- [ ] **Step 3: Implement helpers in `domain.ts`**

```ts
export const LIBRARY_DOMAINS = ["audiovisual", "reading", "all"] as const;
export type LibraryDomain = (typeof LIBRARY_DOMAINS)[number];

const AUDIOVISUAL_TYPES = ["anime", "series", "movie"] as const satisfies readonly WorkType[];
const READING_TYPES = ["book", "manga", "comic"] as const satisfies readonly WorkType[];

export function parseLibraryDomain(
  value?: string | null,
): LibraryDomain {
  if (value === "audiovisual" || value === "reading" || value === "all") {
    return value;
  }
  return "all";
}

export function workTypesForDomain(
  domain: LibraryDomain,
): readonly WorkType[] {
  if (domain === "audiovisual") return AUDIOVISUAL_TYPES;
  if (domain === "reading") return READING_TYPES;
  return WORK_TYPES;
}

export function domainForWorkType(
  type: WorkType,
): "audiovisual" | "reading" {
  return (AUDIOVISUAL_TYPES as readonly string[]).includes(type)
    ? "audiovisual"
    : "reading";
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/types/domain.test.ts
git commit -m "feat: add library domain helpers"
```

---

### Task 2: Filter library entries by domain (TDD)

**Files:**
- Modify: `src/lib/lists/entries.ts`
- Create or modify: `src/lib/lists/entries.test.ts` (follow existing test patterns in repo; if none for listLibraryEntries, create focused DB-memory tests like other `*.test.ts`)

**Interfaces:**
- Extends `LibraryFilters` with `domain?: LibraryDomain`
- When `domain` is `audiovisual`/`reading` and `type` is `all` or omitted: restrict `works.type` to `workTypesForDomain(domain)` via `inArray`
- When `type` is a concrete type outside the domain: ignore it and treat as all types in domain (per spec)

- [ ] **Step 1: Write failing test** that seeds AV + reading works/entries and asserts `domain: "audiovisual"` returns only AV.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement** using `inArray` from drizzle-orm:

```ts
import { inArray } from "drizzle-orm";
import { parseLibraryDomain, workTypesForDomain, type LibraryDomain } from "@/types/domain";

export type LibraryFilters = {
  domain?: LibraryDomain;
  type?: WorkType | "all";
  status?: ListStatus | "all";
  sort?: "updatedAt" | "score" | "title";
};

// inside listLibraryEntries:
const domain = parseLibraryDomain(filters.domain ?? "all");
const allowed = workTypesForDomain(domain);
const type =
  filters.type &&
  filters.type !== "all" &&
  (allowed as readonly string[]).includes(filters.type)
    ? filters.type
    : "all";

if (type !== "all") {
  conditions.push(eq(works.type, type));
} else if (domain !== "all") {
  conditions.push(inArray(works.type, [...allowed]));
}
```

- [ ] **Step 4: PASS + commit**

```bash
git commit -m "feat: filter library entries by media domain"
```

---

### Task 3: Library tabs + domain-aware filters UI

**Files:**
- Create: `src/components/library-domain-tabs.tsx`
- Modify: `src/components/library-filters.tsx`
- Modify: `src/app/library/page.tsx`

**Interfaces:**
- Tabs client component updates `domain` in URL; **resets `type` to `all`**; keeps `status`/`sort`
- Filters receive `domain` and only list `workTypesForDomain(domain)` in Type select
- Page parses `domain` with `parseLibraryDomain`, passes into `listLibraryEntries` and UI
- Eyebrow uses `user.username` (not email-derived displayName) — prepare for Task 8; if still showing `displayName`, switch to `username` now or in Task 8

- [ ] **Step 1: Implement `LibraryDomainTabs`**

```tsx
"use client";
// props: domain, status, sort
// links or buttons that router.replace(`/library?domain=…&type=all&status=…&sort=…`)
// labels: Audiovisual | Reading | All
```

- [ ] **Step 2: Update `LibraryFilters`** to accept `domain: LibraryDomain` and constrain type options; include `domain` in every `URLSearchParams` update.

- [ ] **Step 3: Wire `library/page.tsx`** searchParams `domain`, default all.

- [ ] **Step 4: Manual smoke or `pnpm test` + `tsc`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add audiovisual/reading/all library tabs"
```

---

### Task 4: Profile placeholders for domain lists (TDD)

**Files:**
- Modify: `src/lib/theme/placeholders.ts`
- Modify: `src/lib/theme/__tests__/placeholders.test.ts`

**Interfaces:**
- `buildListsHtml(entries)` unchanged for `{{lists}}`
- Add `buildDomainListsHtml(entries, domain: "audiovisual" | "reading")` that filters via `domainForWorkType`, wraps with:

```html
<section class="listae-domain listae-domain--audiovisual" data-domain="audiovisual">…status sections…</section>
```

- `renderProfileHtml` replacements include `{{audiovisual_lists}}` and `{{reading_lists}}`

- [ ] **Step 1: Failing tests** for placeholders and wrapper classes; assert `{{lists}}` still expands.

- [ ] **Step 2: Implement**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "feat: add audiovisual and reading profile list placeholders"
```

---

### Task 5: Default profile template with dual domains

**Files:**
- Modify: `src/lib/theme/defaults.ts`
- Modify tests that assert `DEFAULT_HTML_TEMPLATE` contains `{{lists}}` — update to expect domain placeholders instead (and keep a test that `{{lists}}` still works if used)

**Default HTML sketch:**

```html
<div class="listae-profile">
  <section class="listae-profile-header">
    <h1>{{displayName}}</h1>
    <p class="listae-profile-username">@{{username}}</p>
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Audiovisual</h2>
    {{audiovisual_lists}}
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Reading</h2>
    {{reading_lists}}
  </section>
</div>
```

**Default CSS:** include domain-vars block + styles using `var(--listae-domain-bg)` etc. on `.listae-domain--audiovisual` / `--reading` (cool indigo-adjacent AV, slightly warmer/neutral reading — no purple glow).

- [ ] **Step 1: Update defaults + fix tests**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: default profile template splits audiovisual and reading"
```

---

### Task 6: Domain CSS vars block helpers (TDD)

**Files:**
- Create: `src/lib/theme/domain-vars.ts`
- Create: `src/lib/theme/domain-vars.test.ts`

**Interfaces:**

```ts
export type DomainColorVars = {
  bg: string;
  accent: string;
  fg: string;
};

export type DomainVarsInput = {
  audiovisual: DomainColorVars;
  reading: DomainColorVars;
};

export const DOMAIN_VARS_START = "/* listae:domain-vars:start */";
export const DOMAIN_VARS_END = "/* listae:domain-vars:end */";

export function buildDomainVarsBlock(input: DomainVarsInput): string;
export function upsertDomainVarsBlock(css: string, input: DomainVarsInput): string;
export function parseDomainVarsBlock(css: string): DomainVarsInput | null; // best-effort for picker initial state
```

- Hex colors only in generated block: `/^#[0-9a-fA-F]{6}$/` validation; throw or skip invalid
- `upsertDomainVarsBlock`: if markers present, replace inclusive range; else prepend block + `\n\n`

- [ ] **Step 1: Failing tests** — insert, replace idempotent, preserve CSS outside markers

- [ ] **Step 2: Implement + PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: upsert marked CSS block for domain color variables"
```

---

### Task 7: Domain theme picker in customize UI

**Files:**
- Modify: `src/components/theme-editor.tsx`
- Optionally small `src/components/domain-theme-picker.tsx`

**Behavior:**
- Color inputs (bg / accent / fg) × 2 domains
- “Apply domain colors” updates local `customCss` via `upsertDomainVarsBlock` (preview iframe refreshes)
- Save still goes through existing `saveThemeAction` (validation unchanged)
- Hints text lists `{{audiovisual_lists}}`, `{{reading_lists}}`, `{{lists}}`
- Initial picker state from `parseDomainVarsBlock(customCss)` or defaults from `defaults.ts` constants

- [ ] **Step 1: Implement picker UI + wire**

- [ ] **Step 2: `pnpm test` + manual note in report**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add domain color picker that writes CSS variables"
```

---

### Task 8: displayName = username (no email leakage)

**Files:**
- Modify: `src/lib/auth/config.ts` — remove displayName email set in `createUser`
- Modify: `src/lib/auth/validation.ts` — add:

```ts
export function emailLocalPart(email: string): string {
  return email.split("@", 1)[0] ?? "";
}

export function usernameMatchesEmailLocalPart(
  username: string,
  email: string,
): boolean {
  return (
    normalizeUsername(username) ===
    emailLocalPart(email).trim().toLowerCase()
  );
}
```

- Remove or stop using `displayNameFromEmail` in config; update/remove its tests accordingly
- Modify: `src/app/onboarding/page.tsx` — on success `.set({ username, displayName: username })`; client soft warning when match (pass email local-part flag from server via comparing session email — use a small client input listener or server-rendered note based on form… simplest: client component warning that receives `emailLocalPart` as prop from server page)
- Modify library eyebrow to `username` (not stale displayName) until backfill runs
- Create `src/lib/auth/backfill-display-names.ts` with `reconcileDisplayNameForUser` (single-row fix when `displayName !== username`).

- [ ] **Step 1: validation tests for match helper**

- [ ] **Step 2: config + onboarding + per-user reconcile on library**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "fix: set displayName from username, never from email"
```

---

### Task 9: Docs ADR + spec Approved + context dump

**Files:**
- Create: `docs/decisions/010-library-domains-and-display-name.md`
- Update: `docs/decisions/README.md`
- Mark spec **Status: Approved**
- Update: `docs/context/2026-07-22-library-domains.md` with completed tasks / canonical files

- [ ] **Step 1: Write ADR** summarizing domains, picker block, displayName policy, soft warning

- [ ] **Step 2: `pnpm test` full suite**

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: ADR 010 library domains and displayName policy"
```

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Domain helpers | 1 |
| Library filter + tabs + default all | 2, 3 |
| Placeholders + wrappers | 4 |
| Default dual template | 5 |
| Marked CSS vars + picker | 6, 7 |
| displayName / warning / backfill | 8 |
| Docs | 9 |
| Font picker | Deferred (global constraint) |

## Placeholder scan

No TBD steps; font deferred explicitly.

---
