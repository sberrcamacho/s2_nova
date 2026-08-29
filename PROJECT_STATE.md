# S2 Nova — Project State

Snapshot of what exists, what works, and what's outstanding as of
**2026-08-26** (`main` @ `a4d21f0`). This is a point-in-time record, not
living documentation — for how to build/run/structure each app, see the
`AGENTS.md` files, which stay current by definition. Update or replace this
file at the next major milestone rather than trying to keep it perfectly in
sync with every commit.

**Uncommitted state note**: at this snapshot, `web/src/dashboard/pages/
AnalyticsPage.tsx`, `OverviewPage.tsx`, `ReportsPage.tsx`, and
`web/src/index.css` have uncommitted local changes not covered by this
snapshot (an in-progress redesign pass, separate from the real-backend
migration described below) — check `git status`/`git diff` before assuming
those files match what's described here.

## Architecture

Two independent client apps sharing one backend, one database, and one user
identity — no shared UI code, no separate data islands:

- **`android/`** — native mobile app, Kotlin + Jetpack Compose. Owns daily
  financial operations: expenses, income, transactions, budgets,
  barcode-scanned purchases. Talks to the real backend.
- **`web/`** — web dashboard, React 19 + TypeScript + Vite 8 + Tailwind v4.
  Owns financial analysis: statistics, charts, budgets, goals, insights,
  reports. **Now also talks to the real backend** (see below).
- **`backend/`** — shared API, Node.js + TypeScript + Fastify +
  Prisma/PostgreSQL. Full design in `ARCHITECTURE.md`. Deployed 24/7 (see
  Deployment below).
- **`design-reference/`** — Figma screenshots (visual source of truth),
  current-implementation screenshots, plus `bugs/` and `suggestions/`
  folders used as an informal feedback inbox.

This is a deliberate split from an earlier single-web-app-pretending-to-be-
mobile architecture (see `e07ca5d`, `338b38b`) and that split must not be
reverted — a shared backend does not mean merging the two clients.

**Both apps are now migrated onto the real backend** (`ARCHITECTURE.md`'s
Phases 1–3, 5, 8–9 all landed). Web's own migration (Phase 9 — real
login/register, Google Sign-In, every `services/*.ts` swapped from mock to
`fetch()`) was the last piece; it's done.

## Backend — implemented

Fastify + TypeScript API over PostgreSQL via Prisma. Routes
(`backend/src/routes/`): `auth` (register/login/refresh/logout,
email/password + Google Sign-In with multi-audience token verification),
`me` (profile, preferences, and — new — secure `PATCH /me` for name/email
and `POST /me/password` for changing/creating a password, both requiring
the current password and revoking sessions on success), `accounts`,
`categories`, `transactions` (expense/income/transfer, upcoming, budget/goal
links, loan settlement as a real opposite-direction transaction), `budgets`
(server-computed progress + 50/30/20-style recommendations), `goals`,
`recurringSeries` (subscriptions/salary, materializes a transaction only on
explicit confirm, never on a timer), `health` (liveness + DB round-trip
check).

Auth: argon2id password hashes, short-lived JWT access tokens, rotating
opaque refresh tokens (hashed at rest). The Web refresh cookie is
`SameSite=None; Secure` in production (Web and the API are different
registrable domains — GitHub Pages and Render — so `Lax` would be silently
dropped on cross-site `fetch()` calls; `Lax` is kept for local dev, which is
same-site). Money stored as `BigInt` minor units; `userId` always derived
server-side from the verified token, never from a client-supplied field.
Local dev: `docker compose up -d` for Postgres, `pnpm prisma:migrate` +
`pnpm exec prisma db seed`, `pnpm dev` for Fastify on `:3000`.

Not yet built: OpenAPI docs generation from the Zod schemas, automated
tests.

## Web dashboard — implemented

Routes (`web/src/dashboard/routes.tsx`): `/login`, `/register` (new, outside
`DashboardLayout`), then behind `ProtectedRoute` — Overview, Transactions,
Budgets, Goals, Analytics (tabs: Spending, Income, Cash Flow, Net Worth),
Insights, Reports, Settings — nav is deliberately capped at exactly 7 items
(Transactions is a deep link, not a nav item).

