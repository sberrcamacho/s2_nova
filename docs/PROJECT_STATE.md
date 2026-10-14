# S2 Nova — Project State

What exists, where it runs and what is still open. Keep it current: when a
change adds a capability, closes a gap or changes a deployment, update this
file in the same commit. Git history records how it got here.

## What is built

Backend, Android and Web are feature-complete for the v2 product and at
functional parity (root `AGENTS.md`): every write available on Android
exists on Web. The UI follows `DESIGN-SYSTEM.md`; the old
`design_handoff_s2_nova_v2/` mockups were removed and are only history.

**Backend** (`backend/src/routes/`):

- `auth`: email/password and Google Sign-In, rotating refresh tokens,
  password recovery by email, biometric device credentials.
- `me`: profile, preferences, password.
- `security`: sessions, account footprint, `DELETE /me`, reset data.
- `dataExport` / `dataImport`: CSV.
- `products`: the scanned-code catalog (local table, then Open
  Food/Beauty/Products/Pet Food Facts and UPCitemdb, with an optional AI
  fallback when `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` are set).
- `accounts`: wallets, each with its own currency.
- `currencies`: user currencies, the principal currency, rates.
- `categories`: the global taxonomy, plus per-user overrides and custom
  nodes.
- `transactions`: date and time (a future one is PLANNED), title and
  note, income "De", receipts, and loans with a server-computed
  `outstanding` and `settle-loan` abonos.
- `recurringSeries`: Programados, with confirm/skip; automatic series are
  recorded when read, with no timer.
- `budgets`: CATEGORY and CUSTOM kinds, monthly or a custom range, alert
  thresholds at 65/90/100.
- `goals`: plan icon, initial amount and periodic contribution plans. A
  contribution can't pass what the goal still needs
  (`ARCHITECTURE.md` §5).
- `summary` (Inicio/Reportes aggregates), `alerts` (shared alert rules),
  `health`.

Money is stored in minor units per currency. A movement freezes its rate
and wallet amount; totals convert to the principal currency.

**Android:**

- Inicio (bento) and Movimientos.
- Category-first Nuevo movimiento: keypad and calculator, Más opciones
  (Fecha y hora, Repetir, Adjuntar, De, Presupuesto, Préstamo o meta, with
  one-line scrolling chips in their pickers), currency and rate, title
  suggestions.
- Planes: budgets, goals (Abonar with "Completar" and the plan amount, up
  to what is left) and Préstamos. Planes reopens on the last tab used.
- Reportes, Billeteras and Ajustes.
- Notifications with "Confirmar aporte" / "Omitir esta vez".
- Guest mode, the 2-step first run, product tours, biometric login.
- Barcode scanning is wired to `/products`, but the scan action shows
  "Próximamente".

**Web:** every area of the product on the design system. It adds to the
Android set:

- Movimientos with Programados on top, day totals and receipts in the
  detail.
- Sesiones, CSV import/export, password recovery, product tours, first
  run and guest mode.
- The product linked to a scanned movement, shown in its detail.
- A public landing page at `/` with "Descargar para Android" (the latest
  release APK).

## Deployment

- **Database:** Aiven for PostgreSQL, free plan (always on).
- **Backend:** Render free Web Service, Docker runtime (`backend/Dockerfile`),
  live at `https://s2-nova.onrender.com`. It redeploys on every push to
  `main`, and a periodic ping keeps it from sleeping. See `backend/AGENTS.md`
  › "Production deployment".
- **Web:** GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`,
  `VITE_API_URL` / `VITE_GOOGLE_CLIENT_ID` repository variables), live at
  `https://sberrcamacho.github.io/s2_nova/`.
- **Android:** the staging APK, published as a GitHub Release asset
  (`s2-nova.apk`). The landing page links to the latest one. There is no
  Play Store listing. Steps and the signing caveat are in
  `RELEASE_ANDROID.md`. Locally, `API_BASE_URL` / `GOOGLE_WEB_CLIENT_ID` come
  from `android/local.properties` (gitignored).
- **Google Sign-In:** one OAuth "Web application" client ID is the
  audience on both platforms. A separate Android OAuth client (package
  name + the release machine's debug-keystore SHA-1) authorizes the app.
  For the consent screen's brand verification, the domain root
  `https://sberrcamacho.github.io/` is served by the repo
  `sberrcamacho/sberrcamacho.github.io`. It carries the Search Console file
  `google7819aad2a1783c46.html` and redirects to `/s2_nova/`. The homepage
  is `https://sberrcamacho.github.io/s2_nova/` and the privacy policy is
  `…/s2_nova/privacy.html`. Both must keep matching the consent screen.
- **CI:** `backend-ci.yml`, `web-ci.yml` and `android-ci.yml` run each
  app's tests on pushes and pull requests that touch it. The deploys don't
  wait for them.

## Tests

On 2026-10-13, all three suites passed (`TESTING.md`):

- Backend: 229 tests.
- Web: 208 tests.
- Android: 72 unit tests.

## Known gaps

- Android's "Préstamo recibido" is filed under `exp.other`, while Web uses
  `inc.other` (`LoansScreen.kt` vs `LoanModal.tsx`).
- The backend doesn't check that a category's kind matches the movement's
  type.
- Android has no Subcategorías toggle in Reportes; Web has it.
- The barcode scan action is parked as "Próximamente".
- Biometric login has not been tried on a physical device.
- There are no OpenAPI docs generated from the Zod schemas.
- `scripts/gen-taxonomy.mjs` can't run until its source
  (`s2-categories.js`) is back in the repo. The generated files are
  committed.
- The Aiven database password was pasted in plain text during setup and
  should be rotated before storing real data.
- Out of scope: business finance, the physical IoT piggy bank,
  multi-user administration.
