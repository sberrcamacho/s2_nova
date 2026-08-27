# Handoff: S2 Nova — Overview redesign + full web dashboard

## Overview

A redesign of the S2 Nova web dashboard (`web/` in `sberrcamacho/s2_nova`), starting from the
Overview page and extended across all seven nav destinations. The core move is
**balance-first**: one large gradient hero owns the current balance and its six-month trend,
the three secondary metrics collapse into a compact stacked column, and the five financial-health
checks become a readable one-per-row list instead of five side-by-side cards.

Target: replace / restyle `web/src/dashboard/pages/*.tsx` and `web/src/dashboard/components/Sidebar.tsx`.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show the
intended look and behavior. They are not production code to copy.

The task is to **recreate these designs inside the existing `web/` app**: React 19 + Vite +
Tailwind CSS v4, with the design tokens already defined in `web/src/index.css` and the component
library already in `web/src/components/ui/`. Every color, radius, and font in this handoff maps to
an existing token — use the token (`bg-surface`, `text-ink-tertiary`, `--radius-lg`, …), not the
raw hex. Reuse `Card`, `Badge`, `ProgressBar`, `KPICard`, `Tabs`, `CategoryIcon`, `TransactionRow`
rather than writing new primitives.

Note: the HTML prototypes hardcode their numbers. In the real app every figure comes from the
existing services (`analyticsService`, `insightsService`, `budgetService`, `goalService`,
`recurringService`, `accountService`) and every label goes through `useTranslation()` /
`useCurrency()`. No hardcoded strings, no hardcoded currency formatting.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and interaction states. Recreate pixel-for-pixel
using the codebase's tokens and components. Only the copy inside cards is placeholder-real: it was
written to match what the services actually compute, but it is not literal service output.

## Files

- `S2 Nova Dashboard.dc.html` — the main prototype: all 7 screens, clickable nav, working Analytics
  tabs and range switcher, working Settings toggles. **This is the design of record.**
- `S2 Nova Overview (options).dc.html` — the three explored Overview directions (`1a` balance-first,
  `1b` dense analytical, `1c` editorial) plus a mobile screen (`1d`). `1a` was chosen and became the
  main prototype. Keep for context on what was rejected and why.
- `support.js` — runtime for the two `.dc.html` files. Needed only to open them locally; not part of the design.
- `assets/logo-mark-dark.png` — the real logo tile, taken from `web/src/assets/logo-mark-dark.png`.

Open either HTML file directly in a browser.

## Design Tokens

All values below already exist in `web/src/index.css` under `[data-theme='dark']`. The prototype is
dark-only; the light palette in `:root` still applies and the redesign must survive the theme toggle,
so use token classes throughout.

### Colors

| Role | Hex | Token |
| --- | --- | --- |
| Page background | `#050507` | `--color-bg` / `bg-bg` |
| Secondary background | `#09090e` | `--color-bg-secondary` |
| Card surface | `#0e0e15` | `--color-surface` / `bg-surface` |
| Elevated surface (nested cards) | `#13131d` | `--color-surface-elevated` |
| Sidebar background | `#0b0b14` | literal — sidebar is permanently dark, see AGENTS.md |
| Border | `#1c1c28` | `--color-border` |
| Border strong | `#262635` | `--color-border-strong` |
| Hairline inside cards | `#16161f` | `divide-border` at lower opacity; literal in the prototype |
| Primary | `#6c5ce7` | `--color-primary` |
| Primary secondary | `#8578ff` | `--color-primary-secondary` |
| Highlight (links, "view all") | `#a69dff` | `--color-highlight` |
| Text | `#ffffff` | `--color-text` / `text-ink` |
| Text secondary | `#a8a8b8` | `text-ink-secondary` |
| Text tertiary | `#6f6f82` | `text-ink-tertiary` |
| Positive | `#32c98a` on `rgba(50,201,138,.14)` | `--color-positive` / `-soft` |
| Negative | `#ff6262` on `rgba(255,98,98,.14)` | `--color-negative` / `-soft` |
| Warning | `#f0b429` on `rgba(240,180,41,.14)` | `--color-warning` / `-soft` |
| Hero gradient | `linear-gradient(150deg, #050507 0%, #141034 55%, #211a4d 100%)` | derived from `--hero-from` / `--hero-to` |
| Hero glow | `rgba(108,92,231,.35)`, 220px circle, `blur(52px)`, top `-70px` right `-40px` | `--hero-glow` |

