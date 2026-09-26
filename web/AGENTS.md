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
sessions, deletion). Still missing: the category-first Nuevo movimiento
(NEW_MOVEMENT.md), the Billeteras page, Ajustes › Monedas and
Ajustes › Categorías (`currencyService`/`categoryService` exist, no UI
yet), guest mode and the first-run card (ONBOARDING.md), mini-guides.
Several non-Planes specs (`NewTransactionPanel`, `AjustesPage`,
`InicioPage`, `ReportesPage`, `userService`, `unit/currency`,
`unit/backendCategories`) still use pre-taxonomy fixtures and fail.

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
  Billeteras (row → `/movimientos?q=<wallet name>`), Alertas (shared backend rules
  via `alertService`; dismissals are per user in localStorage, pruned to
  live ids), Presupuestos (all, by risk), Metas, Préstamos, Gasto por
  categoría, Próximos 14 días with running balance (row → `EventDialog`:
  confirm or skip a Programado through the backend). Pure presentation
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
  balance. Transactions aren't editable on either client yet.
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
  client-side, with Inicio's `upcomingWithin` rule. The pre-v2 Analytics,
  Insights and Reports pages folded into it and are gone.
- **Ajustes** — `AjustesPage` (profile card, Preferencias, Seguridad) plus
  one route per sub-view under `pages/ajustes/`: `/ajustes/perfil`,
  `/ajustes/contrasena`, `/ajustes/sesiones`, `/ajustes/eliminar`. Shared
  pieces live in `components/ajustes/AjustesUi.tsx`. Sessions, the
  delete-account counts, the CSV export and the deletion itself are backend
  endpoints (`/me/sessions`, `/me/footprint`, `/me/export`, `DELETE /me`);
  the password rules shown live are re-checked by `POST /me/password`.
  The sidebar's avatar and name open `/ajustes/perfil`, as in the mockup.

Toasts (`components/ui/Toast.tsx`) follow the mockup: one inverted pill
at the bottom centre, 2.6 s, the same for confirmations and errors.

The header's "Nuevo movimiento" button (and the `N` shortcut) opens
`components/panels/NewTransactionPanel.tsx` inside `SidePanel.tsx`, the
420px shell (not yet the v2 category-first flow). Planes' forms are
centered modals instead, as in the mockup.

v2 screens use the mockup's own palette as `--v2-*` tokens
(`bg-v2-surface`, `text-v2-dim`, …) in `index.css`, `line-height: normal`
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
- `src/lib/i18n/` - Small hand-rolled translation dictionary (`es`/`en`) consumed via `useTranslation()`'s `t()`. Coverage is the full app: chrome (sidebar, header, breadcrumb, date-range filter), every dashboard page's own copy (KPI labels, chart titles/subtitles, table headers, empty states, filters, dialogs, toasts), and every payment-method/budget-status label shown anywhere. `useTranslation()` also exposes `tPaymentMethod(id)` (dictionary keys `paymentMethod.<id>`) and `tCategory(id)`, which returns the category's name from the registry (`lib/backendCategories.ts`, see below) — category names are the user's own (renamable) data, not dictionary entries. Never read `.label` off `data/categories.ts` in a component. Free-form seeded mock content (transaction descriptions/merchants, notification title/message text) is intentionally left untranslated — same principle as not translating a user's own data. Date/month/weekday formatting (`lib/date.ts`) takes the app's `language` (from `useTranslation()`), not the device locale, so chart x-axis labels and formatted dates react to the language toggle too.
- `src/services/` - Thin wrappers around `apiClient.ts` fetch calls to the real backend (see `ARCHITECTURE.md` §9); each file maps the backend's wire shape (UUID `categoryId`, uppercase enums) to Web's existing domain types Categories follow the unified taxonomy (`design_handoff_s2_nova_v2/docs/CATEGORY_SYSTEM.md`): `lib/taxonomy.json` is generated from `design_handoff_s2_nova_v2/s2-categories.js` by the root `scripts/gen-taxonomy.mjs` (never edit it by hand; `lib/taxonomy.ts` types it and exports `PLAN_ICONS`), and `lib/backendCategories.ts` is the one registry every screen resolves names, colors and glyphs through (`useCategories()`), keyed by the taxonomy's dotted id (`exp.food.groceries`, `inc.other` — the backend's `Category.slug`); the backend UUID only appears on the wire. An unknown slug throws, so never send pre-taxonomy ids like `'other'`. `categoryService` (Ajustes › Categorías writes) and `currencyService` (Ajustes › Monedas, rates) back the screens still to come. `src/data/` holds `budgets.ts`'s `monthlyIncomeTarget` and legacy label metadata used only by the pre-v2 `components/ui/CategoryIcon.tsx`/`TransactionRow`; v2 screens draw categories with `components/v2/CategoryMark`. Functional parity (root AGENTS.md) supersedes the old "Web is read-only" rule: every write Android can do must exist on Web, landing screen by screen in whatever shell the mockup uses (side panel, centered modal). So far: `transactionService.addTransaction` ("Nuevo movimiento", goal contributions, new loans), `transactionService.deleteTransaction` (Movimientos' "Eliminar", loans), `transactionService.settleLoan` ("Registrar abono"), `transactionService.updateLoan`, `budgetService.createBudget`/`updateBudget`/`deleteBudget`, `goalService.createGoal`/`updateGoal`/`deleteGoal`, `recurringService.confirmOccurrence`/`skipOccurrence`, and the `blurBalance` preference. `apiClient` throws `ApiError` with the HTTP `status` (e.g. the 409 for a budget category that's taken). Each is a thin call — the backend applies every balance/goal side effect, so Web never re-implements them client-side. `summaryService.ts` and `alertService.ts` read the shared server aggregates and alert rules; never re-derive those figures from the client's partial transaction list.
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

`LoginPage.tsx`/`RegisterPage.tsx` (`src/auth/`) follow the design handoff
in `s2-nova-mockup/auth_handoff/`: a fixed 452px dark brand panel (always
dark in both themes — the app theme only affects the form column) plus a
340px form column, built as self-contained components rather than through
a shared shell. Pixel-exact values that don't map onto an existing token
live under a dedicated `--color-login-*` prefix in `src/index.css`
(surface/border-focus/text-muted/label/primary/divider/checkbox-text, plus
`positive`/`positive-bg` for Register's password-strength meter) — extend
that prefix rather than approximating with a nearby general-purpose token
when adding to either screen. `GoogleSignInButton` (`src/auth/`) takes an
optional `label` prop so Register can show "Registrarse con Google" instead
of Login's default text.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- `ProgressBar`'s `className` prop styles the **fill** bar, not the wrapper — use `trackClassName` (or wrap it in a sized container) for layout/spacing classes. Mixing this up produces a bar with no visible fill.
