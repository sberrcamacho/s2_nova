# S2 Nova — Project State

Snapshot of what exists, what works, and what's outstanding as of
**2026-08-15** (`main` @ `28cdf16`). This is a point-in-time record, not
living documentation — for how to build/run/structure each app, see the
`AGENTS.md` files, which stay current by definition. Update or replace this
file at the next major milestone rather than trying to keep it perfectly in
sync with every commit.

## Architecture

Two independent applications sharing only visual identity and mock data
shapes — no shared backend or shared code yet:

- **`android/`** — native mobile app, Kotlin + Jetpack Compose. Owns daily
  financial operations: expenses, income, transactions, budgets,
  barcode-scanned purchases.
- **`web/`** — web dashboard, React 19 + TypeScript + Vite 8 + Tailwind v4.
  Owns financial analysis: statistics, charts, budgets, categories,
  analytics, reports.
- **`design-reference/`** — Figma screenshots (visual source of truth),
  current-implementation screenshots, plus `bugs/` and `suggestions/`
  folders used as an informal feedback inbox.

Both apps run entirely on in-memory mock data (no real backend, no
persistence across restarts/process death). This was a deliberate split
from an earlier single-web-app-pretending-to-be-mobile architecture (see
`e07ca5d`, `338b38b`) and that split must not be reverted.

## Web dashboard — implemented

Routes (`web/src/dashboard/routes.tsx`): Overview, Transactions, Expenses,
Income, Budgets, Categories, Analytics, Reports, Settings — all built, all
routed under a single `DashboardLayout` (dark navy sidebar + header, not
theme-reactive).

Cross-cutting features:
- **Light/dark theme** (`ThemeContext`), true-black dark palette.
- **Currency format preference** (COP / USD) via `useCurrency()`, reading/
  writing `user.currency`. USD actually converts the underlying COP amount
  using a fixed reference rate (`COP_PER_USD` in `lib/currency.ts`) — no
  live FX feed, so it's a documented stand-in constant, not fabricated data.
- **Language preference** (Spanish / English) via `useTranslation()`,
  reading/writing `user.preferences.language`. Coverage: nav, page
  titles/subtitles, header, and the full Settings screen — not yet a
  page-by-page translation of every dashboard screen.
- **App logo**: two theme-specific PNG tiles, `assets/logo-mark-dark.png`
  and `assets/logo-mark-light.png` (own rounded-card background baked in),
  regenerated from `design-reference/suggestions/logo-dark.png`/
  `logo-light.png`. `Logo.tsx` picks between them via `useTheme()`, unless
  `tone="inverted"` pins the dark tile (used on the permanently-dark
  sidebar). The favicon uses the dark tile.
- Single-user demo auth (`AuthContext` auto-hydrates a mock user, no real
  login screen in the web app).

## Android app — implemented

Screens (`ui/screens/`, wired in `NovaNavGraph.kt`): Splash, Login,
Register, Forgot Password, Home, Transactions (+ Transaction Detail), Add
Transaction, Scanner, Budgets, Reports, Notifications, Profile, Settings.
Bottom nav: Home / Reports / [+ FAB] / Budgets / Profile.

Cross-cutting features:
- **Theme**: color tokens ported 1:1 from `web/src/index.css`
  (`ui/theme/Color.kt`), manual dark-mode override independent of system
  dynamic color.
- **Font parity with web**: Plus Jakarta Sans bundled locally as `.ttf`
  files under `res/font/` and wired into `NovaFontFamily`
  (`ui/theme/Type.kt`) — no network/Google Play Services Fonts dependency,
  keeping the app fully offline at runtime.
- **Currency format preference** (COP / USD) via `rememberCurrencyFormatter()`
  (`ui/CurrencyFormatting.kt`), reading/writing `UserPreferences.currency`.
  USD converts the underlying COP amount using the same fixed reference
  rate as web (`COP_PER_USD` in `data/CurrencyUtils.kt`).
