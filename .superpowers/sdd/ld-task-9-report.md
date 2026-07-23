# Task 9 Report: Docs ADR + spec Approved + context dump

**Status:** done

**Branch:** `feat/library-domains`

**Commit:** `6724644` — `docs: ADR 010 library domains and displayName policy`

## What changed

- Created `docs/decisions/010-library-domains-and-display-name.md` (domains, picker block, displayName, soft warning).
- Indexed ADR 010 in `docs/decisions/README.md`.
- Spec already **Approved** — no edit needed.
- Updated `docs/context/2026-07-22-library-domains.md`: Tasks 1–9 complete, canonical file map, commit SHAs.

## Tests

```text
pnpm test
# Test Files  19 passed (19)
# Tests  101 passed (101)
```

## Concerns

- None. Font picker deferred per spec.

## Final review fix wave

- **`buildDomainListsHtml`**: returns `""` when filtered domain has zero entries (no 5-status empty skeleton).
- **`UsernameField`**: uses `usernameMatchesEmailLocalPart` via `email` prop instead of inline local-part comparison.
- Tests: new empty-domain case in `placeholders.test.ts` (102 total).
- Commit: `fix: omit empty domain sections in profile lists` (`9b30a5e`)
