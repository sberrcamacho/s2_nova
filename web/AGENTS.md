# s2-nova web dashboard

React + Vite + Tailwind CSS web application — the S2 Nova **web dashboard**
(financial analysis: statistics, charts, budgets, goals, insights, reports).
This is one of two S2 Nova applications; see the root `AGENTS.md` for how it
relates to `android/`. This app has no login/mobile screens of its own — it
runs as a single-user demo (`AuthContext` auto-hydrates the mock user).

## Development Server

Run `pnpm dev` from this directory to start the Vite development server on
`$PORT` (default 8443).

- Preview URL: http://localhost:8443 (or the configured `$PORT`)
- Hot reload: Changes to source files are reflected immediately

## Information Architecture

Primary navigation (`Sidebar.tsx`) is deliberately capped at **exactly 7
items**: Overview, Insights, Analytics, Budgets, Goals, Reports, Settings.
This is a product decision, not an oversight — do not add an 8th nav item
for a new metric or surface; find where it belongs inside one of the 7
instead. Two routes exist outside the nav as deep links rather than nav
items: `/transactions` (linked from Overview's recent-transactions list;
its filter/sort/paginate table is unique functionality, not a duplicate of
anything in Analytics) and `/settings` (reached from the header avatar
menu, not the nav's own item list config).

- **Overview** (`OverviewPage.tsx`) — the landing page, kept intentionally
  light: current balance, this month's income/expenses/savings, an income-
  vs-expenses chart, the top 2-3 insights (with a link to Insights for the
  rest), a qualitative financial-health summary, a compact "what changed?"
  period-over-period widget, an upcoming-events list (from active recurring
  series), goals progress, and a short recent-transactions list. It does
  not try to surface every metric the app can compute — that's Analytics'
  job.
- **Insights** (`InsightsPage.tsx`) — the prescriptive-suggestions surface
  (see `insightsService.ts` below), with progressive disclosure: the first
  four insights show by default, the rest are a "show more" click away.
- **Analytics** (`AnalyticsPage.tsx`) — one consolidated surface with four
  tabs (`components/ui/Tabs.tsx`): Spending, Income, Cash Flow, Net Worth.
  This is where the old standalone Expenses/Income/NetWorth/Recurring/
  Wallets/Categories pages went — their content was absorbed into tabs
  rather than deleted outright. Cash Flow is the newest tab: money in/out,
  net cash flow, monthly trends, and an "impact of upcoming movements"
  section built from active `recurringService` series (subscriptions
  included). Net Worth folds in what `WalletsPage` used to show
  standalone (wallet balances) alongside lent/borrowed totals.
- **Budgets** (`BudgetsPage.tsx`) — read-only, current-month progress plus
  historical performance: `analyticsService.getCategoryHistory()` charts
  actual spend per category over the last 6 months against *today's*
  limit, since past months' limits aren't stored in this data model (see
  that method's doc comment) — never fabricate a historical limit.
- **Goals** (`GoalsPage.tsx`) — read-only progress plus a per-goal
  "contributions over time" mini chart, derived only from transactions
  actually linked via `transaction.goalId`. With fewer than two distinct
  contribution months (true for the seed data, which has none), it shows
  an honest "not enough data" note instead of a chart — never a fabricated
  projected completion date.
- **Reports** (`ReportsPage.tsx`) — the periodic-review surface: range
  totals, savings trend, weekly spending pattern, income-vs-expenses,
  top categories, budget performance, and goals progress. Resist adding
  new report "types" here; extend the existing sections instead.
- **Settings** (`SettingsPage.tsx`) — account/preferences/security, reached
  via the header avatar menu as well as the nav.

Forecasting and subscription analysis are **not** separate nav
destinations — they live wherever there's enough real data to support them
honestly (e.g. Analytics' burn-rate/forecast KPIs, the Cash Flow tab's
upcoming-impact section, Insights' subscription-audit insight) rather than
as dedicated pages.

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
- `src/services/`, `src/data/` - Mock "backend" layer: in-memory CRUD + seed data. Still mock-only — a real `backend/` now exists (see root `ARCHITECTURE.md`) and Android talks to it, but Web has no login screen of its own yet, so it can't authenticate against it; wiring Web to the real API is gated on adding real Web auth first (`ARCHITECTURE.md` §9, not yet done). `accountService.ts` (Wallets), `goalService.ts` (Goals), `budgetService.ts` (Budgets), and `recurringService.ts` (Recurring) are **read-only** — no `createWallet`/`createGoal`/`setBudgetLimit`/`createRecurringSeries`-style exports exist, and none should be added. Creating/editing Wallets, Budgets, Goals, and Recurring series is Android's job (micro-management); Web (macro-analysis) only ever reads them — this is an explicit product decision, not a gap to fill in. `transactionService.addTransaction` still applies the same wallet-balance and goal-contribution side effects the backend does (see `backend/src/routes/transactions.ts`), even though no page currently calls it — Web intentionally has no data-entry UI (that's Android's job too), but the capability stays behaviorally correct rather than a stub. There is deliberately **no** `deleteTransaction` (or any transaction-editing) export — `TransactionsPage` is list/filter/sort only, no delete action; removing a transaction is Android's job, same as creating one. `insightsService.ts` is the one Web-exclusive piece of business logic: prescriptive, data-driven suggestion sentences (not more charts — `AnalyticsPage` already covers those) computed from real transactions/budgets/goals/recurring series, never fabricated; `getFinancialHealth()` is the other half of it — a *qualitative* per-category status (savings/budget/cash flow/goals/debt, each a short status word plus a one-line data-driven detail) for Overview's health summary, deliberately not a single arbitrary 0-100 score. `analyticsService.getPeriodComparison()` powers Overview's "what changed?" widget (current vs. previous month, `pctChange` is `null` — never a fabricated percentage — when there's no prior-period baseline) and `getCategoryHistory()` powers Budgets' historical-performance charts. The upcoming-obligations list (Overview's "Upcoming events") reads directly from `recurringService.getRecurringSeries()`, sorted/filtered by active + next occurrence date — deliberately a list, not a calendar-grid widget (no new charting/calendar dependency, and a list is the more useful shape for a handful of recurring items).
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

The dashboard sidebar (`src/dashboard/components/Sidebar.tsx`) is
**permanently dark navy**, independent of the light/dark app theme — this
matches the Figma reference and is intentional, not a bug. Use
`<Logo tone="inverted" />` on dark, non-theme-reactive surfaces like it.

The logo ships as two pre-rendered PNG tiles, `assets/logo-mark-dark.png`
and `assets/logo-mark-light.png` (own rounded-card background baked in, not
a transparent glyph — extracting a transparent glyph from the source art
left a visible stray border, which is why it's not done that way).
`LogoMark`/`Logo` (`components/ui/Logo.tsx`) pick between them via
`useTheme()`, unless `tone="inverted"` pins the dark tile. Regenerate both
from `design-reference/suggestions/logo-dark.png` /`logo-light.png` if the
mark ever changes, rather than re-deriving one from the other.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- `ProgressBar`'s `className` prop styles the **fill** bar, not the wrapper — use `trackClassName` (or wrap it in a sized container) for layout/spacing classes. Mixing this up produces a bar with no visible fill.
