# App Chrome Redesign + Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Listae’s cool indigo app-chrome identity (tokens-first) and light/dark/system theming via cookie, without touching public profile HTML/CSS.

**Architecture:** Semantic CSS variables in `globals.css` (`:root` + `.dark`) mapped through Tailwind v4 `@theme`. Root layout reads `listae-theme` cookie and sets `class="dark"` on `<html>` for SSR without FOUC. A small client `ThemeToggle` writes the cookie and updates `document.documentElement`. Components/pages stop using raw `stone`/`amber`/`zinc`/`#f7f5f0` and use token utilities instead.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Vitest, no `next-themes`.

**Spec:** `docs/superpowers/specs/2026-07-22-app-chrome-redesign-dark-mode-design.md`

## Global Constraints

- Do **not** modify user profile theme engine, sanitizer, default profile CSS contract, or `/u/[username]` iframe `srcDoc` theming (ADR 005).
- Do **not** add `next-themes` or other theme libraries.
- Cookie name must be exactly `listae-theme`; values exactly `light` | `dark` | `system`.
- Preference is **not** stored in Auth.js session or `profile_themes`.
- Keep Geist fonts; cool indigo accent (`#4F5BD5` light starting point); no purple glow / multi-shadow AI-slop.
- Library rows keep **compact** `EntryForm`; full form stays on title detail.
- Header IA: product nav left/center; right cluster = **theme toggle then auth**.
- Conventional commits; exclude `.superpowers/sdd/**` from commits.
- PowerShell: do not leave literal `EOF` strings in PR bodies.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/theme-preference.ts` | Cookie name, parse, resolve light/dark for SSR |
| `src/lib/theme-preference.test.ts` | Unit tests for parse/resolve |
| `src/app/globals.css` | Light/dark tokens, `@theme`, atmosphere, motion, radii |
| `src/app/layout.tsx` | Read cookie, `html` class, `color-scheme`, optional system script |
| `src/components/theme-toggle.tsx` | Client cycle light→dark→system |
| `src/components/site-header.tsx` | Token classes + mount toggle in auth cluster |
| `src/components/catalog-search.tsx` | Token migrate |
| `src/components/work-cover.tsx` | Token migrate + hover motion |
| `src/components/library-filters.tsx` | Token migrate |
| `src/components/entry-form.tsx` | Token migrate (keep compact API) |
| `src/components/theme-editor.tsx` | Editor chrome tokens only |
| `src/app/page.tsx` | Home migrate + atmosphere |
| `src/app/library/page.tsx` | Library migrate |
| `src/app/title/[id]/page.tsx` | Title migrate |
| `src/app/login/page.tsx` | Auth migrate (match shell radii) |
| `src/app/login/verify/page.tsx` | Auth migrate |
| `src/app/onboarding/page.tsx` | Replace zinc with tokens |
| `src/app/u/[username]/customize/page.tsx` | Editor page chrome only |
| `docs/decisions/009-app-theme-preference.md` | ADR |
| Spec status → Approved | Mark after plan starts / on docs task |

---

### Task 1: Theme preference helpers (TDD)

**Files:**
- Create: `src/lib/theme-preference.ts`
- Create: `src/lib/theme-preference.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `THEME_COOKIE_NAME = "listae-theme"`
  - `type ThemePreference = "light" | "dark" | "system"`
  - `type ResolvedTheme = "light" | "dark"`
  - `parseThemePreference(value: string | undefined | null): ThemePreference`
  - `resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme`
  - `themeClassName(resolved: ResolvedTheme): string` → `""` or `"dark"`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  parseThemePreference,
  resolveTheme,
  themeClassName,
} from "./theme-preference";

