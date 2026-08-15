# S2 Nova

S2 Nova is a personal finance product made of **two separate applications**
that share a visual identity and (in the future) a backend, but are built,
run, and deployed independently:

- `android/` — the native mobile app (Kotlin + Jetpack Compose). Owns daily
  financial operations: recording expenses/income, transactions, purchases,
  and barcode-scanning. See `android/AGENTS.md`.
- `web/` — the web dashboard (React + TypeScript + Vite). Owns financial
  analysis: statistics, charts, budgets, categories, trends, reports. See
  `web/AGENTS.md`.
- `design-reference/` — Figma screenshots (`figma/`, the visual source of
  truth) and current-implementation screenshots (`current/`), used to check
  visual fidelity for both apps.

Do not reintroduce a single "responsive web app that is also the mobile
app" — that was the old architecture and is intentionally not how this
product is built anymore. Each app has its own mock/local data for now;
there is no shared backend yet.

For work inside either app, read that app's own `AGENTS.md` first — it has
the concrete dev commands, structure, and conventions.
