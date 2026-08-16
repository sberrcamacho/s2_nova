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
it if missing) with `compileSdk 36` / `minSdk 26` platforms installed.

## Project structure

- `app/src/main/java/com/s2nova/app/MainActivity.kt` — single Activity, hosts the whole Compose UI
- `app/src/main/java/com/s2nova/app/ui/nav/NovaNavGraph.kt` — the app's one `NavHost`: all routes, the bottom bar, and the FAB's add-actions sheet live here
- `app/src/main/java/com/s2nova/app/ui/screens/` — one package per screen (auth, home, transactions, addtransaction, scanner, budgets, reports, notifications, profile, settings)
- `app/src/main/java/com/s2nova/app/ui/components/` — shared composables (cards, charts, category icons, progress bars, top bar, bottom nav)
- `app/src/main/java/com/s2nova/app/ui/theme/` — Color/Theme/Type — ported 1:1 from `web/src/index.css`'s design tokens so both apps share one visual identity
- `app/src/main/java/com/s2nova/app/data/model/` — data classes mirroring `web/src/types/index.ts`
- `app/src/main/java/com/s2nova/app/data/mock/` — seed data mirroring `web/src/data/*.ts` (same categories, products/barcodes, budgets)
- `app/src/main/java/com/s2nova/app/data/repository/` — in-memory "mock backend" mirroring `web/src/services/*.ts`
- `app/src/main/java/com/s2nova/app/data/AppContainer.kt` — manual DI: a single object holding the repository singletons every screen reads from

## Architecture notes

- **No DI framework, no ViewModels.** Repositories are `StateFlow`-backed
  singletons in `AppContainer`; Composables `collectAsStateWithLifecycle()`
  them directly and call repository methods for mutations. This is
  intentionally simple for the mock-data stage — introduce Hilt + ViewModels
  when a real backend/API replaces `AppContainer`'s repositories.
- **No backend, no persistence.** All data is in-memory and resets on
  process death. `AuthRepository` accepts the seeded demo account
  (`mariana.torres@example.com`, any password) — see `data/mock/MockUser.kt`.
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
  validation messages, dialogs) **except** auth (no user/language
  preference exists yet before login) and the barcode scanner (explicitly
  out of scope). It also covers every category/payment-method/budget-status
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
- **Category/payment-method pill selectors** (`AddTransactionScreen.kt`'s
  `CategoryChip`/`PaymentMethodChip`): filled `primary` background when
  selected, a subtle `outline`-alpha `border` when not (so unselected pills
  read as tappable rather than blending into the card background), and
  `Modifier.selectable(role = Role.RadioButton)` instead of bare
  `clickable` so screen readers announce the selected state. Follow this
  pattern for any new chip-style selector rather than reintroducing a
  borderless chip.

## Keeping in sync with the web app

Both apps intentionally diverge in navigation/layout (mobile vs. dashboard),
but should share: the color palette (`ui/theme/Color.kt` ↔ `web/src/index.css`),
category/product/budget seed data (`data/mock/*.kt` ↔ `web/src/data/*.ts`),
and copy/tone. When one changes, check whether the other needs updating.