describe("parseThemePreference", () => {
  it("accepts light, dark, and system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("defaults invalid or missing values to system", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("nope")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves system from OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("honors explicit preferences", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("themeClassName", () => {
  it("returns dark class only for dark resolved theme", () => {
    expect(themeClassName("dark")).toBe("dark");
    expect(themeClassName("light")).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/theme-preference.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helpers**

```ts
export const THEME_COOKIE_NAME = "listae-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function parseThemePreference(
  value: string | undefined | null,
): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return systemPrefersDark ? "dark" : "light";
}

export function themeClassName(resolved: ResolvedTheme): string {
  return resolved === "dark" ? "dark" : "";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/theme-preference.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme-preference.ts src/lib/theme-preference.test.ts
git commit -m "feat: add listae-theme preference helpers"
```

---

### Task 2: Semantic light tokens + atmosphere

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: none
- Produces: CSS variables `--background`, `--surface`, `--foreground`, `--muted`, `--accent`, `--border`, `--primary`, `--primary-foreground`, radius vars; Tailwind colors `background`, `surface`, `foreground`, `muted`, `accent`, `border`, `primary`, `primary-foreground`

- [ ] **Step 1: Replace `globals.css` token block**

Keep `@import "tailwindcss"`. Replace `:root` / `@theme` / `body` with:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #f4f7fb;
  --surface: #ffffff;
  --foreground: #0f172a;
  --muted: #64748b;
  --accent: #4f5bd5;
  --border: #d8dee8;
  --primary: #0f172a;
  --primary-foreground: #f8fafc;
  --radius-control: 0.75rem;
  --radius-surface: 1rem;
  --radius-panel: 1.5rem;
  color-scheme: light;
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --radius-control: var(--radius-control);
  --radius-surface: var(--radius-surface);
  --radius-panel: var(--radius-panel);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}

.app-atmosphere {
  background-image:
    radial-gradient(1200px 600px at 10% -10%, rgb(79 91 213 / 0.14), transparent 60%),
    radial-gradient(900px 500px at 90% 0%, rgb(100 116 139 / 0.12), transparent 55%);
  background-attachment: fixed;
}

@media (prefers-reduced-motion: reduce) {
  .app-atmosphere {
    background-attachment: scroll;
  }
}
```

- [ ] **Step 2: Smoke-check utilities exist**

Run: `pnpm exec tsc --noEmit` (or start `pnpm dev` and open `/`)  
Expected: no TS errors from this change; page still renders (may still look mixed until later tasks)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add cool indigo semantic light tokens"
```

---

### Task 3: Dark token counterparts

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: same token names as Task 2
- Produces: `.dark { ... }` overrides + darker atmosphere via `.dark .app-atmosphere`

- [ ] **Step 1: Append dark theme block to `globals.css`**

```css
.dark {
  --background: #0b1220;
  --surface: #121a2b;
  --foreground: #e8eef9;
  --muted: #94a3b8;
  --accent: #8b95f0;
  --border: #243044;
  --primary: #e8eef9;
  --primary-foreground: #0b1220;
  color-scheme: dark;
}

.dark .app-atmosphere {
  background-image:
    radial-gradient(1000px 500px at 15% -15%, rgb(139 149 240 / 0.16), transparent 55%),
    radial-gradient(800px 420px at 90% 0%, rgb(36 48 68 / 0.9), transparent 50%);
}
```

- [ ] **Step 2: Manual class smoke**

In DevTools on `/`, add `dark` to `<html>` briefly.  
Expected: canvas/ink flip when body uses tokens; mixed pages still partially stone until Tasks 5–8.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add dark semantic token counterparts"
```

---

### Task 4: Layout SSR theme + ThemeToggle

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/theme-toggle.tsx`
- Consumes: Task 1 helpers, Task 2–3 CSS

**Interfaces:**
- Produces: `<ThemeToggle />` client component; layout applies `themeClassName(resolved)`

- [ ] **Step 1: Create `theme-toggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

import {
  THEME_COOKIE_NAME,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";

function writeThemeCookie(value: ThemePreference) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyResolved(preference: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

const CYCLE: ThemePreference[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${THEME_COOKIE_NAME}=`));
    const raw = match?.split("=")[1];
    const parsed = parseThemePreference(raw);
    setPreference(parsed);
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length]!;
    setPreference(next);
    writeThemeCookie(next);
    applyResolved(next);
  }

  const label =
    preference === "light"
      ? "Theme: Light"
      : preference === "dark"
        ? "Theme: Dark"
        : "Theme: System";

  return (
    <button
      type="button"
      className="text-muted hover:text-accent"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      {preference === "light" ? "Light" : preference === "dark" ? "Dark" : "System"}
    </button>
  );
}
```

- [ ] **Step 2: Update `layout.tsx` to read cookie and set html class**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import { SiteHeader } from "@/components/site-header";
import {
  THEME_COOKIE_NAME,
  parseThemePreference,
  resolveTheme,
  themeClassName,
} from "@/lib/theme-preference";

import "./globals.css";

// ... keep font setup and metadata ...

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const preference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );
  const headerStore = await headers();
  const systemPrefersDark = headerStore
    .get("sec-ch-prefers-color-scheme")
    ?.includes("dark")
    ?? false;
  // When Client Hints unavailable, system defaults to light on SSR and
  // the inline script below corrects before paint if cookie is system.
  const resolved = resolveTheme(preference, systemPrefersDark);
  const darkClass = themeClassName(resolved);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${darkClass} h-full antialiased`}
    >
      <head>
        {preference === "system" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(()=>{try{var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
            }}
          />
        ) : null}
      </head>
      <body className="app-atmosphere flex min-h-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
