# S2 Nova

S2 Nova is **one personal finance product with two clients** that share one
backend, one database, one user identity and one domain model:

- `android/` — native mobile client (Kotlin + Jetpack Compose), tuned for
  everyday mobile use: quick entry, quick review, notifications, barcode
  scanning. See `android/AGENTS.md`.
- `web/` — web client (React + TypeScript + Vite), tuned for desktop
  management and deeper analysis: tables, side panels, richer charts, CSV
  export. See `web/AGENTS.md`.
- `backend/` — the shared API (Node.js + TypeScript + Fastify + Prisma/
  PostgreSQL). It is the single source of truth for financial data and
  business rules. See `backend/AGENTS.md`.
- `scripts/gen-guest-seed.mjs` — the guest account ("Continuar como
  invitado"), described once and written to both clients
  (`web/src/lib/guestSeed.json`, `android/app/src/main/assets/guest_seed.json`).
  Re-run it after editing the account; it checks, for a set of sample
  days, that no wallet but the credit card goes negative.
- `scripts/gen-taxonomy.mjs` — generates each app's category taxonomy
  (adding the English names from `scripts/taxonomy-en.json`). It still reads
  `design_handoff_s2_nova_v2/s2-categories.js`, which is no longer in the
  repo; the generated taxonomy files are committed, so don't re-run it until
  the source is moved.

**Functional parity.** Android and Web are functionally the same
application: every operation that changes the user's financial data
(wallets, transactions, categories, budgets, goals, loans and abonos,
Programados, profile and preferences) must be available on both. The only
platform-specific capability is barcode *capture* (Android camera); the
resulting purchase is ordinary shared data that Web can view and edit.
Differences between the clients are UX, never capability.

**Business rules live in the backend.** When both clients need the same
figure or rule (balances, budget progress, loan outstanding, alerts,
monthly aggregates), implement it once in `backend/` and consume it from
both clients instead of duplicating the logic.

**Vocabulary.** UI copy is Spanish, with an English version of every
string (the user's language preference), and shared across platforms: Inicio,
Movimientos, Planes (Presupuestos · Metas · Préstamos), Reportes,
Billeteras, Categorías, Alertas, Programados, Abono, Aporte. Technical
documentation stays in English. Out of scope: business finance and the
physical IoT piggy bank.

The two clients are still separate codebases, built and deployed
independently. Do not reintroduce a single "responsive web app that is
also the mobile app". See `ARCHITECTURE.md` for the backend/database/auth/
sync design. For work inside either app, read that app's own `AGENTS.md`
first — it has the concrete dev commands, structure, and conventions.

# UI IMPLEMENTATION RULES

The old v2 mockups (`design_handoff_s2_nova_v2/`) are no longer the visual
source of truth; mentions of "the mockup" in the per-app `AGENTS.md` files
are historical. The only fixed visual constraint is the palette of the S2
Nova brand mark (`web/src/assets/logo-mark-*.png`,
`android/app/src/main/res/drawable-nodpi/logo_mark_*.png`); everything else
follows `DESIGN-SYSTEM.md` (reasoning in `DESIGN_AUDIT.md`). See `CLAUDE.md` for the full visual rules and the mandatory
screenshot verification loop.

- Apply every visual change to both clients so they stay consistent.
- Accessibility is required: text contrast ≥ 4.5:1 (UI boundaries ≥ 3:1),
  Android touch targets ≥ 48 dp, text ≥ 12 sp/px, never color alone.
- Do not modify unrelated screens or refactor unrelated components as part
  of a visual change.
