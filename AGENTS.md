# S2 Nova

S2 Nova is a personal finance product made of **two separate applications**
that share a visual identity, one backend, and one database, but are
built, run, and deployed independently:

- `android/` — the native mobile app (Kotlin + Jetpack Compose). Owns daily
  financial operations: recording expenses/income, transactions, purchases,
  and barcode-scanning. See `android/AGENTS.md`.
- `web/` — the web dashboard (React + TypeScript + Vite). Owns financial
  analysis: statistics, charts, budgets, categories, trends, reports. See
  `web/AGENTS.md`.
- `backend/` — the shared API (Node.js + TypeScript + Fastify + Prisma/
  PostgreSQL) both apps talk to: one user identity, one database, no
  separate backends per platform. See `backend/AGENTS.md`.
- `design-reference/` — Figma screenshots (`figma/`, the visual source of
  truth) and current-implementation screenshots (`current/`), used to check
  visual fidelity for both apps.

Do not reintroduce a single "responsive web app that is also the mobile
app" — that was the old architecture and is intentionally not how this
product is built anymore. See `ARCHITECTURE.md` for the full backend/
database/auth/sync design and the phased migration plan off each app's
mock data — migration is incremental per `ARCHITECTURE.md`, so until an
app's repository/service layer is explicitly migrated, it may still run
on its own local mock data.

For work inside either app, read that app's own `AGENTS.md` first — it has
the concrete dev commands, structure, and conventions.
