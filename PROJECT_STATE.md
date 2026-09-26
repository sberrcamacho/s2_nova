# S2 Nova — Project State

Snapshot of what exists, what works, and what's outstanding as of
**2026-09-26** (`main`, everything committed and pushed at `21a2d78`).
This is a point-in-time record, not living documentation — for how to
build/run/structure each app, see the `AGENTS.md` files. Replace this file
at the next major milestone rather than keeping it in sync with every
commit.

## Where things stand

The product moved to the **v2 design**: `design_handoff_s2_nova_v2/`
(interactive mockups `S2 Nova Android v2.dc.html` and
`S2 Nova Dashboard v2.dc.html`, specs in `docs/`) replaced the Stage 2
handoff. The rule is functional parity (root `AGENTS.md`): every write
available on Android must exist on Web; `docs/WEB_PARITY.md` lists how
each capability looks on each platform.

- **Backend** — v2 complete (`947ff92`, `39e1962`, `978d23e`).
- **Android** — v2 complete (`8751c40`): the reference implementation.
- **Web** — partially migrated; see the table below.

## Architecture

Two independent clients sharing one backend, one database and one user
identity — no shared UI code (never revert to a single responsive app):

- **`android/`** — Kotlin + Jetpack Compose.
- **`web/`** — React 19 + TypeScript + Vite 8 + Tailwind v4 (`--v2-*`
  tokens).
- **`backend/`** — Node.js + TypeScript + Fastify + Prisma/PostgreSQL. Full
  design in `ARCHITECTURE.md`.
- **`scripts/gen-taxonomy.mjs`** — generates the category taxonomy JSON
  for all three from `design_handoff_s2_nova_v2/s2-categories.js`.

## Backend — implemented

Routes (`backend/src/routes/`): `auth` (email/password + Google Sign-In,
rotating refresh tokens), `me` (profile, preferences, password),
`security` (sessions, account footprint, `DELETE /me`), `dataExport`
(CSV), `accounts` (wallets with their own currency), `currencies` (user
currencies, principal currency, rates), `categories` (global taxonomy +
per-user overrides and custom nodes), `transactions` (date + time, future =
PLANNED, title/note, income "De", receipts, loans with server-computed
`outstanding` and `settle-loan` abonos), `recurringSeries` (Programados:
confirm/skip, automatic series recorded on read, no timer), `budgets`
(CATEGORY and CUSTOM kinds, monthly or custom range, 65/90/100
thresholds), `goals` (plan icon, initial amount, periodic contribution
plans), `summary` (Inicio/Reportes aggregates), `alerts` (shared alert
rules incl. TX_PLANNED and goal-plan alerts), `health`.

Money is stored in minor units per currency; movements freeze their rate
and wallet amount; totals convert to the principal currency.

## Android — implemented (v2)

Inicio, Movimientos, category-first Nuevo movimiento (category/subcategory
sheets, keypad and calculator, fecha y hora, Repetir, moneda + tasa,
adjuntos, De, custom-budget assignment), Planes (category and custom
budgets, goals with periodic contributions, Préstamos), Reportes,
Billeteras with currency, Ajustes (Perfil, Seguridad, Monedas,
Categorías), notifications with "Confirmar aporte" / "Omitir esta vez",
two-step destructive confirmation + undo snackbar, guest mode, 2-step first
run, mini-guides, barcode scanning.

## Web — v2 migration status

| Area | Status |
|---|---|
| v2 data layer (taxonomy registry, multi-currency formatting, `categoryService`, `currencyService`) | Done (`21a2d78`) |
| Inicio | Done |
| Movimientos (list, detail dialog, delete) | Done |
| Planes › Presupuestos, Metas, Préstamos (mockup modals, two-step delete, abonos) | Done, visually verified against the mockup |
| Reportes | Done |
| Ajustes (Perfil, Contraseña, Sesiones, Eliminar cuenta) | Done |
| Nuevo movimiento (category-first flow per `NEW_MOVEMENT.md`) | Done, visually verified against the mockup |
| Billeteras page (sidebar entry + modal, wallet currency) | Done, visually verified against the mockup |
| Ajustes › Monedas (principal, add/remove with two-step confirmation) | Done, visually verified against the mockup |
| Ajustes › Categorías (rename, icon, hide, custom nodes, two-step delete) | Done, visually verified against the mockup |
| Guest mode, first-run card, mini-guides (`ONBOARDING.md`) | **Pending** |

