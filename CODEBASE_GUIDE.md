# S2 Nova — Codebase Guide

A map of how this repo is put together, meant as an onboarding read. For
day-to-day dev commands and conventions, the various `AGENTS.md` files are
the source of truth; this file explains *how the pieces connect*.

## 1. The big picture

S2 Nova is **two independent apps** that share a visual identity and mock
data shapes, but no code and no backend:

```
s2_nova/
├── android/            Native mobile app (Kotlin + Jetpack Compose)
│                        → daily ops: expenses, income, transactions,
│                          budgets, barcode-scanned purchases
├── web/                 Web dashboard (React 19 + TS + Vite + Tailwind v4)
│                        → analysis: stats, charts, budgets, categories,
│                          reports
└── design-reference/    Figma screenshots (source of truth for visuals)
                          + current-implementation screenshots
```

Both apps run entirely on **in-memory mock data** — no server, no
database, no network calls (except on-device ML Kit for barcode scanning).
Data resets whenever the process restarts. This is intentional for the
current stage of the product; a real backend would slot in later behind
the same `services/`/`repository` interfaces that already exist.

Because there's no shared backend yet, "keeping in sync" between the two
apps is a manual, human discipline: color tokens, category/product/budget
seed data, and copy/tone should match even though the code is duplicated.

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
   Transactions, Expenses, Income, Budgets, Categories, Analytics, Reports,
   Settings. These compose UI components and read data via hooks/services.
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
   `data/*.ts` is the seed data they read/mutate in memory. This is the
   layer that would eventually be swapped for real HTTP calls.
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
scanning), no DI framework, no ViewModels (deliberately, for this
mock-data stage).

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
4. **"Backend" layer** (`data/`):
   - `data/model/Models.kt` — data classes mirroring `web/src/types/index.ts`
   - `data/mock/*.kt` — seed data mirroring `web/src/data/*.ts`
   - `data/repository/*.kt` — in-memory `StateFlow`-backed repositories,
     mirroring `web/src/services/*.ts`
   - `data/AppContainer.kt` — manual DI: one object holding every
     repository singleton; screens call `collectAsStateWithLifecycle()`
     directly on them and call repository methods to mutate data. This
     stands in for Hilt + ViewModels until a real backend exists.
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

## 4. How the two apps stay visually identical

There's no shared package, so parity is maintained by convention, listed
in `android/AGENTS.md`'s "Keeping in sync" section:

| Concern | Web | Android |
|---|---|---|
| Color tokens | `src/index.css` | `ui/theme/Color.kt` |
| Seed data | `src/data/*.ts` | `data/mock/*.kt` |
| Type shapes | `src/types/index.ts` | `data/model/Models.kt` |
| i18n | `src/lib/i18n/translations.ts` + `useTranslation()` | `ui/Strings.kt` + `rememberStrings()` |
| Currency format | `useCurrency()` | `rememberCurrencyFormatter()` |
| Logo | `assets/logo-mark-*.png` | `res/drawable-nodpi/logo_mark_*.png` |

## 5. Running each app

```bash
# Web dashboard
cd web && pnpm dev        # http://localhost:8443

# Android app
cd android
./gradlew assembleDebug   # build debug APK
./gradlew installDebug    # build + install on a running emulator/device
```

## 6. Recommended tutorials, in reading order

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

### Suggested order to read the code itself
1. Skim both `AGENTS.md` files (already concrete and repo-specific).
2. Web: `src/main.tsx` → `src/App.tsx` → `src/dashboard/routes.tsx` →
   pick one simple page (`OverviewPage.tsx`) → trace its data back through
   a hook/service to `src/data/`.
3. Android: `MainActivity.kt` → `NovaNavGraph.kt` → `HomeScreen.kt` →
   trace its data back through `AppContainer.kt` → a repository → mock
   data.
4. Once one vertical slice makes sense on each side, the rest of the
   screens/pages follow the same pattern and are much faster to read.
