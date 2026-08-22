# S2 Nova

Personal finance product made of two separate applications that share a
visual identity and one backend, but are built, run, and deployed
independently. See `AGENTS.md` for the full architecture rationale and
`ARCHITECTURE.md` for the backend/sync design.

- **`android/`** — native mobile app (Kotlin + Jetpack Compose). Daily
  financial operations: expenses, income, transactions, budgets, barcode
  scanning. See `android/AGENTS.md`.
- **`web/`** — web dashboard (React + TypeScript + Vite). Financial
  analysis: statistics, charts, categories, analytics, reports. See
  `web/AGENTS.md`.
- **`backend/`** — shared API (Node.js + TypeScript + Fastify +
  Prisma/PostgreSQL) both apps talk to. See `backend/AGENTS.md`.
- **`design-reference/`** — Figma screenshots (`figma/`, the visual source
  of truth) and current-implementation screenshots (`current/`).

Android is wired to the real backend (auth, accounts, transactions,
budgets, goals, recurring series). Web still runs on its own in-memory
mock data — it has no login screen of its own yet, so it can't
authenticate against the backend (see `ARCHITECTURE.md` §9).