Category colors come straight from `web/src/data/categories.ts` — do not re-pick them:
food `#E8A23D`, transportation `#3D8BE8`, shopping `#3DBBA8`, health `#E85D6B`,
education `#5D6BE8`, entertainment `#B25DE8`, bills `#8A8A99`, subscriptions `#D95DB2`,
salary `#22A06B`, freelance `#6657E8`, other `#9C9CAA`.
Category chip backgrounds are the category color at ~16% alpha (`color + '29'` in the prototype).

### Typography

- UI font: **Plus Jakarta Sans** (`--font-sans`).
- All amounts and numeric values: **Inter** with `font-variant-numeric: tabular-nums`
  (`--font-numeric`, i.e. the existing `.font-numeric` class). Every number in this design is tabular.

| Use | Size / weight / tracking |
| --- | --- |
| Hero balance | 48px / 800 / `-.03em` |
| Page title (Insights, Analytics, …) | 24px / 800 / `-.025em` |
| Section headline in a KPI stack | 24px / 800 / `-.02em` |
| Large stat (wallet total, report figure) | 20–22px / 800 / `-.025em` |
| Card title | 14px / 800 / `-.01em` |
| Card subtitle | 11.5px / 400–500 / `text-ink-tertiary` |
| Row title | 12.5–13px / 700 |
| Row detail | 11–11.5px / 400 / `text-ink-tertiary` |
| Eyebrow / column header | 10–10.5px / 700 / `letter-spacing: .08–.12em` / uppercase |
| Badge, pill, delta | 11–11.5px / 800 |
| Nav item | 13px / 600 (700 when active) |

### Radii, spacing, shadows

- Radii: hero `20px`; cards `16px`; nested cards and inputs `12–14px`; nav item `11px`;
  pills `999px`; category chips `10–11px`. These map to `--radius-md` (14) / `--radius-lg` (18) —
  the prototype's 16px sits between them; prefer `--radius-lg` in code.
- Content padding: page `26px 28px 40px`; card `20px`; compact card `16px 18px`; nav item `9px 12px`.
- Grid gaps: 18px between major blocks, 12–14px inside a group.
- Progress bars: 6px tall, `#1c1c28` track, 3px radius. Goal rings: 72px `conic-gradient`
  with a 56px surface-colored inner circle.
- Active nav shadow: `0 8px 24px rgba(108,92,231,.35)` (`--shadow-primary`).
- Bar-chart transition: `height .3s ease`.

## Chrome (present on every screen)

### Sidebar — 212px, `#0b0b14`, `border-right: 1px solid #1c1c28`, sticky full height

Matches the existing `Sidebar.tsx` and stays permanently dark regardless of theme.

- Logo block: `18px 18px 22px` padding, 30px logo tile (`border-radius: 9px`, `object-fit: cover`)
  + "S2 Nova" 14px/800 and "PERSONAL FINANCE" 9.5px/600 `letter-spacing: .1em` at `rgba(255,255,255,.4)`.
  Use the existing `<Logo tone="inverted" />`.
- Six nav items in order: Overview, Insights, Analytics, Budgets, Goals, Reports. Settings sits
  alone at the bottom (`margin-top: auto`). Exactly the 7-item IA — do not add an eighth.
- Icons: lucide at 18px, `strokeWidth 2.1` — `LayoutGrid`, `Lightbulb`, `BarChart3`, `PiggyBank`,
  `Flag`, `FileText`, `Settings`. Gap 11px between icon and label.
