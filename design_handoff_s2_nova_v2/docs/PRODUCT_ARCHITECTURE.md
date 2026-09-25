# S2 Nova — Multiplatform product architecture

Stage 1 · Conceptual architecture before Android and Web interface design · Revised 23 Sep 2026 against the repository (`sberrcamacho/s2_nova@main`).

Convention: this document is in English. Text in quotes (e.g. "Nuevo movimiento") is Spanish UI copy and must be implemented verbatim.

Feature specs: [`NEW_MOVEMENT.md`](NEW_MOVEMENT.md) (movement capture, date, currency, repeat, attachments, deletion), [`PLANS.md`](PLANS.md) (goals, budgets), [`CURRENCIES_AND_WALLETS.md`](CURRENCIES_AND_WALLETS.md), [`ONBOARDING.md`](ONBOARDING.md) (guest, first run, guides), [`WEB_PARITY.md`](WEB_PARITY.md) (how each feature maps to Web). Category taxonomy is specified in [`CATEGORY_SYSTEM.md`](CATEGORY_SYSTEM.md). Where the two differ, `CATEGORY_SYSTEM.md` wins.

## 0. Premises to adjust

- **Personal and business.** Business finance means invoicing, taxes, multiple users with permissions and cost centers. Decision: out of scope. S2 Nova is personal finance only.
- **Full parity for barcode scanning.** Scanning depends on the phone camera. What is shared is the result (a purchase with line items). Web can view and edit a purchase but cannot scan.
- **Budget periods and renewal.** The backend supports `MONTHLY` only (`BudgetPeriod` enum), with an implicit reset each month. Superseded: budgets now support "Mensual" and "Rango personalizado" (see `CATEGORY_SYSTEM.md`).
- **Wallets, recurring items and loans.** All three are implemented in backend and Android. Decision: wallets, Programados and Préstamos are MVP.
- **COP/USD currency.** Superseded (Sep 2026): multi-currency is in scope. Each wallet has one currency; a movement keeps its original currency and the rate used. See `CURRENCIES_AND_WALLETS.md`.

## 0.1 Existing implementation (repository inventory)

Sources: `README.md`, `PROJECT_STATE.md` (18 Sep 2026), `ARCHITECTURE.md`, `backend/prisma/schema.prisma`, `backend/src/routes/transactions.ts`. The backend is shared and deployed.

| Domain | Backend (shared) | Android | Web today |
|---|---|---|---|
| Auth & profile | Email/password, Google Sign-In, refresh rotation, `PATCH /me`, change/verify password; phone, city | Full, plus auto-lock | Login/register, change password; no phone/city |
| Preferences | Language, currency COP/USD (fixed rate), theme (default SYSTEM), notifications, blurBalance, autoLockMinutes, biometricLogin (not wired) | Full | Theme, currency, language |
| Wallets | `CASH, BANK_DEBIT, BANK_CREDIT, SAVINGS, CRYPTO, NEQUI, DAVIPLATA, OTHER`; balance maintained per transaction | CRUD | Read-only |
| Transactions | `INCOME / EXPENSE / TRANSFER`; status `COMPLETED` or `PLANNED` ("Próximo"); optional budget, goal, product, subcategory links; payment method derived from wallet type | CRUD | List/filter/sort; no delete |
| Loans | Transaction with `loanKind` `LENT` (expense) or `BORROWED` (income), `counterpartyName`, `dueDate`. `POST /transactions/:id/settle-loan` records partial/final repayments as opposite-direction transactions linked by `parentLoanId`, optionally into another wallet; the final one sets `loanSettledAt`. A `PLANNED` loan cannot be settled | "Préstamos" tab in Planes: create, edit, "Registrar abono", settled state | Outstanding lent/borrowed only in Net Worth and Insights |
| Categories | System categories with subcategories; user categories reserved in schema, no flow creates them | Pick | Pick |
| Budgets | Monthly, one category, optional name and theme icon, server-computed progress; 50/30/20 recommendations | CRUD | Read-only |
| Goals | Target, optional date, category; progress = linked transactions | CRUD, contributions | Read-only |
| Recurring | `RecurringSeries` `WEEKLY / MONTHLY / YEARLY`; transaction created only on explicit confirm | CRUD, confirm | Read-only |
| Products | Global barcode catalog; 404 leads to manual entry, which registers the product for everyone | Scanner (CameraX + ML Kit) | — |
| Onboarding | Flags in preferences | Welcome, income, wallet, budget suggestion, tutorial | — |

### Classification