```

Note: keep existing `Geist` / `Geist_Mono` declarations above the component exactly as today.

- [ ] **Step 3: Run unit tests**

Run: `pnpm test -- src/lib/theme-preference.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/components/theme-toggle.tsx
git commit -m "feat: wire listae-theme cookie into root layout"
```

---

### Task 5: SiteHeader tokens + toggle placement

**Files:**
- Modify: `src/components/site-header.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`
- Produces: header using `bg-surface/80`, `border-border`, `text-foreground`, `text-accent`, muted nav; right cluster `[ThemeToggle][auth]`

- [ ] **Step 1: Rewrite header classes and insert toggle**

Replace hardcoded stone/amber/hex with tokens. Structure the right side as:

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

// inside nav, right cluster:
<div className="flex items-center gap-5 text-sm font-semibold text-muted">
  <Link className="hover:text-accent" href="/">Search</Link>
  {/* Library / Profile / Finish setup links unchanged in logic */}
  <div className="flex items-center gap-4 border-l border-border pl-4">
    <ThemeToggle />
    {/* Sign in link OR Log out form */}
  </div>
</div>
```

Wordmark:

```tsx
<Link className="text-xl font-black tracking-[-0.05em] text-foreground" href="/">
  listae<span className="text-accent">.</span>
</Link>
```

Header shell:

```tsx
<header className="border-b border-border bg-surface/80 px-6 backdrop-blur">
```

- [ ] **Step 2: Manual check**

Open `/` logged out and logged in.  
Expected: toggle left of Sign in / Log out; accent on wordmark dot; no amber.

- [ ] **Step 3: Commit**

```bash
git add src/components/site-header.tsx
git commit -m "feat: restyle header with tokens and theme toggle"
```

---

### Task 6: Shared components token migration

**Files:**
- Modify: `src/components/catalog-search.tsx`
- Modify: `src/components/work-cover.tsx`
- Modify: `src/components/library-filters.tsx`
- Modify: `src/components/entry-form.tsx`

**Class mapping (apply consistently):**

| Old | New |
|-----|-----|
| `bg-[#f7f5f0]` / cream | `bg-background` |
| `bg-white` | `bg-surface` |
| `text-stone-950` / zinc-950 | `text-foreground` |
| `text-stone-600` / `text-zinc-600` | `text-muted` |
| `border-stone-*` / `border-zinc-*` | `border-border` |
| `text-amber-*` / `hover:text-amber-*` | `text-accent` / `hover:text-accent` |
| `bg-stone-950` primary buttons | `bg-primary text-primary-foreground hover:opacity-90` |
| `focus:ring-amber-100` / `focus:border-amber-600` | `focus:border-accent focus:ring-4 focus:ring-accent/20` |
| `rounded-xl` controls | `rounded-[length:var(--radius-control)]` or keep `rounded-xl` if already close |
| Cover placeholder `stone` gradient | cool slate/indigo muted gradient using `from-border to-surface` |

- [ ] **Step 1: Migrate each component file using the mapping**  
Keep `EntryForm` `compact` prop and markup structure; only restyle.

- [ ] **Step 2: Add cover hover motion in `work-cover.tsx`**

On the image/wrapper: `transition duration-180 hover:scale-[1.02]` plus `motion-reduce:transform-none` / `motion-reduce:transition-none`.

- [ ] **Step 3: Run tests**