- Inactive: `rgba(255,255,255,.55)`, transparent background. Hover: `bg-white/8`, text white.
  Active: `#6c5ce7` fill, white text, `--shadow-primary`, weight 700.
- User chip: `rgba(255,255,255,.05)` at 12px radius, 30px `#6c5ce7` avatar circle with 11px/800
  initials, name 12.5px/700, "Demo account" 10.5px/500 at `rgba(255,255,255,.45)`.

### Header — sticky, `padding: 14px 28px`, `border-bottom: 1px solid #1c1c28`, page background

Breadcrumb "S2 Nova / {active screen}" at 12px (`/` at 50% opacity, current page `#a8a8b8`);
right side: a 280px search field and a "This month" range chip, both `#0e0e15` /
`1px solid #1c1c28` / 10px radius / `8px 12px` / 12px.

## Screens

### 1. Overview

**Purpose.** The landing page. Answer "where do I stand this month" in one screen without
becoming Analytics.

**Layout** — single column, `gap: 18px`:

1. **Hero row** — `grid-template-columns: 1.35fr 1fr`, gap 18px, stretch.
   - **Hero card** (left): gradient + blurred glow, `border: 1px solid #262635`, radius 20px,
     padding `26px 28px`. Contents: eyebrow "CURRENT BALANCE" (`#a69dff`); balance
     `$16.147.300` at 48px/800; a positive pill `+ $2.361.400` next to "net this month" 12px
     `#a8a8b8`; then an 8-bar 66px-tall sparkline (gap 5px, 3px radius) rising in three opacity
     steps — `rgba(165,157,255,.22)` → `.3` → `.38` — with the final bar solid `#8578ff`; month
     labels Mar–Aug at 10px `#6f6f82` justified space-between.
   - **Metric column** (right): three equal rows, gap 12px. Each is a surface card
     (`#0e0e15`, 1px border, 16px radius, `16px 18px`) with eyebrow + 24px/800 value on the left
     and a delta pill on the right. Income `$4.288.500` / `−3%` negative-toned; Expenses
     `$1.927.100` / `−5%` positive-toned (spending less is good — reuse the existing `changeTone`
     logic from `OverviewPage.tsx`); Savings `$2.361.400` / `+0%` neutral.

2. **Health + suggestions row** — `grid-template-columns: 1fr 1.35fr`, gap 18px.
   - **Financial health** card: title + "Five checks, updated daily". Five rows, each
     `padding: 11px 0` with a `1px solid #16161f` bottom hairline (last row none):
     7px status dot · label 12.5px/700 · detail 11px `#6f6f82` · status word 11px/800 in the
     status color, right-aligned. Rows and copy come from `getFinancialHealth()`:
     Savings/Good/`#32c98a`, Budget/Over/`#ff6262`, Cash flow/Watch/`#f0b429`,
     Goals/On track/`#32c98a`, Debt/N/A/`#6f6f82` (dot `#3a3a4a`).
     This replaces the current five-across grid — one row per check reads far better at this width.
   - **Suggestions for you** card: title + "Ranked by impact this month", with a
     "View all insights →" link (11.5px/800 `#a69dff`) that navigates to `/insights`.
     Three insight tiles: `#13131d` on 1px border, 12px radius, `13px 15px`, each with a 3px
     full-height accent bar on the left (`#ff6262`, `#f0b429`, `#6c5ce7`), title 12.5px/700 and
     body 11.5px `#6f6f82`. Top 3 from `getInsights()`.

3. **Upcoming events** card, full width: title + "Next 14 days, from active recurring series",
   "Manage in app →" on the right. Four tiles in a `repeat(4,1fr)` grid, `#13131d`, 12px radius,
   14px padding: date eyebrow 10px/700 `.08em`, name 12.5px/700, amount 14px/800 signed and
   colored. The next salary tile is emphasized with `border: 1px solid #6c5ce7` and an
   `#a69dff` date. Source: `recurringService.getRecurringSeries()`, active only, sorted by
   `nextOccurrenceDate`.