- **Preserve:** shared backend and data model; wallets; transactions incl. transfers and PLANNED; loans with partial abonos; recurring series with explicit confirm; budgets and 50/30/20 recommendations; goals with contributions; global barcode catalog; Android onboarding; privacy blur and auto-lock; theme, language and currency preferences.
- **Redesign:** Web navigation (7 pages → 4 primary destinations); Web Overview → Inicio; Web from read-only to full client for wallets, budgets, goals, recurring, loans and transaction delete (requires lifting the read-only rule in `web/AGENTS.md`); Android bottom bar (Movimientos in, Perfil to avatar); "Recurrentes" renamed "Programados".
- **Deprecate:** Web's separate Insights and Reports pages (merged into Reportes); Web's 0–100 financial-health score and per-category health summary (replaced by Alertas); Web's biometric toggle.
- **New:** user-defined categories; Open Food Facts lookup before manual entry; Web "Nuevo movimiento" side panel; Web Billeteras and Categorías pages; CSV export.

Mismatch to resolve: Android's recurring form offers "Quincenal", which `RecurrenceInterval` does not have.

## 1. Value proposition

Know how much money you have, where it goes and whether you will meet your plans: log in seconds from your phone, analyze in depth from your computer.

The product rests on one habit, logging transactions, and two questions it answers: "how am I doing this month?" (budgets) and "will I get there?" (goals).

## 2. Shared mental model

Everything starts with a transaction. A transaction leaves or enters a wallet, has a category, and that category feeds a budget. Goals receive contributions, which are also transactions.

| Role | Entity | UI term |
|---|---|---|
| Where from | Wallet | "Billetera" |
| What happened | Transaction | "Movimiento": expense, income or transfer |
| On what | Category | "Categoría" |
| How much I can | Budget | "Presupuesto": limit per period |
| Saving for | Goal | "Meta": target with contributions |

Rules:

- Total balance is the sum of wallet balances. No other balance exists.
- A budget holds no money: it measures spending in its categories within its period.
- A goal contribution is a transaction out of a wallet. Withdrawing returns money to a wallet.
- A scanned purchase is an expense with attached line items, not a separate entity.
- Budgets, goals and loans are the three kinds of Plan.
- A loan is a transaction with a counterparty. Lending takes money out of a wallet; each "abono" brings money back (same or another wallet). Borrowing works in reverse.

### Single vocabulary

Localized by the language setting, never by platform.

| UI term | Code name | Meaning | Replaces |
|---|---|---|---|
| Inicio | Home | Summary of current state | Overview |
| Movimiento | Transaction | Expense, income or transfer | Separate expense/income sections |
| Planes | Plans | Budgets, goals and loans | Separate Web Budgets/Goals |
| Reportes | Reports | Analysis over a period | Insights, Analytics, Reports |
| Alerta | Alert | Actionable rule-generated notice | Insight, Suggestion, Financial health |
| Billetera | Wallet | Where money is held | Account |
| Aporte | Contribution | Money moved into a goal | "Contribución" |
| Préstamo | Loan | Money lent ("Prestado") or borrowed ("Recibido") | — |
| Abono | Loan payment | Partial or final repayment | — |

## 3. System modules

| Module | Contains | Scope |
|---|---|---|
| Home | Balance, current month, alerts, at-risk plans, upcoming, recent | MVP |
| Transactions | Expenses, income, transfers; history, search, filters, detail; scanned purchases | MVP |
| Plans | Budgets, goals (target, date, initial amount, contributions), loans (counterparty, due date, abonos) | MVP |
| Reports | Trend, by category, period comparison, plan analysis, export | Basic MVP |
| Categories | Browse, create custom; icon, color, type — in "Ajustes › Categorías" | MVP |
| Wallets | Create, edit, opening balance, type | MVP |
| Profile & settings | User data, language, currency, theme, privacy, security, sessions | MVP |
| Scheduled | Repeating transactions, "Programados" | MVP |

Barcode scanning is a capture method inside Transactions, not a module.

## 4. Platform parity

Same application functionally: one account, one backend, one dataset. Android is tuned for daily use; Web for management and deep analysis.

| Capability | Android | Web | Note |
|---|---|---|---|
| Account, sign-in, profile, preferences | Yes | Yes | Same preferences record |
| Wallets CRUD | Yes | Yes | |
| Log expense / income / transfer | Yes | Yes | Includes "Próximo" (PLANNED) |
| Edit / delete transactions | Yes | Yes | Budgets, goals, balances recompute server-side |
| Budgets | Yes | Yes | |
| Goals + contributions | Yes | Yes | |
| Loans ("Prestado" / "Recibido") + abonos | Yes | Yes | `settle-loan` |
| Programados (CRUD, pause, confirm) | Yes | Yes | Transaction created only on confirm |
| Categories | Yes | Yes | |
| Reports | Yes | Yes, deeper | Same figures |
| CSV export | — | Yes | |
| Scan a purchase | Yes | No | Hardware exception |
| View / edit a scanned purchase | Yes | Yes | |

