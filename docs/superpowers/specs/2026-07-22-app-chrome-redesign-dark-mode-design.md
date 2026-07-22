# Listae — App chrome redesign + dark mode

**Date:** 2026-07-22  
**Repo:** https://github.com/SirSoto25/listae  
**Status:** Approved (2026-07-22) — proceed to implementation plan  
**Related:** [2026-07-21-listae-design.md](./2026-07-21-listae-design.md), ADR 005 (profile HTML/CSS)

## 1. Purpose

Give Listae’s **official app chrome** a minimal but magnetic visual identity (cool cinematic atmosphere, indigo accent) and ship **light + dark + system** theming in the same epic—without touching user-owned public profile themes.

**Success:** Opening the app feels inviting (cool wash + covers); staying to browse/track has low visual friction. Dark mode is a first-class twin of light, not a bolted-on invert.

## 2. Decisions locked (brainstorming)

| Topic | Choice |
|-------|--------|
| Epic order | **C** — new light identity first, dark mode immediately after in the same epic |
| Visual posture | Minimal with presence (not empty, not dense MAL clone) |
| Visual anchor | **Atmosphere** (wash/gradient) + balanced covers and type |
| Accent | Cool slate / indigo (cinema/streaming, not paper-amber) |
| Light base | Cool whites/grays + soft blue atmosphere |
| Execution | **Tokens-first**, then migrate screens, then `.dark` |
| Out of scope | `/u/[username]` HTML/CSS, theme engine security model, list/score semantics |

## 3. Scope

### In scope

- Design tokens in `src/app/globals.css` (semantic CSS variables + Tailwind v4 `@theme` mapping)
- App shell: `layout.tsx`, atmosphere, `SiteHeader` + theme toggle
- Pages: `/`, `/library`, `/title/[id]`, `/login`, `/login/verify`, `/onboarding`
- Customize **editor chrome only** (`/u/.../customize` frame: textareas, buttons, errors)—not iframe content
- Theme preference: `light | dark | system` via cookie `listae-theme`
- Light motion (theme crossfade, cover hover, optional search-result enter) with `prefers-reduced-motion`
- Docs: short ADR for app theme preference; update context notes if needed

### Out of scope

- User `htmlTemplate` / `customCss`, sanitizer, sandbox contract (ADR 005)
- Replacing free CSS profiles with a product theme picker
- Changing default public profile CSS for brand matching (unless a later product decision)
- shadcn / large component-library adoption in this epic
- Product feature changes (filters, statuses, catalog providers)

## 4. Visual identity

### 4.1 Light palette (starting tokens)

Concrete starting values (tune during implementation; keep names stable):

| Token | Role | Example |
|-------|------|---------|
| `--background` | Page canvas | `#F4F7FB` |
| `--surface` | Panels, inputs, header bar | `#FFFFFF` |
| `--foreground` | Primary ink (cool near-black) | `#0F172A` |
| `--muted` | Secondary text / soft chrome | `#64748B` |
| `--accent` | Brand mark, active links, focus | `#4F5BD5` |
| `--border` | Subtle borders | cool slate-tinted gray |
| `--primary` | Primary CTA fill | ink (`foreground`) |
| `--primary-foreground` | Text on primary | white / near-white |

Atmosphere: soft indigo/slate radial or linear wash on shell (header + home), **no** purple glow, **no** multi-layer neon shadows.

### 4.2 Typography & shape

- Keep **Geist** / Geist Mono already in the app
- Clear hierarchy: strong wordmark `listae.` (accent on the dot), firm titles, quieter meta
- Reduce ubiquitous `font-black` shouting; reserve weight for brand and section titles
- Radii tokens: `control` (~xl), `surface` (~2xl), `panel` (~3xl)—unify login/onboarding with home/library (no sharp vs soft split)

### 4.3 Components language

- Buttons: `primary` / `secondary` / `ghost` mapped to tokens (retire competing ad-hoc `stone-950` / `amber-700` / zinc one-offs)
- Surfaces: `bg-background`, `bg-surface`, `border-border`—no raw `#f7f5f0` / page-local zinc
- Library density: keep **compact** `EntryForm` on library rows; full form on title detail / add flows
- Cards: only where they support interaction or scanning; no decorative card stacks in heroes

