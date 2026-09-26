# S2 Nova

One personal finance product with two clients — Android and Web — that
share one backend, one database and one domain model, and offer the same
financial capabilities (barcode capture is the only Android-only feature).
See `AGENTS.md` for the product principles and `ARCHITECTURE.md` for the
backend/sync design.

- **`android/`** — native client (Kotlin + Jetpack Compose), tuned for
  everyday mobile use and barcode scanning. See `android/AGENTS.md`.
- **`web/`** — web client (React + TypeScript + Vite), tuned for desktop
  management and deeper analysis. See `web/AGENTS.md`.
- **`backend/`** — shared API (Node.js + TypeScript + Fastify +
  Prisma/PostgreSQL) both apps talk to. See `backend/AGENTS.md`.
- **`design_handoff_s2_nova_v2/`** — the v2 interactive mockups (visual
  source of truth) and the product specs in `docs/`.

Both apps are wired to the real backend (auth incl. Google Sign-In,
accounts, transactions, budgets, goals, loans, recurring series, the v2
category taxonomy and multi-currency) — Web has its own
login/register screens now too (see `ARCHITECTURE.md` §9). The backend runs
24/7 on Render + Aiven for PostgreSQL (see `backend/AGENTS.md`'s
"Production deployment" section); Web deploys to GitHub Pages via
`.github/workflows/deploy.yml`.