4. **Recent transactions** card: title + "View all →" (→ `/transactions`). Rows
   `padding: 11px 0` with `#16161f` hairlines: 34px category chip (category color at 16%),
   description 12.5px/700, `merchant · date · payment method` 11px `#6f6f82`, amount 13px/800
   signed and colored. Four to five rows.

### 2. Insights

Title 24px/800 + "Computed from your last 30 days. Nothing here is a projection."
A `repeat(2,1fr)` grid, gap 14px, of insight cards: `#0e0e15`, 1px border, radius 16px,
padding `18px 20px`, **and a 3px left border in the insight's tone color**. Inside: a tone-colored
uppercase tag pill (10px/800, `.09em`, tone at 12% background) on the left with a relative
timestamp 11px `#6f6f82` on the right; title 14.5px/800; body 12.5px `#a8a8b8` at 1.55 line-height.

Tones by insight kind: budget `#ff6262`, category `#f0b429`, subscriptions `#6c5ce7`,
savings `#32c98a`, pattern `#3DBBA8`, cash flow `#8578ff`. Six cards shown; the real page keeps
its progressive disclosure (four, then "show more").

### 3. Analytics

Header row: title + "August 2026 · COP" on the left, a **range switcher** on the right —
three pills `3M` / `6M` / `12M`, `7px 13px`, 9px radius, 11.5px/800; inactive `#0e0e15` on
`#1c1c28` border with `#6f6f82` text, active `#6c5ce7` fill and border, white text. Default `6M`.

Below it the existing four-tab bar (`components/ui/Tabs.tsx`): `10px 14px` per tab, 12.5px,
active weight 800 white with a 2px `#8578ff` underline sitting on the `#1c1c28` divider
(`margin-bottom: -1px`), inactive `#6f6f82`. **All four tabs must render distinct panels** —
tab styling alone is not enough.

- **Spending** (default) — `grid-template-columns: 1.45fr 1fr`, gap 18px:
  - *Income vs expenses* card: title + range subtitle ("Last 3/6/12 months"), a legend of two
    8px squares (`#32c98a` Income, `#ff6262` Expenses). 236px plot area, `border-bottom: 1px solid #1c1c28`.
    Per month a pair of bars: 46% width capped at 26px, 4px gap, `4px 4px 0 0` radius, height
    proportional to a fixed 6M-COP ceiling, `transition: height .3s ease`. Month labels below at
    10.5px/600. Changing the range re-renders the bars.
  - *Where the money went* card: five category rows — label 12.5px/700 left, amount right
    (`#a8a8b8`, or `#ff6262` when the category is flagged, with its `+82%` suffix inline at 10.5px),
    then a 6px progress bar filled in the category color.
  - Then a `repeat(4,1fr)` KPI strip: AVG DAILY SPEND `$91.767`, BUSIEST WEEKDAY `Saturday`,
    FIXED VS VARIABLE `38 / 62`, MONTHS OF RUNWAY `8.4` — eyebrow 10px/700 `.1em` + value 22px/800.
- **Income** — two columns:
  *Income sources* (three 8px progress bars: Salario `$4.400.000` 79% `#32c98a`,
  Freelance `$880.000` 16% `#6657E8`, Otros `$280.000` 5% `#9C9CAA`, plus a note about
  freelance volatility above a `#16161f` divider) and *Income by month* (single-series bars,
  current month solid `#32c98a`, prior months `rgba(50,201,138,.28)`).
- **Cash Flow** — a three-card strip (MONEY IN positive-colored, MONEY OUT negative-colored,
  NET CASH FLOW on the primary-tinted card with `border: 1px solid #35305c`), then
  *Impact of upcoming movements*: one row per active recurring series with a 64px date eyebrow,
  name, signed amount (110px right-aligned) and a **running projected balance** in `#a8a8b8`
  (120px right-aligned); below it a line calling out the lowest projected balance before payday
  in `#f0b429`.
