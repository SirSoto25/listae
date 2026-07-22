# Task 7 Report: Domain theme picker in customize UI

**Status:** done

**Branch:** `feat/library-domains`

**Commit:** `6d3db98` — `feat: add domain color picker that writes CSS variables`

## What changed

- Added `src/components/domain-theme-picker.tsx`: bg / accent / fg color inputs × audiovisual + reading; **Apply domain colors** button.
- Wired picker into `theme-editor.tsx`:
  - Initial state from `parseDomainVarsBlock(customCss)` (fallback: defaults from `DEFAULT_CSS`).
  - Apply calls `upsertDomainVarsBlock` → updates local `customCss` (live preview).
  - Persist still via existing `saveThemeAction`.
  - Restore defaults also resets picker state.
- HTML hint lists `{{audiovisual_lists}}`, `{{reading_lists}}`, `{{lists}}`.
- v1: no font picker.

## Tests

```text
pnpm exec vitest run
# Test Files  19 passed (19)
# Tests  100 passed (100)
```

## Manual note

Open `/u/[username]/customize`, change domain colors → Apply → preview iframe should refresh with new vars; Save theme still required to persist. Restore defaults should reset picker + CSS block.

## Concerns

- None.
