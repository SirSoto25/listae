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
   random value. The example defaults to the local SQLite database at
   `data/listae.db`.

3. Create/update the local database:

   ```bash
   pnpm db:push
   ```

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

Set `TMDB_API_KEY` in `.env.local` to search TMDB for movies and series. Open
Library search does not require a key, and manual title creation remains
available when an external provider is unavailable or has no match.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the local Next.js development server |
| `pnpm build` | Create an optimized production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm db:push` | Push the Drizzle schema to the configured database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply generated Drizzle migrations |

## MVP status

Implementation and verification evidence is tracked in
[`docs/context/2026-07-21-mvp-impl-status.md`](docs/context/2026-07-21-mvp-impl-status.md).
Production hosting and SMTP delivery are intentionally deferred until local
manual testing is complete.