### 4.4 Motion

1. Theme switch: short token/color transition where safe  
2. Cover hover: slight scale (~1.02) + soft shadow, ~180ms, no bounce  
3. Optional search results enter: opacity + small translateY, short stagger; disabled under `prefers-reduced-motion`  
4. Optional slow atmosphere drift; static when reduced motion

## 5. Dark mode & preference

### 5.1 Mechanism

- **No `next-themes`.** Cookie `listae-theme` = `light | dark | system`
- Root layout reads cookie via `cookies()` and sets `class="dark"` on `<html>` when resolved theme is dark
- `system`: resolve with `prefers-color-scheme` (media-driven tokens and/or tiny blocking script before paint when cookie is `system`)
- Client `ThemeToggle` island: updates `document.documentElement` immediately + writes cookie (`Path=/`, `SameSite=Lax`, long `Max-Age`, **not** HttpOnly)
- Tailwind v4: define vars under `:root` and `.dark`; `@custom-variant dark` if using `dark:` utilities
- Sync `color-scheme: light | dark` with resolved theme

### 5.2 Header IA

- Left: wordmark  
- Center/left nav: Search, Library, Profile / Finish setup  
- Right utility cluster: **theme toggle → then auth** (Sign in / Log out)  
- Toggle must not sit between product nav items  
- `SiteHeader` remains a Server Component; toggle is nested client child

### 5.3 Isolation from profiles

App `html.dark` must not fight `/u/[username]` iframe document. Profile render stays sandboxed `srcDoc`; do not couple profile defaults to app chrome theme.

## 6. Architecture / file plan

| Area | Files (expected) |
|------|------------------|
| Tokens | `src/app/globals.css` |
| SSR theme | `src/app/layout.tsx`, `src/lib/theme-preference.ts` (parse/cookie helpers) |
| Toggle | `src/components/theme-toggle.tsx` |
| Chrome migrate | `site-header`, `catalog-search`, `work-cover`, `library-filters`, `entry-form`, pages listed in §3 |
| Docs | `docs/decisions/009-app-theme-preference.md` (or next free number), context note |

Do **not** wire preference into `profile_themes` / Auth.js session.

## 7. Implementation order

1. **Tokens (light)** — semantic vars + `@theme` + atmosphere utilities; map radii/button roles  
2. **Migrate chrome** — replace hardcoded stone/amber/zinc/hex across in-scope pages/components; unify auth visual language  
3. **Dark tokens** — `.dark` counterparts; verify contrast on covers/meta  
4. **Preference plumbing** — cookie + layout class + `ThemeToggle`  
5. **Motion polish** — hover/enter/theme; respect reduced motion  
6. **Verify** — manual light/dark/system; library compact forms; login/onboarding consistency; public profile iframe unchanged  

## 8. Testing & acceptance

**Automated (lightweight):**
- Unit tests for theme cookie parse/resolve helpers (`light` / `dark` / `system` → class)
- Existing suite remains green (no behavior regressions in auth/catalog)

**Manual:**
- [ ] Light identity: cool canvas, indigo accent, no cream/amber dominance on chrome  
- [ ] Dark: readable surfaces, accent still clear, no purple glow  
- [ ] System follows OS; no FOUC on reload with cookie set  
- [ ] Toggle placement: utility cluster right of auth area  
- [ ] Library rows stay compact; title detail keeps full form  
- [ ] `/u/[username]` look independent of app theme  
- [ ] Login / verify / onboarding match shell (no zinc orphan)

## 9. Non-goals reminder

No password auth, no social features, no Redis, no production deploy requirement in this epic.

## 10. Open tuning (implementation-time, not blockers)

- Exact dark hex values (derive from light tokens for contrast)
- Whether atmosphere uses pure CSS or a single decorative layer in layout
- Icon-only vs segmented control for theme toggle (both acceptable if compact)