- **Language preference** (ES / EN) via `rememberStrings()` (`ui/Strings.kt`,
  `StringKey` enum + ES/EN maps). Coverage: bottom nav, top bar titles, and
  the Settings screen itself — same intentional scope as web, not yet every
  screen.
- **App logo**: two theme-specific bitmaps, `drawable-nodpi/logo_mark_dark.png`
  and `logo_mark_light.png` (mirrors web's asset pairing), picked in
  `SplashScreen`/`AuthLayout.AuthLogo()` by reading
  `ThemeController.darkOverride`. The adaptive launcher icon foreground
  (regenerated at all 5 density buckets) uses the dark variant.
- **Barcode scanning**: CameraX + on-device ML Kit Barcode Scanning, no
  Firebase/cloud dependency; manual barcode entry as a first-class fallback.
- Manual DI (`AppContainer`), no Hilt, no ViewModels — `StateFlow`-backed
  repository singletons, intentional for the mock-data stage.

## Deployment

- `web/` auto-deploys to GitHub Pages on every push to `main`
  (`.github/workflows/deploy.yml`), build+deploy verified green as of
  `28cdf16` (https://github.com/sberrcamacho/s2_nova/actions/runs/31907814105).
- `android/` has no CI/release pipeline yet — build/install is local-only
  (`./gradlew assembleDebug` / `installDebug`).

## Known gaps / explicitly out of scope

- **No real backend.** Both apps' data resets on restart; USD conversion
  uses a fixed reference rate, not a live FX feed.
- **Translation coverage is partial by design** on both platforms (chrome +
  Settings, not every screen) — documented in both `AGENTS.md` files so
  this isn't mistaken for an oversight.
- **User Management / multi-user/team admin** (present in the Figma source)
  was deliberately dropped — nothing else in the product implies
  multi-user accounts.
- Android has no automated tests and no CI.

## Design-reference inbox

`design-reference/bugs/corrections-to-logo.png`,
`design-reference/suggestions/logo-dark.png`/`logo-light.png`, and
`design-reference/suggestions/add-peso-to-dollar-in-settings.png` were
actioned in the pass immediately following this snapshot's initial write:
the logo artifact was fixed (root cause: a fragile transparent-glyph
extraction left a stray border ring — replaced with self-contained
rounded-card tiles instead), the logo is now theme-reactive on both
platforms, and the currency-format toggle now performs a real (fixed-rate)
COP→USD conversion instead of only reformatting the same number.

The `transaction-*.jpeg` batch in `design-reference/suggestions/` (an
external finance app's Add Transaction flow, used as a structural
reference, not a copy target) was actioned next: Android's
`AddTransactionScreen` gained a gradient hero card (reusing the existing
`heroFrom`/`heroTo` tokens the Home balance card already uses) showing the
Expense/Income switch, a tappable category preview, and the amount field,
plus a category picker that opens as a `ModalBottomSheet` icon grid instead
of a horizontal chip row. Deliberately not adopted: the reference's
Transfer tab and its Account/Budget/Goal chip rows, since S2 Nova has no
account/goal data model to back them — see `android/AGENTS.md` for the
scope reasoning. Check `design-reference/bugs/` and `suggestions/` for
newer items before assuming this list is exhaustive.

## Recent history (last 10 commits, at initial snapshot)

```
28cdf16 chore: drop unused Inter font files bundled with the Android font work
21a9735 feat: currency format + language settings, new app logo, Android font parity
5bfb45b fix: settings switch/form bugs, add icons to header dropdowns
24eb5cb fix: point pnpm/action-setup at web/package.json in deploy workflow
44eb492 docs: describe the two-app architecture in the root README
338b38b feat(android): add native S2 Nova Android app (Kotlin + Jetpack Compose)
e07ca5d refactor: split S2 Nova into a standalone web dashboard, remove mobile surface
f9ef487 fix: resolve pnpm version conflict in GitHub Actions
f6b98de fix: prepare S2 Nova for GitHub Pages deployment
7b28dce ci: deploy S2 Nova to GitHub Pages
```
