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

Both apps are wired to the real backend (auth incl. Google Sign-In,
accounts, transactions, budgets, goals, recurring series) — Web has its own
login/register screens now too (see `ARCHITECTURE.md` §9). The backend runs
24/7 on Render + Aiven for PostgreSQL (see `backend/AGENTS.md`'s
"Production deployment" section); Web deploys to GitHub Pages via
`.github/workflows/deploy.yml`.