New since the last snapshot — **real backend, real auth**:
- **Real login/register + Google Sign-In** (`web/src/auth/`), replacing the
  single-user mock-auto-hydration. `apiClient.ts` holds the access token in
  memory only, retries once on a 401 via `/auth/refresh` (the refresh token
  lives in the backend's httpOnly cookie, never in JS/localStorage).
- **Every `services/*.ts` file swapped from an in-memory mock store to
  `fetch()` calls** against the real API, with wire-shape mappers
  (`web/src/lib/backendCategories.ts` handles the category slug↔UUID
  translation the backend uses).
- **Account model trimmed to name/email/password** — no phone/city (the
  backend never had those fields); Settings gained a change/create-password
  flow requiring the current password.
- **Read-only constraints preserved**: `accountService`/`goalService`/
  `budgetService`/`recurringService` still expose no
  `create*`/`set*`-style mutating functions — creating/editing Wallets,
  Budgets, Goals, and Recurring series stays Android's job.
- **Transaction deletion still absent from the dashboard** —
  `TransactionsPage` is list/filter/sort only.
- **Login/Register visual redesign** per `s2-nova-mockup/auth_handoff/`: both
  `/login` and `/register` now share the same two-column layout (a fixed
  452px dark brand panel + a 340px form column), replacing the old single-
  column `AuthShell` (now deleted). Register adds a name field, a
  password-strength meter, and a Terms/Privacy checkbox; both screens pull
  their pixel-exact values from a `--color-login-*` token prefix in
  `index.css`.

Unchanged: light/dark theme, currency format preference (fixed reference
rate, not live FX), language preference/i18n coverage, theme-specific logo,
the Insights page's data-driven suggestions, and the qualitative
per-category financial-health summary on Overview.

## Android app — implemented

Screens (`ui/screens/`, wired in `NovaNavGraph.kt`): Splash, Login,
Register, Forgot Password, Onboarding (welcome/income/wallet/budget
suggestion/tutorial), Home, Transactions (+ Transaction Detail), Add
Transaction (wallet/transfer/budget/goal/upcoming/lent-borrowed support),
Scanner, Budgets (shares a tab with Goals), Wallets, Recurring, Loans,
Reports, Notifications, Profile, Settings.

New since the last snapshot:
- **Google Sign-In** via Credential Manager (`GoogleAuthHelper.kt`), wired
  into Login/Register — gated on `local.properties`' `GOOGLE_WEB_CLIENT_ID`
  being set (no button shown otherwise).
- **Account model trimmed to name/email/password** — `User` no longer has
  `phone`/`city`. Settings gained a change/create-password dialog
  (`AuthRepository.changePassword`) that logs the device out locally after
  a successful change (the backend already revoked every refresh token).
- **`API_BASE_URL` now points at the deployed backend** (Render), not a
  dev-machine LAN IP.
- **Login/Register visual redesign** per `s2-nova-mockup/auth_handoff/`:
  both screens build their own header/scroll/footer skeleton (no more
  shared `AuthLayout`, which is now used only by `ForgotPasswordScreen`),
  reusing `NovaTextField`/`NovaPrimaryButton`/`GoogleSignInButton` and a
  `loginXxx` token family on `NovaExtraColors`. Register adds a name
  field, a `PasswordStrengthMeter`, and a `TermsCheckbox` — both new
  `ui/components/` composables.

Unchanged: real login/session against the backend (`AuthRepository` +
`SessionStore`, still plain DataStore, not yet encrypted — a known
follow-up), onboarding sync, Wallets/Budgets/Goals/Recurring/Loans as real
backend-backed repositories, notifications from live data, theme/font/
currency/language parity, barcode scanning, manual DI via `AppContainer`.

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
- `android/` still has no CI/release pipeline — build/install is local-only
  (`./gradlew assembleDebug` / `installDebug`).

## Known gaps / explicitly out of scope

- **Android's refresh token lives in plain DataStore**, not yet an
  encrypted store — a named follow-up, not an oversight.
- **Biometric login** — `UserPreferences.biometricLogin` exists in the
  schema (today just a local Android toggle); wiring a real biometric/
  passkey flow is deferred to a future phase.
- **Aiven's database password was pasted in plaintext during setup** (a
  chat session, not committed to the repo) and hasn't been rotated since —
  low risk at this stage (no real financial data yet, TLS-only access), but
  worth rotating (Aiven console → reset password → update `DATABASE_URL` on
  Render) before storing anything real.
- USD conversion on both platforms uses a fixed reference rate, not a live
  FX feed — documented, not fabricated data.
- **Translation coverage is partial by design** on both platforms (chrome +
  every dashboard page's own copy on Web; chrome + Settings on Android),
  documented in both `AGENTS.md` files. Web's `/login`/`/register` screens
  run their labelled copy through `useTranslation()`/`t()` like the rest of
  the dashboard (only the brand panel's decorative chart labels/stat
  sentence are hardcoded Spanish, same treatment as any other seeded
  content); Android's auth screens are the one exception on that platform
  — `LoginScreen`/`RegisterScreen`/`ForgotPasswordScreen` hardcode Spanish
  entirely, not run through `rememberStrings()` (no user/language
  preference exists yet before login).
- **User Management / multi-user/team admin** (present in the Figma
  source) was deliberately dropped — nothing else in the product implies
  multi-user accounts.
- Android has no automated tests and no CI. Backend has no automated tests
  yet either.
- No OpenAPI docs generated from the backend's Zod schemas yet.
- Web's `authService.requestPasswordReset` has no backend endpoint behind
  it yet — a known gap, not wired to any UI.

## Design-reference inbox

`design-reference/bugs/corrections-to-logo.png`,
`design-reference/suggestions/logo-dark.png`/`logo-light.png`, and
`design-reference/suggestions/add-peso-to-dollar-in-settings.png` were
actioned in an earlier pass: the logo is theme-reactive on both platforms,
and the currency-format toggle performs a real (fixed-rate) COP→USD
conversion.

The `transaction-*.jpeg` batch (an external finance app's Add Transaction
flow, used as a structural reference, not a copy target) was actioned next:
Android's `AddTransactionScreen` gained a gradient hero card and a
`ModalBottomSheet` category picker. Check `design-reference/bugs/` and
`suggestions/` for newer items before assuming this list is exhaustive.

## Recent history (last 10 commits, at this snapshot)

```
a4d21f0 fix(backend): use SameSite=None for the Web refresh cookie in production
6897f1b fix(backend): regenerate Prisma client in runner stage instead of copying from builder
c270365 feat: connect Web to real backend, add Google Sign-In and secure account changes, prep backend for Aiven+Render
a2598ac feat(web): balance-first Overview redesign across all 7 dashboard pages
dfb0824 feat(web): consolidate dashboard nav into 7 pages, deepen Overview/Analytics
7813fc5 feat: wallet type/payment method coherence, bank debit/credit subtypes, goal contributions
72a8465 fix(android): surface real registration/login errors instead of a generic message
13efc64 feat(web): add 0-100 financial health score to Overview
55da554 fix(web): remove transaction deletion from the dashboard
65afdc6 feat: introduce shared backend, wire Android to it, add Web analysis surfaces
```
