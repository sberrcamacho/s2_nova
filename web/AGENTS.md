# s2-nova web dashboard

React + Vite + Tailwind CSS web application — the S2 Nova **web dashboard**
(financial analysis: statistics, charts, budgets, goals, insights, reports).
This is one of two S2 Nova applications; see the root `AGENTS.md` for how it
relates to `android/`. This app has its own login/register screens
(`src/auth/`, email/password + Google Sign-In) and talks to the real
backend over `VITE_API_URL` (`src/lib/apiClient.ts`) — `src/services/*.ts`
are thin wrappers around `fetch()` calls, not mock data (see
`ARCHITECTURE.md` §9). `ProtectedRoute` gates every dashboard route behind
a real session; a signed-out visitor lands on `/login`.

**Visual source of truth**: `design_handoff_s2_nova_v2/S2 Nova Dashboard v2.dc.html`
(specs in `design_handoff_s2_nova_v2/docs/` — `WEB_PARITY.md` lists what
Web must match on Android). Screens are being reconciled against it one
by one; a screen not yet migrated is unverified.

**v2 parity status** (target: Android `8751c40`). Done on Web: the v2 data
layer (taxonomy, multi-currency), Inicio, Movimientos, Planes
(Presupuestos · Metas · Préstamos), Reportes, Ajustes (profile, password,
sessions, deletion, Monedas, Categorías), Nuevo movimiento,
Billeteras, mini-guides, first run, guest mode. Every screen has had its
v2 visual pass against the mockup. Movimientos lists every Programado on top of the current
month, then the month by day with each day's total; its detail shows the
comprobante (Ver · Reemplazar · Descargar · Quitar, or attach one) and
deletes in two steps when the movement is ≥ $200.000 or has a receipt
or repeats, otherwise at once with "Deshacer" in the toast (`showToast`'s
optional action). Inicio's goal rings keep the grey the mockup draws (its v2
override never recolored them) and its hero bars are data-driven (the
mockup's are fixed heights). The mockup's "Transporte subió 82% frente a
julio" alert has no rule in the specs, backend or Android yet.
The whole test suite passes.

## Development Server

Requires a `.env.local` (gitignored) with `VITE_API_URL` pointing at a
running backend — either local (`VITE_API_URL=http://localhost:3000/api/v1`,
with `backend/`'s `pnpm dev` running) or the deployed one
(`https://s2-nova.onrender.com/api/v1`). Without it, `apiClient.ts` has no
base URL and every request fails. Run `pnpm dev` from this directory to
start the Vite development server on `$PORT` (default 8443).

- Preview URL: http://localhost:8443 (or the configured `$PORT`)
- Hot reload: Changes to source files are reflected immediately

## Information Architecture

Web v2: the sidebar
(`Sidebar.tsx`, `NAV_ITEMS`) has the same four primary destinations as
Android's bottom bar, in the same order — **Inicio · Movimientos · Planes ·
Reportes** — plus **Ajustes** in the footer. Pre-v2 paths (`/overview`,
`/transactions`, `/budgets`, `/goals`, `/analytics`, `/insights`,
`/reports`, `/settings`) redirect in `routes.tsx`.

- **Inicio** (`InicioPage.tsx`) — v2-migrated. Balance hero (sum of
  wallets, month income/expenses from `summaryService`, 6-month net bars),
  Billeteras (row → `/billeteras`), Alertas (shared backend rules
  via `alertService`; dismissals are per user in localStorage, pruned to
  live ids), Presupuestos (all, by risk), Metas, Préstamos, Gasto por
  categoría, Próximos 14 días with running balance (row → `EventDialog`:
  confirm or skip a Programado through the backend, or "Eliminar serie"
  in two clicks — not in the mockup; Web has no Programados page). Pure presentation
  helpers live in `lib/inicio.ts` and `lib/alertCopy.ts`.
- **Movimientos** (`MovimientosPage.tsx`) — v2-migrated. One month at a
  time (`transactionService.getMonth`, which pages past the 200-row
  limit), chosen by the header's period selector (`?period=YYYY-MM`,
  `usePeriod`, current month plus the five before it). Type pills and the
  header search (`?q=`) filter client-side over description, merchant,
  translated category and wallet name (`lib/movimientos.ts`); Inicio's
  wallet rows open it with the wallet name as the query, as in the
  mockup. A row opens the movement dialog (`components/v2/DetailDialog`,
  shared with EventDialog) with "Eliminar" — the backend reverses the
  balance, and "Editar" (not in the mockup; parity with Android), which
  opens `NewTransactionPanel` with `editing` — every field prefilled,
  Repetir from its series, its receipt — and saves through
  `transactionService.editMovement` (PATCH with explicit nulls and the
  series rule). The title is required. Every other money field (budget,
  goals, loans, wallets, first run) uses `Kit`'s `AmountField`: the same
  typed arithmetic, decimals and Teclado/Calculadora as the NM amount.
- **Sesión**: `AuthContext` signs out for real on "Cierre automático"
  (`state/useIdleLogout.ts`, Ajustes › Seguridad row — not in the web
  mockup, parity with Android), when a request finds the session over
  (`apiClient.setSessionEndedHandler`), and in every tab at once
  (`BroadcastChannel`). See ARCHITECTURE.md §3.
- **Planes** (`PlanesPage.tsx`) — v2-migrated tab host,
  `?tab=presupuestos|metas|prestamos` (+ `&side=lent|borrowed`), with the
  mockup's header button ("Nuevo presupuesto" / "Nueva meta" / "Registrar
  préstamo|deuda"). Presupuestos (`BudgetsPage.tsx`: mark, scope, state
  note and period per card, riskiest first) and Metas (`GoalsPage.tsx`:
  plan-icon ring, target date, estimate, "Aporte …" line, "+ Abonar")
  write through the mockup's centered modals in `components/planes/`:
  `BudgetModal` (Por categoría / Personalizado, Categoría · Billeteras ·
  Periodo tiles with inline sections — PLANS.md §4), `GoalModal` (icon,
  initial amount, target date, inline "Aporte periódico"; PUT
  /goals/:id/plan only when the plan changed, since it restarts the
  schedule) and `GoalPayModal` ("Abonar"). Deleting a budget or goal goes
  through Kit's two-step `ConfirmDialog`; a goal's money returns to its
  origin wallets. Préstamos (`components/LoansTab.tsx`) creates and edits
  loans in `planes/LoanModal.tsx` (the mockup's planDraft loan variant;
  delete also goes through `ConfirmDialog`) and records abonos in its
  "Registrar abono" dialog. The modal building
  blocks live in `components/v2/Kit.tsx`; budget/goal copy shared with
  Inicio lives in `lib/planCopy.ts`.