Web test suite: 135 tests, 13 failing outside the migrated v2 screens because their fixtures
predate the v2 data layer (details in `TESTING.md`).

## Deployment

- **Database**: Aiven for PostgreSQL, free plan (always-on, no sleep).
- **Backend**: Render, free Web Service, Docker runtime
  (`backend/Dockerfile`, root directory `backend`) — live at
  `https://s2-nova.onrender.com`. Free tier sleeps after 15 min of
  inactivity (~30-60s cold start on the next request). Redeploys
  automatically on every push to `main`. See `backend/AGENTS.md`'s
  "Production deployment" section.
- **Web**: auto-deploys to GitHub Pages on every push to `main`
  (`.github/workflows/deploy.yml`), now pointed at the deployed backend via
  the `VITE_API_URL`/`VITE_GOOGLE_CLIENT_ID` GitHub Actions repository
  variables — live at `https://sberrcamacho.github.io/s2_nova/`.
- **Google Sign-In**: one Google Cloud OAuth "Web application" client ID is
  used as the `serverClientId`/audience for **both** platforms (Android's
  Credential Manager flow audiences its token to the Web client too — see
  `android/app/build.gradle.kts`'s comment); a separate Android-type OAuth
  client (package name + debug keystore SHA-1) authorizes the Android app
  to use Sign-In at all.
- **Verified end-to-end in production**: registered/logged in on both
  platforms, session survives a Web page reload, a transaction created on
  Android appeared on Web — confirms both clients share the live database.
- An Oracle Cloud Always Free VM (self-hosted Postgres + backend together)
  was evaluated first and dropped after repeated "out of host capacity"
  errors provisioning the free ARM shape (see `ARCHITECTURE.md` §16).
- Android reads `API_BASE_URL` from `local.properties` (gitignored); during
  local development it points at the dev machine's LAN IP.
- `android/` still has no CI/release pipeline — build/install is local-only
  (`./gradlew assembleDebug` / `installDebug`).

## Known gaps / explicitly out of scope

- The Web v2 items marked **Pending** above.
- Stale Web test fixtures (13 failures, `TESTING.md` › Current status).
- Loan category: Web files a new "Recibido" loan (an income) under
  `inc.other`; Android uses `exp.other` for both directions. The backend
  doesn't validate category kind against transaction type.
- On Web, loan cards keep an "Editar" button (edit + delete) that the
  mockup doesn't show, so loans stay editable as on Android.
- Android's refresh token lives in plain DataStore, not an encrypted store.
- Biometric login is not wired (auto-lock re-entry is password-only).
- The Aiven database password was pasted in plaintext during setup and
  hasn't been rotated — rotate before storing real data.
- Android has no CI; the backend suite has no CI either.
- No OpenAPI docs generated from the Zod schemas.
- Web's `authService.requestPasswordReset` has no backend endpoint.
- Out of scope: business finance, the physical IoT piggy bank,
  multi-user/team administration.

## Recent history (at this snapshot)

```
21a2d78 feat(web): v2 data layer (taxonomy, multi-currency) and Planes per the mockup
978d23e fix(backend): range budgets that haven't started yet
8751c40 feat(android): v2 — category-first Nuevo movimiento, multi-currency, Planes, taxonomy, guest mode
39e1962 feat(backend): TX_PLANNED alerts and mockup alert order
947ff92 feat(backend): v2 taxonomy, multi-currency, scheduled/repeating movements, receipts, custom budgets and goal plans
c0cd558 feat(android): Perfil and Ajustes v2 per the mockup
d7bbef0 feat: Ajustes v2 on Web with sessions, password, profile and account deletion
52a9b27 feat(web): Reportes v2 — Gastos, Ingresos, Flujo de caja and Patrimonio per the mockup
46bbbda feat: Reportes v2 on Android from a shared GET /summary/report
5a75342 feat(web): Planes v2 — budgets and goals per the mockup, create/edit/delete panels for budgets, goals and loans
```