### Cross-platform consistency

The backend is the only source of truth. Every mutation refetches affected lists on the client that made it; the other client picks it up on refetch (Android: screen focus and pull-to-refresh; Web: route change and window focus). No push or real-time channel; SSE is out of MVP scope.

### How each platform executes the same operation

| Feature | Android | Web |
|---|---|---|
| Log transaction | Center button; amount-first sheet; category suggested by keyword; last wallet preselected | Always-visible "Nuevo movimiento" button and `N` shortcut; side panel |
| Barcode purchase | Camera, line items, total, save as expense | View/edit line items; no scanning |
| History | Grouped by day with daily total | Sortable, paginated table with filter totals |
| Search & filters | Text search and chips | Combinable, saveable filter bar; global search |
| Edit & delete | Tap to edit; swipe to delete with undo | Detail panel; multi-select recategorize/delete |
| Categories | Grid picker; management in Ajustes › Categorías | Ajustes › Categorías with usage per category |
| Budgets | Spent, limit, bar | Plus remaining, trend, end-of-period projection |
| Goals | Ring and "Aportar" | Plus contribution history, estimated completion |
| Loans | Toggle, outstanding, "Registrar abono" | Plus abono history, due-date list, totals |
| Reports | Three summary views, 3M/6M/12M | Full views, comparison, CSV |
| Alerts | Push opening the item | Alert list on Home |

## 5. Information architecture

- **Inicio:** Balance · Current month · Alerts · At-risk plans · Upcoming · Recent
- **Movimientos:** All · Expenses · Income · Transfers · Scheduled; Detail › Line items
- **Planes:** Budgets › Detail › Transactions; Goals › Detail › Contributions; Loans › Detail › Abonos
- **Reportes:** Summary · By category · Cash flow · Plans · Export
- **Billeteras:** List › Detail › Wallet transactions
- **Perfil y ajustes:** Profile · Categories · Preferences · Privacy · Security · Sessions · Delete account

Every detail view links to the transactions that compose it.

## 6. Android navigation

- Bottom bar: Inicio · Movimientos · [+] · Planes · Reportes. Profile opens from the header avatar.
- Center button: "Nuevo movimiento" and "Escanear compra". Type is chosen inside the form.
- Wallets open from the wallet chip on the Home balance card and from Profile.

## 7. Web navigation

- Sidebar: Inicio · Movimientos · Planes · Reportes — Billeteras · Categorías — Ajustes.
- Global header: transaction search, period selector scoped to the view, "Nuevo movimiento".
- Create/edit forms open as a side panel.
- Planes has three tabs: "Presupuestos", "Metas", "Préstamos".

## 8. Primary user flows

- **F1. Log an expense (Android):** [+] › "Nuevo movimiento" › amount › description (category + subcategory suggested: "mercado" → Alimentación · Mercado) › preselected wallet › "Guardar". Target: under 10 s.
- **F2. Barcode purchase (Android):** [+] › "Escanear compra" › lookup: (1) global catalog `GET /products/:barcode`; (2) Open Food Facts, name only; (3) manual entry, `POST /products` registers globally › review › wallet › "Guardar".
- **F3. Review the month (Web):** Movimientos › filter › multi-select › recategorize or delete › budgets recalc.
- **F4. Create a budget (both):** Planes › "Nuevo presupuesto" › name › category + subcategory ("Todas" = whole category) › limit › period "Mensual" or "Rango personalizado" › "Guardar". Alerts at 90%.
- **F5. Create a goal and contribute (both):** Planes › Metas › "Nueva meta" › category, target, "Monto inicial", "Fecha objetivo", source wallet. Contribute: "Aportar" › amount.
- **F6. Continuity:** push "Alimentación llegó al 90%" › budget on phone › same budget on Web with its transactions. Same name, percentage and status color on both.
- **F7. Monthly analysis (Web):** Reportes › period › compare › export CSV.
- **F8. Loans (both):** Planes › Préstamos › "Prestado" › "+ Registrar préstamo" › person, amount, wallet, due date › "Guardar". Later "Registrar abono" › amount (defaults to outstanding), destination wallet. At zero: "Saldado". "Recibido" reverses directions.

