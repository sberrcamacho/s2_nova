# S2 Nova — Codebase Guide

A map of how this repo is put together, meant as an onboarding read. For
day-to-day dev commands and conventions, the various `AGENTS.md` files are
the source of truth; this file explains *how the pieces connect*.

## 1. The big picture

S2 Nova is **two independent apps sharing one backend**: a visual
identity and now a real database/API, but each client is still built, run,
and deployed on its own:

```
s2_nova/
├── android/            Native mobile app (Kotlin + Jetpack Compose)
│                        → daily ops: expenses, income, transactions,
│                          budgets, barcode-scanned purchases
│                        → talks to backend/ for real (auth, accounts,
│                          transactions, budgets, goals, recurring series)
├── web/                 Web dashboard (React 19 + TS + Vite + Tailwind v4)
│                        → analysis: stats, charts, budgets, goals,
│                          insights, reports
│                        → still runs on its own in-memory mock data (no
│                          login screen yet — see §4 below)
├── backend/             Shared API (Node.js + TS + Fastify + Prisma/
│                          PostgreSQL) — one user identity, one database
└── design-reference/    Figma screenshots (source of truth for visuals)
                          + current-implementation screenshots
```

Android has been migrated off mock data onto the real backend (see
`ARCHITECTURE.md`'s phased plan — Phases 1–3, 5, and 8 are done). Web has
not (Phase 9): its `services/*.ts` are still in-memory CRUD over
`data/*.ts` seed arrays, on purpose, until Web gets a real login screen to
authenticate with. Until then, "keeping in sync" between the two clients
is still a manual, human discipline for anything Web hasn't migrated yet:
color tokens, category/product/budget seed data, and copy/tone should
match even though that code is duplicated.

## 2. Web dashboard (`web/`)

Stack: React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts-based charts.

### Boot sequence

```
index.html
  → src/main.tsx        mounts <App/> into #root, imports index.css
    → src/App.tsx        wraps the app in context providers, renders the
                          dashboard route tree at "/"
      → src/dashboard/routes.tsx   React Router routes, all under
                                    DashboardLayout
        → src/dashboard/DashboardLayout.tsx   Sidebar (permanent dark navy)
                                                + Header + <Outlet/>
          → src/dashboard/pages/*.tsx          one file per route
```

### Layers, outside-in

1. **Pages** (`src/dashboard/pages/`) — one per route: Overview,
   Transactions, Budgets, Goals, Analytics (tabs: Spending, Income, Cash
   Flow, Net Worth), Insights, Reports, Settings. The old standalone
   Expenses/Income/NetWorth/Recurring/Wallets/Categories pages were
   absorbed into Analytics' tabs rather than kept as separate routes — see
   `web/AGENTS.md`'s Information Architecture section for the current nav
   (capped at exactly 7 items) and why. These compose UI components and
   read data via hooks/services.
2. **Shared components**
   - `src/components/ui/` — generic building blocks (Button, Card, Modal,
     Input, Badge, KPICard, ProgressBar, Toast, …)
   - `src/components/charts/` — chart wrappers around Recharts (donut,
     bar, line, area) plus a shared `chartTheme.ts`
   - `src/components/transactions/TransactionRow.tsx` — shared row UI
3. **App-wide state** (`src/state/`) — React Context, not Redux:
   - `AuthContext` — auto-hydrates a single mock user (no real login)
   - `ThemeContext` — light/dark toggle
   - `ToastContext` — toast notifications
   - `AppDataContext` — the mock in-memory "database" for the session
   - `useCurrency` / `useTranslation` — hooks that read `user.currency`
     and `user.preferences.language`; **always** go through these instead
     of importing `lib/currency.ts` directly or hardcoding copy, so the
     Settings page's toggles actually take effect everywhere.
4. **Local dashboard state**: `src/dashboard/DashboardFiltersContext.tsx` —
   the date-range filter shared across dashboard pages.
5. **Mock backend** (`src/services/` + `src/data/`) — `services/*.ts` are
   the "API layer" (e.g. `transactionService.ts`, `analyticsService.ts`);
   `data/*.ts` is the seed data they read/mutate in memory. A real
   `backend/` now exists and Android already calls it, but Web hasn't been
   migrated yet (gated on Web getting a real login screen — see
   `ARCHITECTURE.md` §9); when it is, this is the layer that gets swapped
   for real `fetch()` calls, function signatures unchanged. Several
   services (`accountService`, `goalService`, `budgetService`,
   `recurringService`) are deliberately **read-only** on Web — creating/
   editing wallets, budgets, goals, and recurring series is Android's job.
6. **i18n** (`src/lib/i18n/translations.ts`) — hand-rolled `es`/`en`
   dictionary consumed through `useTranslation()`'s `t()`, `tCategory()`,
   `tPaymentMethod()`.
7. **Types** (`src/types/index.ts`) — shared TS interfaces/types for
   transactions, budgets, categories, users, etc.

### Styling

Tailwind v4 via the `@tailwindcss/vite` plugin — no separate Tailwind
config file. `src/index.css` is the single entrypoint: `@import
'tailwindcss'`, design tokens (color palette for light/dark), and font
wiring. Utility classes are used directly in JSX.

## 3. Android app (`android/`)

Stack: Kotlin, Jetpack Compose, CameraX + ML Kit (on-device barcode
scanning), no DI framework, no ViewModels (deliberate, standing choice —
not a placeholder for a future migration, even now that most repositories
call a real backend).

### Boot sequence

```
MainActivity.kt          single Activity, installs the splash screen,
                          hosts all Compose UI
  → ui/nav/NovaNavGraph.kt   the one NavHost: every route, the bottom
                              bar, and the FAB's "add" actions sheet
    → ui/screens/<feature>/*.kt   one package per screen
```

### Layers

1. **Screens** (`ui/screens/`) — one package per feature: auth, home,
   transactions, addtransaction, scanner, budgets, reports, notifications,
   profile, settings, splash.
2. **Shared composables** (`ui/components/`) — NovaCard, NovaCharts
   (hand-rolled Canvas donut/sparkline/bar-pair — no Compose charting
   library), NovaProgressBar, NovaTopBar, TransactionRow, CategoryIcon,
   AddActionsSheet.
3. **Theme** (`ui/theme/`) — Color/Theme/Type, ported 1:1 from
   `web/src/index.css`'s tokens so both apps look identical.
4. **Data layer** (`data/`):
   - `data/model/Models.kt` — data classes mirroring `web/src/types/index.ts`
   - `data/mock/*.kt` — seed data for what's *not* backend-backed yet
     (categories, products/barcodes) — mirrors the equivalent `web/src/data/*.ts`
   - `data/remote/` — `ApiClient` (Retrofit + OkHttp, auth interceptor,
     refresh-on-401 `Authenticator`), `ApiService` (endpoint interface),
     `Dto.kt` (wire types matching `backend/src/routes/*.ts` JSON exactly)
   - `data/local/` — `SessionStore` (DataStore: access/refresh tokens) and
     `OnboardingStore` (DataStore: onboarding/tutorial completion flags)
   - `data/repository/*.kt` — `StateFlow`-backed repositories; most
     (`AuthRepository`, `WalletRepository`, `TransactionRepository`,
     `BudgetRepository`, `GoalRepository`, `CategoryRepository`) now call
     the real backend via `ApiClient`; `ProductRepository`/
     `NotificationRepository` stay in-memory mock (out of scope for the
     current backend integration pass)
   - `data/AppContainer.kt` — manual DI: one object holding every
     repository singleton; `AppContainer.init(context)` runs once in
     `MainActivity.onCreate` before any repository touches the network;
     screens call `collectAsStateWithLifecycle()` on the repositories
     directly and launch suspend repository methods via
     `rememberCoroutineScope()` for mutations. This stands in for Hilt +
     ViewModels — a standing choice, not a stopgap.
5. **Cross-cutting helpers**: `ui/CurrencyFormatting.kt`
   (`rememberCurrencyFormatter()`), `ui/Strings.kt`
   (`rememberStrings()`/`StringKey` dictionary) — same
   "always go through the hook, never hardcode" rule as the web app's
   `useCurrency`/`useTranslation`.

### Notable subsystems

- **Barcode scanning** (`ui/screens/scanner/`): CameraX for the live
  camera preview, ML Kit Barcode Scanning for on-device decoding — no
  cloud calls. Manual barcode entry is a first-class fallback.
- **Splash screen**: two layers — the OS-level splash
  (`androidx.core:core-splashscreen`, follows system day/night only) and
  an in-app Compose `SplashScreen` route that can react to the in-app
  theme override.

## 4. Backend (`backend/`)

Stack: Node.js, TypeScript, Fastify, Prisma ORM over PostgreSQL, Zod for
request/response validation, JWT access tokens + rotating refresh tokens,
argon2id password hashing. Full design rationale (why these choices, the
schema, auth flows, sync strategy) lives in `ARCHITECTURE.md`; this file
just maps how the code connects.

### Boot sequence

```
src/server.ts            Fastify bootstrap: plugins, route registration, listen
  → src/plugins/auth.ts    verifies the access token, derives userId
  → src/routes/*.ts        one file per resource, each a Fastify plugin
      → src/lib/prisma.ts  shared PrismaClient singleton
```

### Layers

1. **Routes** (`src/routes/`) — `auth.ts`, `me.ts`, `accounts.ts`,
   `categories.ts`, `transactions.ts`, `budgets.ts`, `goals.ts`,
   `recurringSeries.ts`, `health.ts`. Every route except `auth/*`,
   `health*`, and the public `GET /products/:barcode` lookup requires a
   valid access token; `userId` always comes from the verified token,
   never a client-supplied field.
2. **Schema** (`prisma/schema.prisma`) — source of truth for the DB shape;
   `prisma/seed.ts` seeds the global (`user_id = null`) categories every
   user sees, kept in sync by `slug` with `web/src/data/categories.ts` and
   `android/.../data/mock/MockCategories.kt`.
3. **Validation** — Zod schemas reject malformed input before it reaches
   Prisma; no ad-hoc `if` checks.
4. **Money** — `BigInt` minor units in the DB and internal code; only the
   route layer converts to/from the plain `number` shape the clients
   already expect.

### Running it

```bash
cd backend
cp .env.example .env
docker compose up -d          # starts Postgres on :5432
pnpm install
pnpm prisma:migrate           # applies prisma/schema.prisma, generates the client
pnpm exec prisma db seed      # seeds the global categories
pnpm dev                      # Fastify on :3000, reloads on change
```

`GET /api/v1/health` is a liveness check; `GET /api/v1/health/db` also
round-trips a query through Prisma to check Postgres connectivity.

## 5. How the two apps stay visually identical

Web and Android share no UI package, so parity is maintained by
convention, listed in `android/AGENTS.md`'s "Keeping in sync" section:

| Concern | Web | Android |
|---|---|---|
| Color tokens | `src/index.css` | `ui/theme/Color.kt` |
| Seed data (categories/products not yet backend-only) | `src/data/*.ts` | `data/mock/*.kt` |
| Type shapes | `src/types/index.ts` | `data/model/Models.kt` |
| i18n | `src/lib/i18n/translations.ts` + `useTranslation()` | `ui/Strings.kt` + `rememberStrings()` |
| Currency format | `useCurrency()` | `rememberCurrencyFormatter()` |
| Logo | `assets/logo-mark-*.png` | `res/drawable-nodpi/logo_mark_*.png` |

For entities Android already migrated (accounts, transactions, budgets,
goals, recurring series), the backend's Prisma schema is the actual shared
source of truth instead — Web's equivalent `data/*.ts` seed shapes just
need to keep matching its field names by convention until Web migrates too.

## 6. Running each app

```bash
# Web dashboard
cd web && pnpm dev        # http://localhost:8443

# Android app
cd android
./gradlew assembleDebug   # build debug APK
./gradlew installDebug    # build + install on a running emulator/device

# Backend (required for Android to do anything beyond its login screen)
cd backend && docker compose up -d && pnpm dev   # http://localhost:3000
```

## 7. Recommended tutorials, in reading order

If you want to actually *read and understand* this code (not just skim
the tree above), these are the concrete stacks in play and where to learn
each one from primary sources:

### Web side (React + TypeScript + Vite + Tailwind)
1. **React** — [react.dev/learn](https://react.dev/learn) — the official
   "Learn React" tutorial. Covers components, JSX, state, and — important
   for this repo — the "Passing Data Deeply with Context" section, since
   `src/state/*Context.tsx` is exactly that pattern.
2. **TypeScript** — [typescriptlang.org/docs/handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
   — read at least "Everyday Types" and "Interfaces" before opening
   `src/types/index.ts`.
3. **Vite** — [vite.dev/guide](https://vite.dev/guide/) — short read;
   explains why `main.tsx`/`index.html` are wired the way they are and
   what `vite.config.ts` does.
4. **Tailwind CSS v4** — [tailwindcss.com/docs](https://tailwindcss.com/docs/installation/using-vite)
   — this repo uses the v4 Vite plugin (no config file), which is a
   change from v3 if you've seen Tailwind before.
5. **React Router** (used by `dashboard/routes.tsx`) —
   [reactrouter.com](https://reactrouter.com/start/framework/routing) for
   the routing model.

### Android side (Kotlin + Jetpack Compose)
1. **Kotlin** — [kotlinlang.org/docs](https://kotlinlang.org/docs/getting-started.html)
   if Kotlin syntax itself is new (data classes, `sealed class`,
   coroutines/`Flow` basics — the repositories lean on `StateFlow`).
2. **Jetpack Compose** — [developer.android.com/courses/jetpack-compose/course](https://developer.android.com/courses/jetpack-compose/course)
   — Google's official Compose course/codelabs. Start with "Compose
   basics" (state, composables, recomposition) before reading any screen
   file; then "State and Jetpack Compose" to understand
   `collectAsStateWithLifecycle()`.
3. **Navigation in Compose** —
   [developer.android.com/guide/navigation](https://developer.android.com/guide/navigation)
   before reading `NovaNavGraph.kt`.
4. **CameraX** —
   [developer.android.com/training/camerax](https://developer.android.com/training/camerax)
   and **ML Kit Barcode Scanning** —
   [developers.google.com/ml-kit/vision/barcode-scanning](https://developers.google.com/ml-kit/vision/barcode-scanning)
   — only needed for `ui/screens/scanner/`.

### Backend side (Node.js + Fastify + Prisma)
1. **Fastify** — [fastify.dev/docs/latest](https://fastify.dev/docs/latest/)
   — start with "Getting Started" and "Plugins", since every file in
   `src/routes/` is registered as a plugin in `src/server.ts`.
2. **Prisma** — [prisma.io/docs](https://www.prisma.io/docs/orm) — read
   "Data model" and "CRUD" before opening `prisma/schema.prisma` or any
   route that calls `prisma.<model>`.
3. **Zod** — [zod.dev](https://zod.dev/) — short read; every route
   validates its request/response through a Zod schema before touching
   Prisma.
4. **JWT** — [jwt.io/introduction](https://jwt.io/introduction) — enough
   background to make sense of `src/lib/tokens.ts` and the access/refresh
   token flow described in `ARCHITECTURE.md` §6.

### Suggested order to read the code itself
1. Skim all three `AGENTS.md` files (already concrete and repo-specific).
2. Backend: `src/server.ts` → pick one resource, e.g. `src/routes/accounts.ts`
   → trace it through `prisma/schema.prisma`'s matching model.
3. Web: `src/main.tsx` → `src/App.tsx` → `src/dashboard/routes.tsx` →
   pick one simple page (`OverviewPage.tsx`) → trace its data back through
   a hook/service to `src/data/`.
4. Android: `MainActivity.kt` → `NovaNavGraph.kt` → `HomeScreen.kt` →
   trace its data back through `AppContainer.kt` → a repository → either
   `data/remote/ApiClient.kt` (real backend) or `data/mock/` (categories/
   products, still local).
5. Once one vertical slice makes sense on each side, the rest of the
   screens/pages follow the same pattern and are much faster to read.