- **Net Worth** — two columns: *Wallets* (one row per wallet: 30px chip in the wallet color at 16%,
  name 13px/700, kind 11px `#6f6f82`, balance 14px/800; then a `#1c1c28` divider and a
  "Net worth" total at 22px/800) and *Lent and borrowed* (two `#13131d` tiles — LENT OUT
  `$620.000` positive, BORROWED `—` neutral with "No outstanding debt" — plus a six-month
  trend of six bars, current month solid `#8578ff`).
  **Consistency rule:** wallet rows are assets only and must sum exactly to the balance shown in
  Overview's hero. A used credit line is a liability — either exclude it or show it negative and
  subtract it, and then the BORROWED tile and Overview's Debt health row must agree.

### 4. Budgets

Title + "Read-only here — limits are set in the mobile app. 9 days left in August." — Web never
writes budgets. A `repeat(3,1fr)` grid, gap 14px, of budget cards (`18px 20px`, 16px radius):
name 13.5px/800 with a percentage pill on the right; spent 20px/800; "of {limit}" 11.5px `#6f6f82`;
a 6px progress bar; a note 11.5px `#a8a8b8`.
Tone by usage: `>= 90%` → `#ff6262` (and card border shifts to `#3a2029`), `>= 65%` → `#f0b429`,
else `#32c98a`. Pill background is the tone at 14% alpha. Percentages clamp at 100 for the bar
width but the label keeps the true value.

### 5. Goals

