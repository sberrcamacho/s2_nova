# S2 Nova Android app

Native Android app (Kotlin + Jetpack Compose) — the S2 Nova **mobile app**
for daily financial operations: expenses, income, transactions, budgets,
and barcode-scanned purchases. This is one of two S2 Nova applications; see
the root `AGENTS.md` for how it relates to `web/`.

## Opening / building

Open `android/` as the project root in Android Studio, or from the CLI:

```
./gradlew assembleDebug   # build a debug APK
./gradlew installDebug    # build + install on a running emulator/device
```

Requires an Android SDK (`local.properties` → `sdk.dir`, gitignored — create
it if missing) with `compileSdk 36` / `minSdk 31` platforms installed.

## Project structure

- `app/src/main/java/com/s2nova/app/MainActivity.kt` — single Activity, hosts the whole Compose UI
- `app/src/main/java/com/s2nova/app/ui/nav/NovaNavGraph.kt` — the app's one `NavHost`: all routes, the bottom bar, and the FAB's add-actions sheet live here
- `app/src/main/java/com/s2nova/app/ui/screens/` — one package per screen (auth, home, transactions, addtransaction, scanner, budgets, reports, notifications, profile, settings)
- `app/src/main/java/com/s2nova/app/ui/components/` — shared composables (cards, charts, category icons, progress bars, top bar, bottom nav)
- `app/src/main/java/com/s2nova/app/ui/theme/` — Color/Theme/Type — ported 1:1 from `web/src/index.css`'s design tokens so both apps share one visual identity
- `app/src/main/java/com/s2nova/app/data/model/` — data classes mirroring `web/src/types/index.ts`
- `app/src/main/java/com/s2nova/app/data/mock/` — remaining seed data for entities not yet backend-backed (categories, products/barcodes) — mirrors `web/src/data/*.ts`
- `app/src/main/java/com/s2nova/app/data/remote/` — `ApiClient` (Retrofit + OkHttp, auth interceptor, refresh-on-401 `Authenticator`), `ApiService` (endpoint interface), `Dto.kt` (wire types matching `backend/src/routes/*.ts` JSON exactly)
- `app/src/main/java/com/s2nova/app/data/local/` — `SessionStore` (DataStore: access/refresh tokens) and `OnboardingStore` (DataStore: onboarding/tutorial completion flags)
- `app/src/main/java/com/s2nova/app/data/repository/` — repositories backed by the real backend (`AuthRepository`, `WalletRepository`, `TransactionRepository`, `BudgetRepository`, `GoalRepository`, `CategoryRepository`); `ProductRepository`/`NotificationRepository` remain in-memory mock (barcode/product lookup and notifications are out of scope for the current backend integration pass)
- `app/src/main/java/com/s2nova/app/data/AppContainer.kt` — manual DI: a single object holding the repository singletons every screen reads from; call `AppContainer.init(context)` once (done in `MainActivity.onCreate`) before any repository touches the network

## Architecture notes

- **No DI framework, no ViewModels — by design, not by omission.** Even
  now that most repositories call a real backend, they stay
  `StateFlow`-backed singletons in `AppContainer`; Composables
  `collectAsStateWithLifecycle()` them directly and call suspend repository
  methods via `rememberCoroutineScope().launch { ... }` for mutations. Do
  not introduce Hilt or ViewModels "to do it properly" — this pattern is an
  explicit, standing choice for this codebase, not a placeholder for a
  future migration.