Run: `pnpm test`  
Expected: PASS (UI-only; no logic changes)

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog-search.tsx src/components/work-cover.tsx src/components/library-filters.tsx src/components/entry-form.tsx
git commit -m "feat: migrate shared chrome components to design tokens"
```

---

### Task 7: App pages token migration (home, library, title, auth)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/library/page.tsx`
- Modify: `src/app/title/[id]/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/verify/page.tsx`
- Modify: `src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: Task 2–3 tokens + Task 6 components
- Produces: unified chrome; onboarding no longer uses `zinc-*`

- [ ] **Step 1: Apply the same class mapping from Task 6 to each page**  
Auth panels: `bg-surface border-border rounded-[length:var(--radius-panel)]` (or `rounded-3xl`), page background `bg-transparent` so `app-atmosphere` shows through (body already has atmosphere).

- [ ] **Step 2: Home results — optional enter motion**

On result list container / cards: `animate-in` via Tailwind if available, or:

```css
/* in globals.css */
@media (prefers-reduced-motion: no-preference) {
  .catalog-hit-enter {
    animation: catalog-hit-enter 220ms ease-out both;
  }
  @keyframes catalog-hit-enter {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```

Add `catalog-hit-enter` to hit cards on `page.tsx`.

- [ ] **Step 3: Manual pass**

Check `/`, `/library`, `/login`, `/login/verify`, `/onboarding`, one `/title/[id]`.  
Expected: no cream/amber/zinc orphans in chrome; library rows still compact.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/library/page.tsx src/app/title/[id]/page.tsx src/app/login/page.tsx src/app/login/verify/page.tsx src/app/onboarding/page.tsx src/app/globals.css
git commit -m "feat: restyle app pages with cool indigo chrome"
```

---

### Task 8: Customize editor chrome only

**Files:**
- Modify: `src/components/theme-editor.tsx`
- Modify: `src/app/u/[username]/customize/page.tsx`

**Constraints:** Do not change iframe sandbox attributes, `srcDoc` pipeline, or default profile CSS in `src/lib/theme/defaults.ts`.

- [ ] **Step 1: Restyle editor chrome with tokens** (labels, textareas, save button, error boxes) using Task 6 mapping.

- [ ] **Step 2: Verify public profile untouched**

Open `/u/[username]` in light and dark app theme.  
Expected: iframe content unchanged; only surrounding customize chrome (if any) follows app tokens.

- [ ] **Step 3: Commit**

```bash
git add src/components/theme-editor.tsx src/app/u/[username]/customize/page.tsx
git commit -m "feat: restyle profile editor chrome with app tokens"
```

---

### Task 9: Docs ADR + spec status + verification

**Files:**
- Create: `docs/decisions/009-app-theme-preference.md`
- Modify: `docs/decisions/README.md` (index row 009)
- Modify: `docs/superpowers/specs/2026-07-22-app-chrome-redesign-dark-mode-design.md` — set **Status: Approved**
- Optional: short note in `docs/context/` if handoff exists

- [ ] **Step 1: Write ADR 009**

```markdown
# 009 — Preferencia de tema de la app (cookie)

**Fecha:** 2026-07-22  
**Estado:** aceptada  
**Relacionada con:** spec app chrome redesign + dark mode; ADR 005 (perfiles aparte)

## Contexto
El chrome oficial necesita light/dark/system sin FOUC y sin acoplarse al CSS libre de perfiles.

## Decisión
Cookie `listae-theme` (`light` | `dark` | `system`), clase `dark` en `<html>`, tokens CSS semánticos. Sin `next-themes`. Perfiles `/u/[username]` independientes.

## Alternativas consideradas
- next-themes — dep extra y FOUC salvo cookie extra
- Solo `prefers-color-scheme` — sin forzar light/dark
- Guardar en DB/usuario — innecesario local-first

## Consecuencias
Toggle cliente + lectura SSR en layout; no mezclar con `profile_themes`.
```

- [ ] **Step 2: Update ADR index + mark spec Approved**

- [ ] **Step 3: Full test suite**

Run: `pnpm test`  
Expected: all PASS

- [ ] **Step 4: Manual acceptance from spec §8**

- [ ] Light cool canvas + indigo accent  
- [ ] Dark readable + accent clear  
- [ ] System + reload no FOUC with cookie  
- [ ] Toggle in utility cluster before auth  
- [ ] Library compact; title full form  
- [ ] `/u/[username]` independent  
- [ ] Auth pages match shell  

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/009-app-theme-preference.md docs/decisions/README.md docs/superpowers/specs/2026-07-22-app-chrome-redesign-dark-mode-design.md
git commit -m "docs: ADR 009 app theme preference and approve UI spec"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Tokens-first light identity | 2 |
| Dark counterparts | 3 |
| Cookie preference + SSR class | 1, 4 |
| ThemeToggle + header IA | 4, 5 |
| Migrate chrome pages/components | 6, 7 |
| Customize editor chrome only | 8 |
| Motion + reduced motion | 2 (atmosphere), 6 (cover), 7 (hits) |
| Profiles untouched | Global constraint + Task 8 verify |
| ADR | 9 |
| No next-themes | Global constraint |

## Placeholder / consistency check

- Cookie name `listae-theme` consistent across Tasks 1 and 4  
- Token names stable across Tasks 2–8  
- No TBD steps remaining  

---
