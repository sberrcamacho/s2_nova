# S2 Nova — Project State

Snapshot of what exists, what works, and what's outstanding as of
**2026-10-02** (`main` at `e451267`).
This is a point-in-time record, not living documentation — for how to
build/run/structure each app, see the `AGENTS.md` files. Replace this file
at the next major milestone rather than keeping it in sync with every
commit.

## Where things stand

Backend, Android and Web are all feature-complete for the v2 product and
at functional parity (root `AGENTS.md`): every write available on Android
exists on Web.

The `design_handoff_s2_nova_v2/` mockups were removed from the repo
(`b11931b`) and are no longer the visual source of truth. The UI now
follows `DESIGN-SYSTEM.md` (reasoning in `DESIGN_AUDIT.md`); the only fixed
visual constraint is the palette of the brand mark (`CLAUDE.md`). The
redesign landed on both clients in phases:

- **F0** accessibility and text-layout fixes, **F1** brand tokens and type
  scale, **F2** bento Inicio, **F3** Nuevo movimiento with progressive
  disclosure.
- **F4** Reportes, Movimientos, Planes, Billeteras, Ajustes and its
  sub-screens, Login / Registro / Recuperar contraseña, first run, Perfil,
  Programados, movement detail, Alertas and the sheets.
- Afterwards: a per-platform type scale for all ad-hoc sizes, shared nav
  icons, and the Android bottom bar — now a flat bar with a concave notch
  that cradles a round "+" FAB (`e451267`), which shrinks below 340 dp.

Added since the previous snapshot (2026-09-26):

- Reset data ("danger zone"), change password and password recovery by
  email (`/auth/forgot-password`, branded HTML email) on both clients.
- CSV import (`dataImport` route) next to CSV export, on Web.
- Suggested movement titles per category and subcategory; a budget name is
  required.
- Product catalog (`/products`) for scanned codes; the scan action itself
  is parked as "coming soon" in the app.
- Secure auto-logout, full movement edit, ES/EN copy throughout.
- Public privacy policy and terms pages (`web/public/privacy.html`,
  `terms.html`, ES/EN) and the Google Search Console verification file.
- Tried and reverted: an installable iPhone PWA and a Cloudflare
  (Pages, then Worker) deploy with a same-origin `/api` proxy
  (`5f57ac4`, `73716ea`, `f636ff1`, reverted in `a4c7a20`, `3fd2b80`,
  `eb75054`). Web still deploys to GitHub Pages.

## Architecture

Two independent clients sharing one backend, one database and one user
identity — no shared UI code (never revert to a single responsive app):

- **`android/`** — Kotlin + Jetpack Compose.
- **`web/`** — React 19 + TypeScript + Vite 8 + Tailwind v4 (`--v2-*`
  tokens).
- **`backend/`** — Node.js + TypeScript + Fastify + Prisma/PostgreSQL. Full
  design in `ARCHITECTURE.md`.
- **`scripts/gen-taxonomy.mjs`** — generated the category taxonomy JSON
  for all three from `design_handoff_s2_nova_v2/s2-categories.js`. That
  source is gone, so the script cannot run; the generated files are
  committed.

## Backend — implemented

Routes (`backend/src/routes/`): `auth` (email/password + Google Sign-In,
rotating refresh tokens, password recovery by email), `me` (profile, preferences, password),
`security` (sessions, account footprint, `DELETE /me`, reset data),
`dataExport` and `dataImport` (CSV), `products` (scanned-code catalog:
local table, then Open Food/Beauty/Products/Pet Food Facts and UPCitemdb,
with an optional AI fallback when `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`
are set), `accounts` (wallets with their own currency), `currencies` (user
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

## Android — implemented

Inicio (bento), Movimientos, category-first Nuevo movimiento
(category/subcategory sheets, keypad and calculator, fecha y hora, Repetir,
moneda + tasa, adjuntos, De, custom-budget assignment, title suggestions),
Planes (category and custom budgets, goals with periodic contributions,
Préstamos), Reportes, Billeteras with currency, Ajustes (Perfil, Seguridad,
Monedas, Categorías, change/reset password, danger zone), notifications
with "Confirmar aporte" / "Omitir esta vez", two-step destructive
confirmation + undo snackbar, guest mode, 2-step first run, product tours,
loading skeletons. Barcode/QR scanning is wired to `/products` but the scan
action is parked as "coming soon".

## Web — implemented

Every v2 area is migrated and on the design system: Inicio, Movimientos
(Programados, day totals, filters, detail with comprobante, two-step
delete / Deshacer), Planes (Presupuestos, Metas, Préstamos), Reportes,
Nuevo movimiento, Billeteras, Ajustes (Perfil, Contraseña, Sesiones,
Monedas, Categorías, Eliminar cuenta, danger zone, CSV import/export),
password recovery, product tours, first run and guest mode. Web shows the
product linked to a scanned movement in its detail.

## Tests

Counts taken on 2026-10-02 (details in `TESTING.md`):

- **Backend**: 213 tests in 17 files, all passing.
- **Android** (unit): 49 tests in 14 classes, all passing.
- **Web**: 167 tests in 34 files. The suite is **flaky under load**: of
  three consecutive local runs, one passed clean and two failed (4 and 25
  tests) on 5 s timeouts, mostly in `NewTransactionPanel.spec.tsx` and
  `PlanesPage.spec.tsx`. An Android emulator was running on the machine
  during those runs.

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
- Android reads `API_BASE_URL` from `local.properties` (gitignored); it
  falls back to `http://10.0.2.2:3000/api/v1` (the emulator's host).
- CI: `.github/workflows/backend-ci.yml`, `web-ci.yml` and
  `android-ci.yml`. Android has no release pipeline — build/install is
  local-only (`./gradlew assembleDebug` / `installDebug`).

## Known gaps / explicitly out of scope

- The Web test suite times out intermittently (see Tests).
- `scripts/gen-taxonomy.mjs` has no source to read until the taxonomy
  source is moved back into the repo.
- Barcode/QR scan action is parked as "coming soon" on Android.
- Android has no Subcategorías toggle in Reportes (Web has it).
- Android's refresh token lives in plain DataStore, not an encrypted store.
- Biometric login (Android) is implemented but not yet deployed or tried on a
  device: it needs the `biometric_credentials` migration and the
  `/auth/biometric` routes on the deployed backend.
- No OpenAPI docs generated from the Zod schemas.
- No Android release pipeline.
- Carried over from the previous snapshot and not re-checked: the loan
  category mismatch (Web files a "Recibido" loan under `inc.other`, Android
  uses `exp.other`), and the Aiven database password that was pasted in
  plaintext during setup and should be rotated before storing real data.
- Out of scope: business finance, the physical IoT piggy bank,
  multi-user/team administration.

## Recent history (at this snapshot)

```
e451267 feat(android): notched bottom bar with round centre FAB
a4c7a20 Revert "feat(web): installable PWA for iPhone (manifest, icons, safe areas, dvh)"
3fd2b80 Revert "feat(web): Cloudflare Pages deploy with same-origin /api proxy"
eb75054 Revert "feat(web): serve as Cloudflare Worker with static assets and /api proxy"
eb40f40 fix(android): sheet navigation bar follows the app theme
776df39 chore: Google Search Console site verification file
86783e4 docs: public privacy policy and terms of service pages (ES/EN)
b798bab feat: suggested movement titles per category and subcategory; budget name required
1049972 feat: product catalog backend (/products) with public databases and AI fallback; scanner wired to it; scan action parked as coming soon
5c40291 feat: branded HTML password recovery email with the S2 Nova logo
```
