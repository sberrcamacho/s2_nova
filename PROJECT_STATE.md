# S2 Nova — Project State

Snapshot of what exists, what works, and what's outstanding as of
**2026-08-21** (`main` @ `13efc64`, **plus a substantial uncommitted
working-tree refactor of `web/`** described inline below). This is a
point-in-time record, not living documentation — for how to build/run/
structure each app, see the `AGENTS.md` files, which stay current by
definition. Update or replace this file at the next major milestone rather
than trying to keep it perfectly in sync with every commit.

**Uncommitted state note**: as of this snapshot, `web/` has 19 files
changed and not committed (`git diff --stat HEAD -- web/`) that consolidate
the old standalone Expenses/Income/NetWorth/Recurring/Wallets/Categories
pages into Analytics' tabs, simplify the sidebar to 7 nav items, rework
`OverviewPage`/`ReportsPage`/`BudgetsPage`/`GoalsPage`, extend
`analyticsService`/`insightsService`, and revert the financial-health
summary from the brief `13efc64` numeric-score experiment back to a
qualitative per-category status. `web/AGENTS.md` already documents this
target end-state (it's part of the same uncommitted diff), which is why it
reads as current even though `routes.tsx` at the pinned commit still has
the old page list. The sections below describe the working-tree end
state, not the bare `13efc64` commit — commit this refactor before trusting
the commit hash alone to reproduce what's described here.

## Architecture

Two independent client apps now sharing one backend, one database, and one
user identity — no shared UI code, but no longer separate data islands
either:

- **`android/`** — native mobile app, Kotlin + Jetpack Compose. Owns daily
  financial operations: expenses, income, transactions, budgets,
  barcode-scanned purchases. Talks to the real backend.
- **`web/`** — web dashboard, React 19 + TypeScript + Vite 8 + Tailwind v4.
  Owns financial analysis: statistics, charts, budgets, goals, insights,
  reports. Still runs on its own in-memory mock data.
- **`backend/`** — shared API, Node.js + TypeScript + Fastify +
  Prisma/PostgreSQL. Full design in `ARCHITECTURE.md`.
- **`design-reference/`** — Figma screenshots (visual source of truth),
  current-implementation screenshots, plus `bugs/` and `suggestions/`
  folders used as an informal feedback inbox.

This is a deliberate split from an earlier single-web-app-pretending-to-be-
mobile architecture (see `e07ca5d`, `338b38b`) and that split must not be
reverted — a shared backend does not mean merging the two clients.

Android was migrated onto the real backend (`ARCHITECTURE.md`'s Phases
1–3, 5, 8); Web has not (Phase 9) — it has no login screen of its own yet,
so it can't authenticate against the backend, and stays on mock data until
that lands.

## Backend — implemented

Fastify + TypeScript API over PostgreSQL via Prisma. Routes
(`backend/src/routes/`): `auth` (register/login/refresh/logout,
email/password + Google Sign-In), `me` (profile + preferences),
`accounts`, `categories`, `transactions` (expense/income/transfer,
upcoming, budget/goal links, loan settlement as a real opposite-direction
transaction), `budgets` (server-computed progress + 50/30/20-style
recommendations), `goals`, `recurringSeries` (subscriptions/salary,
materializes a transaction only on explicit confirm, never on a timer),
`health` (liveness + DB round-trip check).

Auth: argon2id password hashes, short-lived JWT access tokens, rotating
opaque refresh tokens (hashed at rest). Money stored as `BigInt` minor
units; `userId` always derived server-side from the verified token, never
from a client-supplied field. Local dev: `docker compose up -d` for
Postgres, `pnpm prisma:migrate` + `pnpm exec prisma db seed`, `pnpm dev`
for Fastify on `:3000`.

Not yet built: OpenAPI docs generation from the Zod schemas, automated
tests, and any deployment (see Deployment below).

## Web dashboard — implemented

Routes (`web/src/dashboard/routes.tsx`): Overview, Transactions, Budgets,
Goals, Analytics (tabs: Spending, Income, Cash Flow, Net Worth), Insights,
Reports, Settings — nav is deliberately capped at exactly 7 items
(Transactions is a deep link, not a nav item). The earlier standalone
Expenses/Income/NetWorth/Recurring/Wallets/Categories pages were absorbed
into Analytics' tabs rather than kept as separate routes.

Cross-cutting features (unchanged from the prior snapshot):
- **Light/dark theme** (`ThemeContext`), true-black dark palette.
- **Currency format preference** (COP / USD) via `useCurrency()` — USD
  converts the underlying COP amount using a fixed reference rate, not a
  live FX feed.
- **Language preference** (Spanish / English) via `useTranslation()`,
  full coverage across chrome and every dashboard page's own copy.
- **App logo**: theme-specific PNG tiles picked via `useTheme()`.
- Single-user demo auth (`AuthContext` auto-hydrates a mock user, no real
  login screen in the web app — this is *why* Web hasn't been wired to
  the real backend yet, not an oversight).

New since the last snapshot:
- **Insights page** — data-driven, prescriptive suggestion sentences
  computed from real transactions/budgets/goals/recurring series, never
  fabricated.
- **Qualitative financial-health summary** on Overview — a per-category
  status (savings, budget, cash flow, goals, debt), each a short status
  word plus a one-line data-driven detail, deliberately not a single
  arbitrary 0-100 score (see the uncommitted-state note above).
- **Wallets/Budgets/Goals/Recurring are read-only on Web** by product
  decision — creating/editing them is Android's job (micro-management vs.
  Web's macro-analysis role); no `create*`/`set*`-style mutating exports
  exist for these on Web, and none should be added.
- **Transaction deletion removed from the dashboard** — `TransactionsPage`
  is list/filter/sort only now; deleting/editing a transaction is
  Android's job, matching the Wallets/Budgets/Goals scoping above.

## Android app — implemented

Screens (`ui/screens/`, wired in `NovaNavGraph.kt`): Splash, Login,
Register, Forgot Password, Onboarding (welcome/income/wallet/budget
suggestion/tutorial), Home, Transactions (+ Transaction Detail), Add
Transaction (now with wallet/transfer/budget/goal/upcoming/lent-borrowed
support), Scanner, Budgets (shares a tab with Goals), Wallets, Recurring,
Loans, Reports, Notifications, Profile, Settings.

New since the last snapshot:
- **Real login/session against the backend**, replacing the old
  any-password mock. `AuthRepository` persists access/refresh tokens via
  `SessionStore` (plain DataStore — not yet encrypted, a known follow-up).
- **Onboarding flow**, gated by `OnboardingStore` (DataStore), synced from
  the backend's `user_preferences` on every `/me` fetch so a returning
  user on a new device isn't re-onboarded.
- **Wallets, Budgets, Goals, Recurring, Loans** now real backend-backed
  repositories with dedicated screens; loan settlement creates a real
  opposite-direction transaction rather than flipping a status flag.
- **Notifications computed from live data** instead of static mock
  content.

Cross-cutting features (theme parity, font parity, currency/language
preferences, logo, barcode scanning, manual DI via `AppContainer`) are
unchanged from the prior snapshot — see `android/AGENTS.md` for specifics.

## Deployment

- `web/` auto-deploys to GitHub Pages on every push to `main`
  (`.github/workflows/deploy.yml`) — still points at mock data; not yet
  updated to target a deployed backend.
- `backend/` has no deployment yet — local-only (`docker compose` +
  `pnpm dev`). `ARCHITECTURE.md` §16 names candidate hosts (Railway,
  Render, Fly.io) but none are provisioned.
- `android/` has no CI/release pipeline yet — build/install is local-only
  (`./gradlew assembleDebug` / `installDebug`).

## Known gaps / explicitly out of scope

- **Web is not wired to the real backend yet.** It has no login screen of
  its own; migrating it is gated on adding one first
  (`ARCHITECTURE.md` §9).
- **Android's refresh token lives in plain DataStore**, not yet an
  encrypted store — a named follow-up, not an oversight.
- USD conversion on both platforms uses a fixed reference rate, not a live
  FX feed — documented, not fabricated data.
- **Translation coverage is partial by design** on both platforms (chrome +
  every dashboard page's own copy on Web; chrome + Settings on Android),
  documented in both `AGENTS.md` files.
- **User Management / multi-user/team admin** (present in the Figma
  source) was deliberately dropped — nothing else in the product implies
  multi-user accounts.
- Android has no automated tests and no CI. Backend has no automated
  tests yet either.
- No OpenAPI docs generated from the backend's Zod schemas yet.

## Design-reference inbox

`design-reference/bugs/corrections-to-logo.png`,
`design-reference/suggestions/logo-dark.png`/`logo-light.png`, and
`design-reference/suggestions/add-peso-to-dollar-in-settings.png` were
actioned in an earlier pass: the logo is theme-reactive on both platforms,
and the currency-format toggle performs a real (fixed-rate) COP→USD
conversion.

The `transaction-*.jpeg` batch (an external finance app's Add Transaction
flow, used as a structural reference, not a copy target) was actioned
next: Android's `AddTransactionScreen` gained a gradient hero card and a
`ModalBottomSheet` category picker. Check `design-reference/bugs/` and
`suggestions/` for newer items before assuming this list is exhaustive.

## Recent history (last 10 commits, at this snapshot)

```
13efc64 feat(web): add 0-100 financial health score to Overview
55da554 fix(web): remove transaction deletion from the dashboard
65afdc6 feat: introduce shared backend, wire Android to it, add Web analysis surfaces
625033f feat: finish web dashboard i18n coverage, extend Android scanner strings, add codebase guide
050128d docs: add point-in-time project state snapshot
d6d367a feat: complete i18n coverage, translate category/payment labels, improve add-transaction chip UX
08b6319 fix: correct app logo across themes, real currency conversion, native splash screen
28cdf16 chore: drop unused Inter font files bundled with the Android font work
21a9735 feat: currency format + language settings, new app logo, Android font parity
5bfb45b fix: settings switch/form bugs, add icons to header dropdowns
```
