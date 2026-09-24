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

**Visual source of truth**: `s2_nova_stage2_handoff/S2 Nova Dashboard v2.dc.html`
(with `STAGE-*.md` specs alongside it). Screens are being reconciled
against it stage by stage; a screen not yet migrated is unverified.

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

Web v2 (s2_nova_stage2_handoff, STAGE-2-INICIO): the sidebar
(`Sidebar.tsx`, `NAV_ITEMS`) has the same four primary destinations as
Android's bottom bar, in the same order — **Inicio · Movimientos · Planes ·
Reportes** — plus **Ajustes** in the footer. Pre-v2 paths (`/overview`,
`/transactions`, `/budgets`, `/goals`, `/analytics`, `/insights`,
`/reports`, `/settings`) redirect in `routes.tsx`.

- **Inicio** (`InicioPage.tsx`) — v2-migrated. Balance hero (sum of
  wallets, month income/expenses from `summaryService`, 6-month net bars),
  Billeteras (row → `/movimientos?wallet=`), Alertas (shared backend rules
  via `alertService`; dismissals are per user in localStorage, pruned to
  live ids), Presupuestos (all, by risk), Metas, Préstamos, Gasto por
  categoría, Próximos 14 días with running balance (row → `EventDialog`:
  confirm or skip a Programado through the backend). Pure presentation
  helpers live in `lib/inicio.ts` and `lib/alertCopy.ts`.
- **Movimientos** (`TransactionsPage.tsx`) — pre-v2 table; honours `?q=`
  (header search) and `?wallet=`. Migrated in the Movimientos stage.
- **Planes** (`PlanesPage.tsx`) — tab host, `?tab=presupuestos|metas|prestamos`
  (+ `&side=lent|borrowed`). Préstamos (`components/LoansTab.tsx`) is v2,
  with "Registrar abono" (`transactionService.settleLoan`); Presupuestos
  and Metas still render the pre-v2 BudgetsPage/GoalsPage.
- **Reportes** — the pre-v2 AnalyticsPage for now; the header range
  dropdown shows only here until Reportes gets its in-page range.
  InsightsPage/ReportsPage are unrouted and fold into Reportes later.
- **Ajustes** — SettingsPage.

The header's "Nuevo movimiento" button (and the `N` shortcut) opens
`components/panels/NewTransactionPanel.tsx` inside `SidePanel.tsx`, the
420px shell every Web write form reuses (STAGE-2-INICIO §5).

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
- `src/dashboard/` - The entire application: layout, pages, and dashboard-local state (`DashboardFiltersContext`)
- `src/components/ui/`, `src/components/charts/` - Shared, reusable building blocks used across dashboard pages
- `src/state/` - App-wide React context (auth, theme, toast, mock app data) plus `useCurrency`/`useTranslation`, hooks bound to `user.currency`/`user.preferences.language` — use these instead of importing `lib/currency.ts` or hardcoding copy directly, so amounts/text stay in sync with the Settings page's currency-format and language toggles
- `src/lib/i18n/` - Small hand-rolled translation dictionary (`es`/`en`) consumed via `useTranslation()`'s `t()`. Coverage is the full app: chrome (sidebar, header, breadcrumb, date-range filter), every dashboard page's own copy (KPI labels, chart titles/subtitles, table headers, empty states, filters, dialogs, toasts), and every category/payment-method/budget-status label shown anywhere — `useTranslation()` also exposes `tCategory(id)`/`tPaymentMethod(id)` for those (mirrors `data/categories.ts`'s `CategoryId`/`PaymentMethod` values, which are the exact dictionary-key suffixes: `category.<id>`, `paymentMethod.<id>`). Never read `.label` off `data/categories.ts` directly in a component; always go through `tCategory`/`tPaymentMethod` so it reacts to the language toggle. Free-form seeded mock content (transaction descriptions/merchants, notification title/message text) is intentionally left untranslated — same principle as not translating a user's own data. Date/month/weekday formatting (`lib/date.ts`) takes the app's `language` (from `useTranslation()`), not the device locale, so chart x-axis labels and formatted dates react to the language toggle too; `analyticsService` methods that produce user-facing labels (`getMonthlyHistory`, `getSavingsTrend`, `getWeeklySpending`) accept an optional `language` param for the same reason — always pass it from `useTranslation()` rather than relying on the `'es'` default. `DashboardFiltersContext`'s `DATE_RANGE_OPTIONS`/`rangeLabelKey` hold `TranslationKey`s, not text, so the date-range filter stays reactive too — resolve them with `t()` in the consuming component, never render the key directly.
- `src/services/` - Thin wrappers around `apiClient.ts` fetch calls to the real backend (see `ARCHITECTURE.md` §9); each file maps the backend's wire shape (UUID `categoryId`, uppercase enums) to Web's existing domain types (`@/lib/backendCategories.ts` handles the category slug↔UUID translation). `src/data/` now only holds `budgets.ts`'s `monthlyIncomeTarget` (a Web-only planning number with no backend field) and category/payment-method label metadata — the old in-memory mock stores are gone. Every category's `icon` string in `data/categories.ts` must have a matching Lucide entry in `components/ui/CategoryIcon.tsx`'s `ICONS` map — a missing one silently falls back to `CircleEllipsis` instead of erroring, so after adding a category, check the rendered icon, not just the type-checker. Functional parity (root AGENTS.md) supersedes the old "Web is read-only" rule: every write Android can do must exist on Web, landing stage by stage as side panels. So far: `transactionService.addTransaction` ("Nuevo movimiento"), `transactionService.settleLoan` ("Registrar abono"), `recurringService.confirmOccurrence`/`skipOccurrence`, and the `blurBalance` preference. Each is a thin call — the backend applies every balance/goal side effect, so Web never re-implements them client-side. `summaryService.ts` and `alertService.ts` read the shared server aggregates and alert rules; never re-derive those figures from the client's partial transaction list. `insightsService.ts` is the one Web-exclusive piece of business logic: prescriptive, data-driven suggestion sentences (not more charts — `AnalyticsPage` already covers those) computed from real transactions/budgets/goals/recurring series, never fabricated; `getFinancialHealth()` is the other half of it — a *qualitative* per-category status (savings/budget/cash flow/goals/debt, each a short status word plus a one-line data-driven detail) for Overview's health summary, deliberately not a single arbitrary 0-100 score. `analyticsService.getPeriodComparison()` powers Overview's "what changed?" widget (current vs. previous month, `pctChange` is `null` — never a fabricated percentage — when there's no prior-period baseline) and `getCategoryHistory()` powers Budgets' historical-performance charts. The upcoming-obligations list (Overview's "Upcoming events") reads directly from `recurringService.getRecurringSeries()`, sorted/filtered by active + next occurrence date — deliberately a list, not a calendar-grid widget (no new charting/calendar dependency, and a list is the more useful shape for a handful of recurring items).
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
from `s2_nova_stage2_handoff/design_handoff_s2_nova_overview/assets/logo-mark-dark.png` / `logo-mark-light.png` if the
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
