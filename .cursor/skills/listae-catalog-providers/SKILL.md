---
name: listae-catalog-providers
description: Listae hybrid catalog — TMDB and Open Library search, manual entry, Work upsert by external id, and DB-backed SearchCacheStore ready for Redis. Use when implementing search, import, manual create, or search caching in the listae repo.
---

# Listae catalog providers

Extends global template skills `media-tracking-domain` and `search-cache-store`.

## Sources

| Source | Media | Notes |
|--------|-------|-------|
| `tmdb` | series, movie; anime when discoverable | Server-side `TMDB_API_KEY` |
| `openlibrary` | book; manga/comic if match | Manual fallback common |
| `manual` | any type | Always available |

Dedicated anime API (e.g. AniList) is **out of v1** unless a new ADR adds it.

## Flow

1. Debounced search with optional type filter
2. `SearchCacheStore.get` → return if fresh
3. Else query providers → unify cards (title, cover, year, source)
4. Cache via `set` (TTL 15–60 min)
5. Select → upsert Work by `(externalSource, externalId)` → add ListEntry
6. No match → manual form

## SearchCacheStore (v1)

- DB table implementation only
- Interface must allow a Redis adapter later (ADR 004)
- Keys never expose secrets; API keys never sent to the client

## Failure behavior

API down → serve cache hit if present; else prompt manual entry.