- **Real backend, real session.** `AuthRepository` calls
  `backend/src/routes/auth.ts` (register/login/refresh/logout) and persists
  the access/refresh tokens via `SessionStore` (plain DataStore — not yet
  an encrypted store; a known follow-up, see `ARCHITECTURE.md` §14).
  `AppContainer.refreshUserData()` reloads every domain repository from the
  backend after login/register and after a restored session at cold start.
  `local.properties`' `API_BASE_URL` (gitignored) overrides the default
  `http://10.0.2.2:3000/api/v1` (the emulator's alias for the host
  machine's `localhost`, where `backend/` runs via `pnpm dev`) — currently
  set to the deployed backend on Render (see `backend/AGENTS.md`'s
  "Production deployment" section), so the app talks to the real 24/7
  server instead of a local/LAN one. Google Sign-In (`GoogleAuthHelper.kt`,
  wired into `LoginScreen`/`RegisterScreen`) is likewise config-gated:
  `local.properties`' `GOOGLE_WEB_CLIENT_ID` must be set to the **Web**
  OAuth client ID from Google Cloud Console (see `build.gradle.kts`'s
  comment on why — Credential Manager always audiences its ID token to the
  web client, even on Android) or the button doesn't render at all. The
  account model is deliberately minimal — name, email, and login method
  (password and/or Google) only; there's no phone/city on `User`, matching
  `backend/prisma/schema.prisma`'s `User` model. Editing name/email
  (`AuthRepository.updateProfile`) and changing/creating a password
  (`AuthRepository.changePassword`, from Settings) both call the real
  backend; a successful password change revokes every refresh token
  server-side, so the app logs itself out and returns to `/login` rather
  than keep using a session the server will now reject.
- **Wallets, Budgets, Goals.** "Wallet" in the UI is the backend's
  `Account` resource (`WalletRepository`); a wallet is required on every
  transaction (`AddTransactionScreen` blocks with a "create a wallet
  first" state — `NoWalletState` — if none exist yet, rather than
  crashing or silently picking one). Transaction "concepts" other than
  plain Expense/Income (Transfer, Upcoming, Lent, Borrowed) are real
  fields on `Transaction`/`NewTransactionInput` (`status`, `loanKind`,
  `counterpartyName`, `dueDate`, `transferToWalletId`), not categories —
  see `schema.prisma`'s doc comments in `backend/` for the full rationale.
  **Subscription/Recurring is deliberately NOT a field on `Transaction`**
  — it's a separate `RecurringSeries` definition
  (`RecurringSeriesRepository`, `ui/screens/recurring/RecurringScreen.kt`)
  that only ever produces a real `Transaction` when the user explicitly
  confirms a due occurrence, never automatically on app start (that
  conflation was this screen's original design; it was replaced because
  "definition" and "occurrence" need to stay separate — see
  `RecurringSeries`'s doc comment in `data/model/Models.kt`). Settling a
  Lent/Borrowed transaction (`ui/screens/loans/LoansScreen.kt`) creates a
  real opposite-direction settlement transaction
  (`TransactionRepository.settleLoan`) — never just flips a flag,
  otherwise the wallet balance would never reflect the repayment. Budgets
  and Goals share a tab (`BudgetsScreen` + `ui/screens/goals/GoalsScreen.kt`'s
  `GoalsTab`) rather than a new bottom-nav item, to avoid changing the
  existing bottom bar; budget/goal progress is computed server-side and
  read directly (`BudgetRepository.budgetProgress`), never recomputed
  client-side. Wallets/Recurring/Loans are reachable from Profile, same
  pattern as Settings.
- **Wallet type ↔ payment method coherence.** `WalletType`
  (`data/model/Models.kt`) is `CASH, BANK_DEBIT, BANK_CREDIT, SAVINGS,
  CRYPTO, NEQUI, DAVIPLATA, OTHER` — mirrors backend's `AccountType`
  (`backend/prisma/schema.prisma`). `BANK_DEBIT`/`BANK_CREDIT` replace the
  old flat `BANK` (a bank wallet always carries the debit/credit
  distinction — that's what "tarjeta" means in the product copy); Nequi
  and Daviplata are wallet types a user holds a balance in, not payment
  methods, so they moved out of `PaymentMethod` into `WalletType`. A
  transaction's `paymentMethod` is never chosen by the user or sent by
  this client — `CreateTransactionRequest`/`CreateRecurringSeriesRequest`
  have no `paymentMethod` field at all; the backend derives it
  server-side from the transaction's wallet
  (`paymentMethodForAccountType` in `backend/src/routes/transactions.ts`,
  reused by `recurringSeries.ts`), so a wallet and "how it was paid" can
  never disagree. `AddTransactionScreen` has no payment-method picker for
  this reason — `PaymentMethod` (Kotlin) only exists to deserialize and
  display the value the server already computed
  (`TransactionDetailScreen`/`TransactionRow`); `ScannerScreen`'s payment-
  method chips are the one exception, kept as cosmetic-only (it has no
  wallet picker of its own either, always uses the first wallet) rather
  than removed, since giving Scanner a real wallet picker was out of
  scope for this pass.
- **Goal contributions** (`ui/screens/goals/GoalContributionScreen.kt`,
  reached via a goal card's "Abonar" button in `GoalsTab`) are a dedicated
  flow, separate from the general Add Transaction form, for moving money
  from a wallet straight into a goal's progress — no category picker (it
  posts under `CategoryId.OTHER` without ever showing that choice).
  Mechanically it's nothing new: a normal `EXPENSE` transaction with
  `goalId` set, the same link `AddTransactionScreen`'s "more options" goal
  chip already produces (`backend/src/routes/goals.ts`'s `computeProgress`
  sums every `COMPLETED` transaction by `goalId`) — so it stays
  editable/deletable from `TransactionDetailScreen` like any other
  transaction. Saving shows a `Snackbar` with an "Undo" action
  (`SnackbarHostState`, no new dependency) as the fast path for reversing
  a contribution right after making it; that's in addition to, not
  instead of, deleting it later from the transaction detail screen.
- **Onboarding** (`ui/screens/onboarding/`): first-launch welcome →
  optional income → wallet creation → optional 50/30/20 budget suggestion
  → tutorial carousel, gated by `OnboardingStore` (DataStore), checked once
  at splash before the nav graph picks Login vs. Onboarding vs. Home. Every
  optional step has a Skip; the flow never blocks reaching Home. The local
  DataStore flag is synced from the backend's `user_preferences.onboarding_completed_at`/`tutorial_completed_at`
  on every `/me` fetch (`AuthRepository.fetchAndSyncMe`), so a returning
  user on a new device/reinstall isn't incorrectly re-onboarded. Replay the
  tutorial alone (not the full flow) from Settings. If the income step's
  amount was filled in, `OnboardingWalletScreen` creates a monthly
  `RecurringSeries` ("Salario") once the wallet is chosen/created —
  income entered during onboarding is never a one-off transaction created
  on that first launch, it's the same recurring-definition model as any
  other subscription/income series.
- **Barcode scanning** (`ui/screens/scanner/`) uses CameraX
  (`camera-core`/`camera2`/`lifecycle`/`view`) for the live preview and
  on-device ML Kit Barcode Scanning (`com.google.mlkit:barcode-scanning`)
  for decoding — no cloud calls, no Firebase project required. Manual
  barcode entry is a first-class fallback (`ScannerScreen.kt`), not just an
  edge case, since emulators/test devices often have no real camera feed.
- **Charts are hand-rolled Canvas composables** (`ui/components/NovaCharts.kt`
  — donut, sparkline, bar pair). There's no Compose port of the web's
  Recharts library; keep new chart needs in this file rather than pulling in
  a heavy charting dependency for a mock-data app.
- **Fonts**: Plus Jakarta Sans, bundled locally as `.ttf` files under
  `app/src/main/res/font/` (same family the web app loads as `--font-sans`)
  and wired into `ui/theme/Type.kt` as `NovaFontFamily` — no network/Google
  Play Services Fonts dependency.
- **Currency format / language** are user preferences
  (`UserPreferences.currency`/`.language`, editable in `SettingsScreen`),
  not device settings — screens read them via `rememberCurrencyFormatter()`
  and `rememberStrings()` (`ui/CurrencyFormatting.kt`, `ui/Strings.kt`)
  rather than calling `formatCOP`/`formatUSD` or hardcoding copy directly,
  mirroring web's `useCurrency()`/`useTranslation()`. The `StringKey`
  dictionary covers every screen's UI chrome (labels, buttons, placeholders,
  validation messages, dialogs, permission prompts) **except** auth
  (`LoginScreen`/`RegisterScreen`/`ForgotPasswordScreen`/`AuthLayout`) —
  there is no logged-in user (and therefore no language preference) before
  login, and `AuthRepository.login()`/`.logout()` don't persist one across
  the session boundary, so there is no language state for those screens to
  react to; `rememberStrings()` would just always resolve to its `ES`
  fallback there. `ScannerScreen` **is** in scope (its UI chrome, permission
  message, and product-found sheet all use `rememberStrings()`) — only the
  camera/ML Kit scanning logic itself is untouched. It also covers every
  category/payment-method/budget-status
  label via `categoryStringKey()`/`paymentMethodStringKey()`/
  `budgetStatusStringKey()` — never read `Category.label`/
  `PaymentMethodOption.label` off `data/mock/MockCategories.kt` directly in
  a screen, always go through those + `rememberStrings()` so it reacts to
  the language toggle. Free-form seeded mock content (transaction
  descriptions/merchants, notification title/message text, product names)
  is intentionally left untranslated, same principle as not translating a
  user's own data. `formatUSD` (`data/CurrencyUtils.kt`) actually converts
  COP → USD using a fixed reference rate (`COP_PER_USD`) — there's no live
  FX feed, so it's a documented stand-in constant, not fabricated live data.
- **Logo**: two theme-specific bitmaps, `drawable-nodpi/logo_mark_dark.png`
  and `logo_mark_light.png` (own rounded-card background baked in, mirrors
  web's `logo-mark-dark.png`/`logo-mark-light.png`). `SplashScreen` (the
  in-app Compose route) and `AuthLayout.AuthLogo()` pick between them by
  reading `ThemeController.darkOverride` (falling back to
  `isSystemInDarkTheme()`), same pattern `SettingsScreen` already uses for
  `isDark`. The adaptive launcher icon (`mipmap-*/ic_launcher_foreground.png`)
  is generated from the dark variant since the launcher background stays
  dark. Regenerate all of these from
  `design-reference/suggestions/logo-dark.png`/`logo-light.png` together if
  the mark ever changes.
- **System splash screen** (shown before any Compose content exists, via
  `androidx.core:core-splashscreen`): `MainActivity` calls
  `installSplashScreen()`; the Activity's manifest theme is
  `Theme.S2Nova.Starting` (`values/themes.xml`), overridden per night mode
  in `values-night/themes.xml`. Each variant points at a **background-less**
  transparent-glyph drawable (`drawable-nodpi/splash_icon_light.png` /
  `splash_icon_dark.png` — deliberately different assets from
  `logo_mark_*`, which carry their own card background and would get
  clipped oddly by the OS's icon-safe-zone) plus a `@color/splash_background`
  matching `ui/theme/Color.kt`'s `LightBg`/`DarkBg`
  (`values/colors.xml` / `values-night/colors.xml`), so there's no color
  flash into the Compose splash. This only follows the **system** day/night
  setting — it renders before `ThemeController`'s in-app override exists to
  read. Keep the icon's visible content to roughly 55–60% of its canvas;
  the OS clips anything closer to full-bleed (this was the actual bug:
  the icon used to fall back to the launcher's adaptive icon, which is
  always dark, showing a black card even in light mode). Regenerate the
  splash icons the same way as `logo_mark_*` (transparent glyph, no card)
  from `design-reference/suggestions/logo-dark.png`/`logo-light.png` if the
  mark changes.
- **Pill selector pattern** (`AddTransactionScreen.kt`'s `SelectChip`,
  `GoalContributionScreen.kt`'s `GoalContributionChip`): filled `primary`
  background when selected, a subtle `outline`-alpha `border` when not (so
  unselected pills read as tappable rather than blending into the card
  background), and `Modifier.selectable(role = Role.RadioButton)` instead
  of bare `clickable` so screen readers announce the selected state.
  Follow this pattern for any new chip-style selector rather than
  reintroducing a borderless chip — each screen keeps its own small
  private composable for this rather than sharing one, matching
  `RecurringScreen.kt`'s `RecurringChip`. **Category selection** is a
  `ModalBottomSheet` icon
  grid (`CategoryGridItem`) opened by tapping the category preview in the
  Add Transaction hero card, not an inline chip row — chosen after
  `design-reference/suggestions/transaction-select-category.jpeg` showed a
  grid reads better than a horizontally-scrolling row once a category list
  gets long; it reuses the existing `CategoryIcon` per-category color
  tokens rather than the reference's flat icon tiles, to stay visually
  distinct from that source.

## Keeping in sync with the web app

Both apps intentionally diverge in navigation/layout (mobile vs. dashboard),
but should share: the color palette (`ui/theme/Color.kt` ↔ `web/src/index.css`),
category/product/budget seed data (`data/mock/*.kt` ↔ `web/src/data/*.ts`),
and copy/tone. When one changes, check whether the other needs updating.
