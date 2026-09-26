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

**Keeping it awake**: a GitHub Actions `schedule`-triggered workflow was
tried first (ping `GET /api/v1/health` every 10 minutes) but removed —
GitHub Actions' free scheduler does not honor high-frequency cron cadences
reliably, especially on low-activity repos; verified runs landed 2–5 hours
apart instead of every 10 minutes, far past Render's 15-minute sleep
threshold, so the backend still cold-started on the first real request (the
"2-4 attempts on cold start" symptom). The actual keep-warm mechanism is an
external pinger with its own scheduler: **cron-job.org** (free), hitting
`https://s2-nova.onrender.com/api/v1/health` every 5 minutes. UptimeRobot's
free monitor (5-minute interval) works the same way. This is configured
directly in that external service's dashboard — nothing in this repo to set
up beyond pointing it at the URL above.

## Project structure

- `prisma/schema.prisma` — the database schema (source of truth for the
  DB shape; see `ARCHITECTURE.md` §4 for the design behind it)
- `prisma/seed.ts` — seeds (or refreshes) the global (`user_id = null`)
  category taxonomy every user sees from `src/lib/taxonomy.json`. That
  JSON, and the copies in `web/src/lib/` and `android/app/src/main/assets/`,
  are generated from `design_handoff_s2_nova_v2/s2-categories.js` by the
  root `scripts/gen-taxonomy.mjs` — change the taxonomy there and re-run
  it, never edit a JSON by hand. `Category.slug` is the node's stable
  dotted id (`exp.food.groceries`, `inc.other`); see
  `design_handoff_s2_nova_v2/docs/CATEGORY_SYSTEM.md`. The v2 migration
  re-pointed the pre-taxonomy slugs.
- `src/env.ts` — Zod-validated environment config; import `env` from here
  rather than reading `process.env` directly elsewhere
- `src/lib/prisma.ts` — the shared `PrismaClient` singleton; import this
  rather than constructing a new client per file
- `src/routes/` — one file per resource, registered in `src/server.ts`.
  `recurringSeries.ts` is the Programados CRUD; a due date becomes a
  Transaction on `POST /:id/confirm`, and `POST /:id/skip` advances the
  next occurrence without one ("Omitir esta vez" on both clients). Series
  (and goal plans) marked automatic are recorded by `src/lib/recurring.ts`
  the next time the user's data is read — there is still no timer.
  `categories.ts` backs Ajustes › Categorías (per-user rename/icon/hide
  overrides of built-ins, custom nodes, delete with reassignment);
  `currencies.ts` backs Ajustes › Monedas (`/me/currencies`, the principal
  currency, rates — see `docs/CURRENCIES_AND_WALLETS.md`). `transactions.ts`'s `POST /:id/settle-loan` is the only way a
  Lent/Borrowed transaction gets settled — it creates a real
  opposite-direction transaction (see schema.prisma's
  `settledByTransactionId` doc comment), not just a status flag.
  Loan rows returned by `transactions.ts` carry a server-computed
  `outstanding` (`src/lib/loans.ts`); clients never re-derive it.
  `security.ts` backs Web Ajustes › Seguridad: sessions (a login is one
  `refresh_tokens.session_id`, kept across rotations and carried as the
  access token's `sid` claim, so the caller's own session can be marked
  and spared), the delete-account counts and `DELETE /me`;
  `dataExport.ts` serves the CSV copy. Device labels come from
  `src/lib/devices.ts` (the Android client sends
  `S2Nova-Android/<version> (<model>)`).
  `summary.ts` (`GET /summary/months`, `GET /summary/categories`,
  `GET /summary/report?range=3|6|12` for Reportes) and `alerts.ts`
  (`GET /alerts`) are the shared Inicio/Reportes aggregates and alert
  rules both clients consume — add figures there rather than computing
  them per client. Both accept `?today=YYYY-MM-DD` (the client's local
  date) because month and "due today" boundaries are the user's.
- `src/lib/budgetProgress.ts`, `src/lib/goalProgress.ts` — the single
  spent/percentage/status computation for budgets (CATEGORY and CUSTOM
  kinds, monthly or custom range) and goals (incl. periodic contribution
  plans), shared by their routes and the alert rules.
- `src/lib/movements.ts` — how a movement moves wallet balances and its
  wire shape, shared by transactions, Programados and goal plans.
  `src/lib/currency.ts` — multi-currency: each wallet and movement has a
  currency, a movement freezes its rate and wallet amount, totals are
  converted to the user's principal currency.
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
