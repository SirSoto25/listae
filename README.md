# Listae

Listae is a local-first, multi-user media tracker inspired by MyAnimeList. It
tracks anime, series, movies, books, manga, and comics without adding a social
network. Each user gets a public, customizable list at `/u/[username]`.

The MVP uses Next.js, Auth.js magic links, Drizzle ORM, and SQLite. See the
[approved design spec](docs/superpowers/specs/2026-07-21-listae-design.md) for
the product scope and architecture.

## Local setup

1. Install dependencies:

   ```bash
   pnpm i
   ```

2. Copy `.env.example` to `.env.local` and replace `AUTH_SECRET` with a strong
   random value (for example `openssl rand -base64 32`). `DATABASE_URL`
   defaults to the local SQLite database at `data/listae.db`.

3. Database: nothing to run. Migrations in `drizzle/` are applied
   automatically when the server starts (`pnpm dev` / `pnpm start`), and a
   database created earlier with `db:push` is adopted without losing data
   ([ADR 012](docs/decisions/012-migrations-on-startup.md)). After changing
   `src/lib/db/schema.ts`, run `pnpm db:generate` and commit `drizzle/`.

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Magic-link login

SMTP is optional for local development. Leave `EMAIL_SERVER` unset and submit
an email at `/login`; Listae prints a line like this in the server console:

```text
[listae magic link] you@example.com -> http://localhost:3000/api/auth/callback/...
```

Open that URL to sign in, then choose a username during onboarding. To send
real email instead, set `EMAIL_SERVER` and `EMAIL_FROM` in `.env.local`.

## Catalog providers

Set `TMDB_API_KEY` in `.env.local` to search TMDB for movies and series. Either
the **v3 API Key** or the **v4 Read Access Token** (JWT starting with `eyJ`)
works. Open Library search does not require a key, and manual title creation
remains available when an external provider is unavailable or has no match.

## Rate limits and client IP

Login, magic-link and search limits live in SQLite (`rate_limit_windows`), so
they survive restarts and are shared by every worker
([ADR 014](docs/decisions/014-rate-limit-sqlite-trusted-ip.md)). Listae never
trusts client-sent IP headers on its own. In production, put a reverse proxy in
front that **overwrites** `X-Real-IP` with the socket address and set
`CLIENT_IP_HEADER=x-real-ip` (or `TRUSTED_PROXY_HOPS=<n>` if your proxies
append to `X-Forwarded-For`). Without either, client IPs are unknown: anonymous
searches share one budget (300/hour) and login is limited per email only.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the local Next.js development server |
| `pnpm build` | Create an optimized production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Type-check the project with `tsc --noEmit` |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm db:generate` | Generate a Drizzle migration after changing `schema.ts` (commit `drizzle/`) |
| `pnpm db:migrate` | Apply pending migrations by hand (the server already does it on startup) |
| `pnpm db:push` | Push the schema without a migration: only for prototypes with a throwaway database |

## MVP status

Implementation and verification evidence is tracked in
[`docs/context/2026-07-21-mvp-impl-status.md`](docs/context/2026-07-21-mvp-impl-status.md).
Production hosting and SMTP delivery are intentionally deferred until local
manual testing is complete.