Title + "Progress only. Goals are created and edited in the mobile app." A `repeat(2,1fr)` grid of
cards, each a horizontal row (gap 18px): a **72px conic-gradient ring** —
`conic-gradient({goalColor} {pct}%, #1c1c28 0)` with a 56px `#0e0e15` inner circle holding the
percentage at 14px/800 — then name 14px/800, `{current}` 18px/800 with "of {target}" 12px/600
`#6f6f82` inline, and a note 11.5px `#6f6f82`.
Where there are fewer than two contribution months, the note says so ("Not enough contribution
history for a projection") — never a fabricated completion date.

### 6. Reports

Header: title + "August 2026 review · compared with July", and an "Export PDF" chip on the right.

- *Period totals* card: a `1.4fr 1fr 1fr .7fr` table — column headers METRIC / AUGUST / JULY /
  CHANGE at 10px/700 `.08em` over a `#1c1c28` rule, then five rows (Income, Expenses, Savings,
  Savings rate, Transactions) at 13px with `#16161f` hairlines. Current value 800 weight, previous
  `#6f6f82`, change as a right-aligned tone pill. Tone follows meaning, not sign: expenses down is
  positive.
- Two cards side by side: *Weekly spending pattern* (seven 150px-tall bars, share of spend by
  weekday, peak day solid `#8578ff` and the rest `rgba(165,157,255,.28)`) and
  *Budget performance* (the six budgets as `spent / limit` rows with tone-colored 6px bars).

### 7. Settings

Max content width 920px.

- *Profile* card: 56px `#6c5ce7` avatar with 18px/800 initials, name 16px/800,
  `email · city` 12.5px `#6f6f82`, "Member since November 2024" 11.5px, and an "Edit profile"
  outline chip (`1px solid #262635`, 10px radius, `8px 14px`, 12px/700 `#a8a8b8`).
- *Preferences* card, one row per setting (`padding: 15px 0`, `#16161f` hairlines), label 13px/700
  over detail 11.5px `#6f6f82`, control right-aligned:
  - Language — segmented `Español` / `English` (same pill treatment as the range switcher).
  - Currency format — a static chip "COP · $16.147.300" showing the live format.
  - Theme — segmented `Light` / `Dark` / `System`.
  - Three switches: Notifications (on), Biometric login (off, "Android only — ignored on web"),
    Hide amounts by default (off).
  Switch: 42px × 24px track, 999px radius, 3px padding, 18px white knob, `#6c5ce7` when on and
  `#262635` when off, `transition: background .2s ease` with the knob moved by
  `justify-content: flex-end`. The existing `Switch.tsx` covers this.
- *Security* card: Password (Change), Active sessions (Manage), and a destructive
  "Delete account" row — label `#ff6262`, button border `rgba(255,98,98,.35)`.

## Interactions & Behavior

- **Nav.** Clicking a sidebar item switches the screen and updates the breadcrumb. In the app these
  are `NavLink`s against the existing routes; the prototype fakes it with local state.
- **"View all insights →"** on Overview navigates to Insights. "View all →" on transactions goes to
  `/transactions`.
- **Analytics range switcher** (`3M` / `6M` / `12M`) re-renders both the bars and the card subtitle,
  animating bar heights over 300ms. It drives the Income tab's chart too.
- **Analytics tabs** swap the whole panel below them. Selection is independent of the range.
- **Settings** language, theme, and the three switches are all live and independent.
- **Hover** (to add in implementation, per `Card`'s `interactive` prop): border → `#262635`,
  shadow → `--shadow-sm`, `active:scale-[0.995]`. Rows in lists get a subtle `#13131d` background.
- **Focus** uses the global `:focus-visible` ring (2px `--color-primary`, 2px offset).
- No loading or error states were designed. Use the existing `Skeleton.tsx` for loading and
  `EmptyState.tsx` for empty lists — Overview already does this for transactions.
- **Responsive** was not designed beyond the desktop layout. Follow the current page conventions:
  `grid-cols-1` on small, `sm:grid-cols-2`, then the ratios above at `xl`. The sidebar keeps its
  existing off-canvas drawer behavior below `lg`.

## State Management

The prototype holds everything locally:

| State | Values | Drives |
| --- | --- | --- |
| `active` | one of the 7 nav labels | which screen renders + breadcrumb |
| `range` | `3M` \| `6M` \| `12M` | Analytics bar data + chart subtitle |
| `tab` | `Spending` \| `Income` \| `Cash Flow` \| `Net Worth` | Analytics panel |
| `lang` | `Español` \| `English` | Settings segmented control |
| `theme` | `Light` \| `Dark` \| `System` | Settings segmented control |
| `notifications`, `biometric`, `hideAmounts` | boolean | Settings switches |

In the real app: `active` becomes the router; `range` belongs in `DashboardFiltersContext`;
`tab` is local to `AnalyticsPage`; `lang`/`theme`/notification prefs are already
`ThemeContext` + `userService` + `user.preferences`. `hideAmounts` is new — it needs a
preference field and a formatter that blurs amounts until hover.

Data fetching keeps the current shape: `useEffect` per page calling
`analyticsService.getMonthlyHistory(n, language)`, `getPeriodComparison(language)`,
`getInsights(language, format)`, `getFinancialHealth(language, format)`,
`recurringService.getRecurringSeries()`, `goalService.getGoals()`,
`budgetService`, `accountService`. Always pass `language` where the method accepts it.

## Assets

- `assets/logo-mark-dark.png` — the existing pre-rendered dark logo tile from
  `web/src/assets/`. Used at 30px (sidebar) and 24px (compact lockup) with `border-radius: 9px`
  and `object-fit: cover`. In code, use `<Logo tone="inverted" />` rather than an `<img>`.
- Nav icons are lucide, already a dependency: `LayoutGrid`, `Lightbulb`, `BarChart3`,
  `PiggyBank`, `Flag`, `FileText`, `Settings` at 18px / `strokeWidth 2.1`.
- No other imagery. Category marks are solid rounded chips in the category color at 16% alpha —
  swap them for the existing `CategoryIcon` component, which renders the real lucide icon per category.
- All charts are plain flex/`div` bars and one `conic-gradient` ring. The app has
  `NovaBarChart` / `NovaAreaChart` / `NovaLineChart` / `NovaDonutChart` — use those instead, styled
  to the geometry above.
