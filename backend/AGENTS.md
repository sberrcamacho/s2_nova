# S2 Nova backend

Node.js + TypeScript + Fastify API, backed by PostgreSQL via Prisma — the
one shared backend `android/` and `web/` both talk to. See the root
`ARCHITECTURE.md` for the full design rationale (why Fastify/Prisma/JWT
were chosen, the schema, auth flows, sync strategy, and the phased
migration plan). This file is the day-to-day dev reference; `ARCHITECTURE.md`
is the "why".

## Local development

Requires Docker (for local Postgres) and Node with pnpm.

```
cd backend
cp .env.example .env            # edit if you're not using the default docker-compose values
docker compose up -d            # starts Postgres on :5432
pnpm install
pnpm prisma:migrate             # applies prisma/schema.prisma, generates the client
pnpm exec prisma db seed        # seeds the global categories (see prisma/seed.ts)
pnpm dev                        # Fastify on :3000, reloads on change
```

`GET /api/v1/health` — liveness only. `GET /api/v1/health/db` — also
round-trips a query through Prisma, for checking Postgres connectivity.

## Production deployment

Database: **Aiven for PostgreSQL** (free plan — 1GB storage, always-on, no
sleep). Backend: **Render** (free Web Service, Docker runtime, this repo's
`Dockerfile`, root directory `backend`) — Render handles TLS and gives a
public HTTPS URL automatically, no reverse proxy/Caddy/domain setup needed.
Render injects its own `PORT` env var, which `server.ts` already listens on
(`env.PORT`, no code change needed).

First-time setup:
1. Create the Aiven for PostgreSQL service, copy its connection string into
   `DATABASE_URL` (append `?sslmode=require` if not already present).
2. On Render, create a new Web Service pointed at this repo, root directory
   `backend`, runtime **Docker**. Set env vars from `.env.example`:
   `DATABASE_URL` (from step 1), `JWT_SECRET` (generate with
   `openssl rand -base64 48`), `GOOGLE_CLIENT_IDS`, `CORS_ORIGINS` (include
   the deployed GitHub Pages origin), `NODE_ENV=production`.
3. Deploy. The `Dockerfile`'s `CMD` runs `prisma migrate deploy` before
   starting the server on every boot (safe/no-op if already up to date —
   there's no separate migration step on Render, unlike a docker-compose
   setup).
4. Seed the global categories once, from a local machine with
   `DATABASE_URL` pointed at the Aiven instance: `pnpm exec prisma db seed`.

Redeploying after a code change: push to the branch Render is tracking — it
rebuilds and redeploys automatically. Free tier note: the service sleeps
after 15 minutes of inactivity; the first request after that takes roughly
30–60s to wake it back up.

## Project structure

- `prisma/schema.prisma` — the database schema (source of truth for the
  DB shape; see `ARCHITECTURE.md` §4 for the design behind it)
- `prisma/seed.ts` — seeds the global (`user_id = null`) categories every
  user sees, matching `web/src/data/categories.ts` /
  `android/.../data/mock/MockCategories.kt` by `slug` — keep these three
  in sync if the category list ever changes
- `src/env.ts` — Zod-validated environment config; import `env` from here
  rather than reading `process.env` directly elsewhere
- `src/lib/prisma.ts` — the shared `PrismaClient` singleton; import this
  rather than constructing a new client per file
- `src/routes/` — one file per resource, registered in `src/server.ts`.
  `recurringSeries.ts` is the recurring-definition CRUD + the one place a
  Transaction ever gets created from a series (`POST /:id/confirm`,
  explicit-only — nothing generates transactions on a timer or on app
  start). `transactions.ts`'s `POST /:id/settle-loan` is the only way a
  Lent/Borrowed transaction gets settled — it creates a real
  opposite-direction transaction (see schema.prisma's
  `settledByTransactionId` doc comment), not just a status flag.
- `src/server.ts` — Fastify bootstrap: plugin registration, route
  registration, listen

## Conventions

- Every route that isn't `/auth/*`, `/health*`, or the public
  `GET /products/:barcode` lookup requires a valid access token; derive
  `userId` from the verified token, never from a client-supplied field —
  this is the actual enforcement of "a user can never read another user's
  data," not a convenience default (`ARCHITECTURE.md` §"Security model").
- Request/response validation goes through Zod schemas, not ad-hoc
  `if` checks — reject malformed input before it reaches Prisma.
- Money is `BigInt` minor units in the DB and over the wire in internal
  code; only the route layer converts to/from the plain `number` shape
  the clients already expect (see `ARCHITECTURE.md` §4, "Monetary
  values").
- Secrets live in `.env` (gitignored) only — never hardcode a DB URL,
  JWT secret, or the Google OAuth client secret in source.
- Schema changes go through `prisma migrate dev` (generates a migration
  file under `prisma/migrations/`), never a hand-edited DB or
  `prisma db push` outside of local prototyping.
