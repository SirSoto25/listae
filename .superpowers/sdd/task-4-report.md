# Task 4 Report: CSS Validator and HTML Sanitizer

## Status

Implemented the Task 4 theme security helpers under `src/lib/theme/` without
starting any Tasks 5–9.

## TDD evidence

### RED

Command:

```text
pnpm test src/lib/theme/__tests__/validate-css.test.ts src/lib/theme/__tests__/sanitize-html.test.ts
```

Result: exit code 1. Both suites failed because `../validate-css` and
`../sanitize-html` did not exist. This was the expected feature-missing
failure before production code was created.

### GREEN

Focused CSS command:

```text
pnpm test src/lib/theme/__tests__/validate-css.test.ts
```

Result: exit code 0; 1 file and 4 tests passed.

Focused HTML command:

```text
pnpm test src/lib/theme/__tests__/sanitize-html.test.ts
```

Result: exit code 0; 1 file and 4 tests passed.

Fresh full verification:

- `pnpm test`: exit code 0; 5 files and 19 tests passed.
- `pnpm lint`: exit code 0.
- `pnpm exec tsc --noEmit`: exit code 0.
- Cursor diagnostics for all four theme source/test files: no errors.

## Implementation

- `validateThemeCss` returns the requested discriminated union and preserves
  accepted CSS unchanged.
- CSS `@import` accepts HTTPS URLs only on `fonts.googleapis.com` and
  `fonts.gstatic.com`.
- Rejected imports include the exact matched import snippet plus line and
  column.
- CSS `expression()` and every non-HTTPS `url()` are rejected with structured
  diagnostics.
- `sanitizeThemeHtml` uses `sanitize-html` with an explicit structural-tag and
  attribute allowlist.
- Scripts, unsupported elements, event-handler attributes, unsafe schemes,
  and protocol-relative URLs are removed; HTTPS image sources are retained.

## Dependencies

- Runtime: `sanitize-html`
- Development types: `@types/sanitize-html`

## Concerns

No implementation blockers. Package installation reported existing
deprecated transitive packages and peer-dependency warnings; lint, typecheck,
and tests remained clean.
