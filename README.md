# S2 Nova

Personal finance product made of two separate applications that share a
visual identity and (in the future) a backend, but are built, run, and
deployed independently. See `AGENTS.md` for the full architecture rationale.

- **`android/`** — native mobile app (Kotlin + Jetpack Compose). Daily
  financial operations: expenses, income, transactions, budgets, barcode
  scanning. See `android/AGENTS.md`.
- **`web/`** — web dashboard (React + TypeScript + Vite). Financial
  analysis: statistics, charts, categories, analytics, reports. See
  `web/AGENTS.md`.
- **`design-reference/`** — Figma screenshots (`figma/`, the visual source
  of truth) and current-implementation screenshots (`current/`).

Both apps currently use mock/local data — there is no backend yet.