## 9. Budget model

| Attribute | Rule |
|---|---|
| Scope | Parent category ("Todas", every child counts) or a single subcategory |
| Period | "Mensual" (resets on the 1st) or "Rango personalizado" with start/end dates (no reset) |
| Duplicates | Rejected for the same scope and overlapping period |
| Status | Healthy (<65%), watch (65–89%), at risk (≥90%), exceeded (>100%) |
| Carry-over | Secondary |

## 10. Home content

Every Android block exists on Web, in the same order.

| Block | Android | Web |
|---|---|---|
| Balance | Hideable total; month income/expenses | Plus 6-month trend and per-wallet balance |
| Alerts | Most important one | Full, dismissible list |
| Plans | Three highest-risk budgets | All budgets with projection; goals; loans summary |
| Spending by category | In Reportes | Current month distribution |
| Upcoming | Next 7 days | Next 14 days with projected balance |
| Recent | 5 transactions | 10 with link to history |

## 11. Shared design system

Foundations: S2 Nova brand, semantic palette (primary, positive, negative, warning, surfaces), Plus Jakarta Sans with tabular figures, radius/spacing scales, line icons, one icon and color per category (from `s2-categories.js`), light and dark themes.

| Component | Android | Web |
|---|---|---|
| Amount | Currency format, sign, color by type, hidden mode — identical | |
| Category mark | Icon on its color at 16% — identical | |
| Budget bar | Same thresholds and colors | |
| Goal ring | Category icon centered, goal color | |
| Transaction | List row | Table row |
| Form | Bottom sheet or screen | Side panel |
| Pickers | Category grid + subcategory chips, wallet chips, calendar | Searchable menu, range calendar |
| Filters | Chips | Filter bar |
| Alert | Notification and card | Dismissible card |
| Destructive confirmation | Dialog; undo snackbar | Dialog; undo toast |
| Empty state | Same copy and primary action | |

## 12. Justified UX differences

| Aspect | Android | Web | Reason |
|---|---|---|---|
| Capture | Center button | Global button + shortcut | Thumb vs keyboard |
| Editing | Screen or sheet | Side panel | Desktop keeps context |
| Lists | Grouped by day | Sortable table | Quick reading vs comparison |
| Bulk actions | No | Multi-select | Batch correction happens seated |
| Charts | One or two per view | Several | Screen size |
| Scanning | Yes | No | Needs a camera |
| Export | No | CSV | Files live on a computer |
| Notices | Push | Alerts on Home | Phone travels with you |
| Privacy | Balance hidden by default | Configurable | Phones are used in public |

## 13. MVP and secondary

**MVP:** sign-up/sign-in and sync; wallets; transaction CRUD; history with search and filters; hierarchical categories with keyword suggestion and custom categories; budgets (monthly or custom range) and 50/30/20; goals with initial amount, target date, contributions and withdrawals; loans with partial abonos; barcode purchase on Android; Home on both; Web reports; CSV export; Programados; profile, language, display currency, theme, sessions.

**Secondary:** budget carry-over; alerts beyond budget thresholds; saved filters and bulk editing; multi-currency conversion; PDF export.

## 14. Remove, merge or reorganize

| Today | Proposal |
|---|---|
| Physical / IoT piggy bank | Removed |
| Web: Overview, Insights, Analytics, Reports | Inicio and Reportes; suggestions → Alerts |
| Web: separate Budgets and Goals | Planes with tabs, as on Android |
| Web without transactions section | Movimientos as primary destination |
| Android: stacked Movimientos, Perfil in bar | Movimientos in bar; Perfil to avatar |
| Wallets and Recurring inside Profile | Wallets own destination; recurring under Movimientos › Programados |
| Loans (Android Planes tab) | Preserved; Web gains "Préstamos"; due dates feed Alertas |
| Financial health checks | Absorbed into Alertas |
| Web UI in English | Web UI in Spanish |
| Theme differs per platform | "Claro", "Oscuro", "Sistema" on both; default "Sistema" |
| COP/USD switch | Display currency; conversion in phase 2 |

## 15. Resolved decisions

| Decision | Outcome |
|---|---|
| Business scope | Out of scope. No Negocio wallet. |
| MVP extras | Programados and Préstamos are MVP. Carry-over and Web bulk editing secondary. |
| Budget model | Section 9. |
| Barcode data | Global catalog → Open Food Facts → manual entry (registers globally). |
| Default theme | "Sistema" on both. |
| Design order | Screen by screen, both platforms together, starting with Inicio. |