- **Reportes** (`ReportesPage.tsx`) — v2-migrated. Gastos · Ingresos ·
  Flujo de caja · Patrimonio (`?tab=gastos|ingresos|flujo|patrimonio`)
  over the page's own 3M/6M/12M range; the header shows no period
  selector here. Every figure comes from `summaryService.getReport`
  (backend `GET /summary/report`, the same one Android's Reportes uses);
  only Flujo de caja's projection of active Programados is built
  client-side, with Inicio's 14-day `upcomingWithin` rule. "En qué se fue
  el dinero" toggles Categorías (with the month-over-month rise) and
  Subcategorías (the report's `subcategories`, per leaf); income sources
  are named "Subcategoría — De". Flujo de caja's Entradas/Salidas/Flujo
  neto are the current month's, as in the mockup. The pre-v2 Analytics,
  Insights and Reports pages folded into it and are gone.
- **Ajustes** — `AjustesPage` (profile card, Preferencias, Seguridad) plus
  one route per sub-view under `pages/ajustes/`: `/ajustes/perfil`,
  `/ajustes/contrasena`, `/ajustes/sesiones`, `/ajustes/eliminar`,
  `/ajustes/monedas` (principal currency, the others with their rate and
  wallet count, "Agregar moneda" from the backend catalog; only a
  currency with no wallets shows "Quitar", behind the two-step
  `ConfirmDialog`; the principal can't change after the first wallet),
  `/ajustes/categorias` (`?tab=ingresos`; the taxonomy list beside the
  mockup's form — rename any node, icon and "Mostrar al registrar" on
  parents, create custom parents/subcategories, delete custom ones
  through `ConfirmDialog`; Nuevo movimiento's "Gestionar categorías"
  link opens it on the right tab).
  Shared pieces live in `components/ajustes/AjustesUi.tsx`. Sessions, the
  delete-account counts, the CSV export and the deletion itself are backend
  endpoints (`/me/sessions`, `/me/footprint`, `/me/export`, `DELETE /me`);
  the password rules shown live are re-checked by `POST /me/password`.
  The sidebar's avatar and name open `/ajustes/perfil`, as in the mockup.

First run (`auth/FirstRunPage.tsx`, `/bienvenida`, ONBOARDING.md §2):
`ProtectedRoute` sends a signed-in user whose shared `onboardingCompleted`
preference is false there before any other route (Crear cuenta, or a
first Google sign-in). Step 1 picks the principal currency (the browser
region's one first, `deviceRegion()`), step 2 creates the first wallet;
the principal is saved with the wallet (`PUT /me/currencies/principal`
only works before any wallet exists), then the preference is set and the
user lands on Inicio. The back arrow on step 1 signs out to Crear cuenta.
An older account that already has wallets is just marked done.

Guest mode (`lib/guestApi.ts`, ONBOARDING.md §1): Login's "Continuar como
invitado" calls `AuthContext.enterGuest()`, which installs an in-memory
stand-in for the backend behind `apiClient` (`setGuestHandler`): every
service call is answered locally with the backend's wire shapes and
nothing reaches the server. It holds the mockup's example account (the
same seed as Android's `DemoData`, plus eleven earlier months from the
mockup's `BAR_DATA` so the charts have a history) and mirrors the
backend's balance, budget, goal, alert and summary rules, so everything is
interactive. `user.isGuest` shows the "Modo invitado" banner above every
page (`DashboardLayout`); guides are on. Signing out, reloading, or
reaching Login/Crear cuenta (the banner's button) drops the account.

Mini-guides (`dashboard/components/GuideCard.tsx`, ONBOARDING.md §3):
one card bottom-right on Inicio, Movimientos, Planes, Reportes and
Billeteras until "Entendido"; "Omitir guías" turns them off and
Ajustes › "Ver otra vez" resets them. `guidesSeen`/`guidesOff` are server
preferences shared with Android. The card hides while anything marked
`aria-modal` is open.

Toasts (`components/ui/Toast.tsx`) follow the mockup: one inverted pill
at the bottom centre, 2.6 s, the same for confirmations and errors.

**Billeteras** (`BilleterasPage.tsx`, sidebar footer above Ajustes) — one
card per wallet (kind · currency, balance, "≈" principal line, share of
the total; "Ver movimientos →" opens `/movimientos?q=<wallet name>`).
`WalletModal.tsx` creates and edits (Nombre, Tipo, Moneda, Saldo actual);
the backend fixes currency and balance at creation, so editing changes
only name and type, as on Android. Deleting uses the two-step
`ConfirmDialog` and the backend deletes the wallet's movements; the last
wallet can't be deleted.

The header's "Nuevo movimiento" button (and the `N` shortcut) opens
`components/panels/NewTransactionPanel.tsx` inside `SidePanel.tsx` (the
mockup's 460px side panel): type, "Elige una categoría" (inline
category/subcategory grid), the amount hero with typed arithmetic and the
Teclado/Calculadora switch, wallet, the automatic budget line,
Título/Nota, and the option tiles (Fecha y hora, Repetir, Adjuntar, De,
Presupuesto, Más) whose sections open inline — NEW_MOVEMENT.md and
WEB_PARITY.md. The pure helpers (evalExpr, calculator keys, Repetir
summaries) live in `lib/nuevoMovimiento.ts`; pad mode, last wallet and
"Como el anterior" are per-device localStorage preferences. The status is
left to the backend (a future date/time saves as PLANNED); the receipt is
uploaded after the movement is created. Planes' forms are centered
modals instead, as in the mockup.

v2 screens use `--v2-*` tokens (`bg-v2-surface`, `text-v2-dim`, …) in
`index.css`, whose values are the DESIGN-SYSTEM.md semantic tokens since F1
(`v2-accent` = primary fill, `v2-accent2` = link text, `v2-accent-line` =
selected boundaries; never use `v2-accent` as text on a surface), `line-height: normal`
like the mockup, and `components/v2/` (CategoryMark with the mockup's
category glyphs, Money for 9px-blurred hidden amounts, stroke icons).
Hidden amounts are the shared `blurBalance` preference (`useHideAmounts`).

## Project Structure

This is the canonical project structure. Start with task-relevant files
below. Only follow imports or inspect other files when required, when a
documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Root component; mounts the dashboard route tree at `/`
- `src/dashboard/` - The entire application: layout, pages, and dashboard-local hooks (`usePeriod`)
- `src/components/ui/`, `src/components/v2/` - Shared, reusable building blocks used across dashboard pages
- `src/state/` - App-wide React context (auth, theme, toast, mock app data) plus `useCurrency`/`useTranslation`. `useCurrency` is bound to the user's principal currency (`format` for totals, `formatIn(amount, code)` for a wallet's or movement's own currency — `lib/currency.ts` is the mockup's `fmtCur`); `useTranslation` to `user.preferences.language`. Use these instead of importing `lib/currency.ts` or hardcoding copy directly
- `src/lib/i18n/` - The hand-rolled `es`/`en` dictionary (`translations.ts`) with every visible string, keyed by screen (`nm.*`, `mv.*`, `bud.*`, `goal.*`, `loan.*`, `aj.*`, `cat.*`, `cur.*`, `api.*`…; `{0}` templates filled with `fill()`). Components use `useTranslation()`'s `t()`; code outside React (copy helpers, formatters, Kit defaults) uses `tr()`, which reads the module-level `currentLanguage()` that `AuthProvider` sets before its children render (the user's preference, or the last one used — localStorage `s2nova.language` — while signed out; guest mode starts in it). Built-in category names come from the taxonomy's `nameEn` via `lib/backendCategories.ts`'s `displayName()`/`categoryName()`/`categoryLabel()` (a renamed or custom category keeps the user's text). Backend error sentences are mapped to dictionary entries in `apiClient.localizeServerMessage`. Dates (`lib/date.ts`, `lib/nuevoMovimiento.ts` `fmtDate`, `lib/inicio.ts` months) follow the app language; amounts keep the currency's own grouping. Free-form seeded mock content (transaction descriptions/merchants) is intentionally left untranslated — same principle as not translating a user's own data.
- `src/services/` - Thin wrappers around `apiClient.ts` fetch calls to the real backend (see `ARCHITECTURE.md` §9); each file maps the backend's wire shape (UUID `categoryId`, uppercase enums) to Web's existing domain types Categories follow the unified taxonomy (`design_handoff_s2_nova_v2/docs/CATEGORY_SYSTEM.md`): `lib/taxonomy.json` is generated from `design_handoff_s2_nova_v2/s2-categories.js` by the root `scripts/gen-taxonomy.mjs` (never edit it by hand; `lib/taxonomy.ts` types it and exports `PLAN_ICONS`), and `lib/backendCategories.ts` is the one registry every screen resolves names, colors and glyphs through (`useCategories()`), keyed by the taxonomy's dotted id (`exp.food.groceries`, `inc.other` — the backend's `Category.slug`); the backend UUID only appears on the wire. An unknown slug throws, so never send pre-taxonomy ids like `'other'`. `categoryService` backs Ajustes › Categorías; `currencyService` backs Ajustes › Monedas and the wallet modal's currency pills. `src/data/` holds `budgets.ts`'s `monthlyIncomeTarget` and legacy label metadata used only by the pre-v2 `components/ui/CategoryIcon.tsx`/`TransactionRow`; v2 screens draw categories with `components/v2/CategoryMark`. Functional parity (root AGENTS.md) supersedes the old "Web is read-only" rule: every write Android can do must exist on Web, landing screen by screen in whatever shell the mockup uses (side panel, centered modal). So far: `transactionService.addTransaction` ("Nuevo movimiento", goal contributions, new loans), `transactionService.deleteTransaction` (Movimientos' "Eliminar", loans), `transactionService.settleLoan` ("Registrar abono"), `transactionService.updateLoan`, `budgetService.createBudget`/`updateBudget`/`deleteBudget`, `goalService.createGoal`/`updateGoal`/`deleteGoal`, `recurringService.confirmOccurrence`/`skipOccurrence`, and the `blurBalance` preference. `apiClient` throws `ApiError` with the HTTP `status` (e.g. the 409 for a budget category that's taken). Each is a thin call — the backend applies every balance/goal side effect, so Web never re-implements them client-side. `summaryService.ts` and `alertService.ts` read the shared server aggregates and alert rules; never re-derive those figures from the client's partial transaction list.
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import, and the S2 Nova design tokens (light/dark palettes)
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React and Tailwind CSS v4 plugins plus the `@` alias for `src`

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin
configured in `vite.config.ts`. `src/index.css` imports Tailwind with
`@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and
put global CSS or Tailwind v4 theme customization in `src/index.css`. This
scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in
`src/index.css`. Keep CSS `@import` statements first, then add any
`@font-face` rules and font-family defaults there.

The v2 sidebar (`src/dashboard/components/Sidebar.tsx`) follows the app
theme (`--v2-sidebar`: white in light, #0b0b14 in dark), per the v2
mockup; its logo tile is always the dark render, as in the mockup.

The logo ships as two pre-rendered PNG tiles, `assets/logo-mark-dark.png`
and `assets/logo-mark-light.png` (own rounded-card background baked in, not
a transparent glyph — extracting a transparent glyph from the source art
left a visible stray border, which is why it's not done that way).
`LogoMark`/`Logo` (`components/ui/Logo.tsx`) pick between them via
`useTheme()`, unless `tone="inverted"` pins the dark tile. Regenerate both
from `design_handoff_s2_nova_v2/design_handoff_s2_nova_overview/assets/logo-mark-dark.png` / `logo-mark-light.png` if the
mark ever changes, rather than re-deriving one from the other.

`LoginPage.tsx`/`RegisterPage.tsx` (`src/auth/`): a fixed 452px brand
panel (always the dark hero's violet in both themes — the app theme only
affects the form column) plus a 340px form column, built as self-contained
components rather than through a shared shell. Their `--color-login-*`
tokens are aliases of the semantic tokens (DESIGN-SYSTEM.md §10.2); use
the semantic tokens for anything new. `GoogleSignInButton` (`src/auth/`) takes an
optional `label` prop so Register can show "Registrarse con Google" instead
of Login's default text.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- `ProgressBar`'s `className` prop styles the **fill** bar, not the wrapper — use `trackClassName` (or wrap it in a sized container) for layout/spacing classes. Mixing this up produces a bar with no visible fill.
