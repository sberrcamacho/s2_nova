# Stage 2 · Inicio (Home) — evolution of the existing screens

Sources: `S2 Nova Android.dc.html` (Inicio) and `S2 Nova Dashboard.dc.html` (Overview).
Results: `S2 Nova Android v2.dc.html` and `S2 Nova Dashboard v2.dc.html`. The originals are unchanged.
Architecture reference: `S2 Nova Product Architecture.dc.html`, sections 6, 7 and 10.

UI copy is in Spanish and quoted verbatim.

## 1. Android baseline analysis

**Preserve (unchanged):** phone frame; tokens and light/dark themes; header (logo, greeting, bell with unread dot, avatar); balance hero (gradient, glow, "SALDO TOTAL", wallet chip, blur and "Toca para mostrar"); card style (radius 20, padding 18); budget bars and the ≥90 / ≥65 tone rule; the date-column row in upcoming items; the "Movimientos recientes" list with category marks; the FAB and its two-action sheet.

**Modify:**
- Hero boxes are relabeled "Ingresos del mes" / "Gastos del mes", so the period is explicit.
- The wallet chip is now tappable and opens Billeteras. Back returns to Inicio.
- Budgets are sorted by risk (highest % first) and show `spent / limit` under the bar, so they read the same as Web.
- "Próximos pagos" becomes "Próximos 7 días". It is built from `seriesList` instead of two hardcoded rows. A series due today is dated "HOY" in the warning color. The link is renamed to "Programados".
- Transaction rows use the record's `cat` for the category mark. The baseline guessed it from the description. The subtitle now also shows the wallet.

**Reorganize:**
- Bottom bar: **Inicio · Movimientos · [+] · Planes · Reportes**. It was Inicio · Reportes · [+] · Planes · Perfil.
- Movimientos becomes a tab: bottom bar visible, no back arrow, title at 21.
- Perfil becomes a stacked screen, reached from the avatar, with a back arrow.

**Add:** an alert card between the hero and Presupuestos. It shows the highest-priority unread notification, using the same rules as the bell. Tap opens its target; "✕" dismisses it from Inicio only (it stays in the bell list).

**Remove:** nothing.

## 2. Web baseline analysis

**Preserve:** sidebar layout, logo, user card, "Cerrar sesión"; sticky header with search; tokens and themes; balance hero with 6-month bars; card style (radius 16, padding 20); transaction detail modal; toast; "Ocultar montos"; the Transactions screen.

**Modify:**
- UI copy on Inicio, nav, header, Movimientos and the modal changes from English to Spanish (architecture §14). Other screens change in their own stages.
- Hero now includes "Ingresos del mes" / "Gastos del mes" boxes, the same component as Android.
- Category marks use Android's glyphs, colors and circle shape (Web used rounded squares and different glyphs).
- Data now matches Android: the same transactions, the same series (Administración due today, Internet y celular on 26 ago), the same budgets and goals.

**Reorganize:**
- Nav: **Inicio · Movimientos · Planes · Reportes**, plus "Ajustes" in the footer. It was Overview, Insights, Analytics, Budgets, Goals, Reports.
  - Planes = Budgets + Goals, with "Presupuestos" / "Metas" tabs.
  - Reportes = the existing Analytics screen for now. Insights and the old Reports screen merge into it in the Reportes stage.
- Block order follows Android: Balance → Alerts → Plans → Spending by category (Web only) → Upcoming. Web drops "Movimientos recientes": Movimientos is one click away in the sidebar.

**Add:**
- "Billeteras" card next to the hero, with balance and share of total per wallet. Clicking a wallet opens Movimientos filtered by that wallet.
- "Metas" card: ring with category glyph, `current de target`, estimated date.
- "Gasto por categoría" card with share of the month.
- "Próximos 14 días" as a list with running projected balance ("Saldo …"), replacing the four event tiles.
- "Nuevo movimiento" button in the header. It opens a 420px side panel with type, amount, description with category suggestion, category grid, wallet, and "Transferir a" for transfers. It saves to the list and shows a toast.

**Remove:**
- The Income / Expenses / Savings KPI column. Income and expenses moved into the hero; savings belongs to Reportes.
- "Financial health" (five checks), absorbed into "Alertas".
- "Suggestions for you", which became "Alertas". Alert rules match Android's notifications, plus one Web-only trend alert.

## 2b. Loans (Préstamos), grounded in the repository

Backend (`schema.prisma`, `routes/transactions.ts`): a loan is a transaction with `loanKind` LENT (EXPENSE) or BORROWED (INCOME), `counterpartyName` and optional `dueDate`. `POST /transactions/:id/settle-loan` records partial or final abonos as opposite-direction transactions linked by `parentLoanId`, optionally into another wallet. The final abono sets `loanSettledAt`. PLANNED loans can't be settled.

- **Android v2:** the existing "Préstamos" tab in Planes is kept unchanged. On Inicio, a loan reaches the alert card through the existing notification rule (open loan with a due date).
- **Web v2:**
  - Inicio gets a "Préstamos" card under "Metas": "Te deben" / "Debes", plus the next due loan. Alertas gets the same loan alert as Android.
  - Planes gains a "Préstamos" tab with a "Prestado"/"Recibido" toggle, three totals (pending, already paid, next due date) and one card per loan. Each card shows its status ("Pendiente"/"Saldado"), progress and "HISTORIAL" (the loan plus each abono). "Registrar abono" opens a dialog: the amount defaults to the outstanding balance and can't exceed it, and the user picks the wallet to receive into or pay from.
- Creating and editing loans on Web comes in the Planes stage. The backend already supports both.

## 3. Inicio spec (both platforms)

| Block | Android | Web | Data rule |
|---|---|---|---|
| Balance | Hero: total, wallet chip, month income/expenses | Same hero + 6-month bars; "Billeteras" card beside it | Total = sum of wallets |
| Alerts | One card, top unread | "Alertas" grid, all pending, dismissible | Series due today, open loans with a due date, budgets ≥90%, goals ≥90% |
| Plans | 3 riskiest budgets | All budgets (with remaining and note) + "Metas" + "Préstamos" cards | Sorted by % desc; tone ≥90 neg, ≥65 warn, else pos |
| Spending by category | — (in Reportes) | "Gasto por categoría" | Current month |
| Upcoming | Next 7 days | Next 14 days + running balance | From active Programados; due-today first |
| Recent | Up to 5 | — (removed; history lives in Movimientos, "Ver en Movimientos →" from Próximos) | Date desc |

**States**
- Hidden amounts: every amount on Inicio blurs (9px). Android starts hidden if the "Difuminar el saldo total" preference is on.
- No alerts: Android hides the card. Web shows "Sin alertas pendientes." with "Restaurar" (prototype only).
- No upcoming: "Nada programado para esta semana." (Android) / "Nada programado en los próximos 14 días." (Web).
- Loading and sync error are specified in the component stage.

**Interaction targets**
- Android: every card row is tappable and at least 44dp high; the alert dismiss target is 32dp inside a 44dp row.
- Web: rows have a hover background (`--subtle`); "Ver en Planes →", "Ver en Reportes →" and "Ver todos →" deep-link with the matching tab preselected.

## 4. Implementation clarifications

**Copy and naming (applied to the v2 mockups)**
- The whole Web v2 UI is in Spanish, including Reportes (the former Analytics), Planes and every Ajustes screen. The unreachable Insights and Reports screens were removed from the v2 mockup.
- "Recurrentes" is now "Programados" on Android: the screen title, the Perfil row, the tutorial copy, and a new "Programados" pill in the Movimientos header. The internal route can keep its name.
- The Android recurring form offers "Semanal" / "Mensual" / "Anual" only, matching the backend's `RecurrenceInterval`. "Quincenal" was removed.
- Web theme defaults to "Sistema" (`prefers-color-scheme`), with "Claro" / "Oscuro" available, matching `UserPreferences.theme` = SYSTEM.
- Web USD shows "tasa de referencia fija", matching the backend's fixed-rate conversion.
- To delete the account on Web, the user types "ELIMINAR" (case-insensitive) and enters their current password.

**Data consistency.** Both mockups show one dataset, dated 21 ago 2026:
- Wallets: $16.147.300.
- Budgets: Servicios $412.000 / $450.000 at 92%.
- Programados: Administración due today, Netflix 24 ago, Internet y celular 26 ago, salary 01 sep.
- Loans: Camilo Restrepo owes $420.000, due 15 sep; Ana María Ruiz is settled.
- Reportes › Flujo de caja and Patrimonio use the same figures.

**Backend work the UI assumes (not in the repo today)**
| UI | Needs |
|---|---|
| Ajustes › "Sesiones activas" (list, close one, close all others) | Endpoint listing and revoking `refresh_tokens` by id (`device_label` already exists) |
| Ajustes › "Eliminar cuenta" | `DELETE /me` with password check (cascades already exist) |
| "Exportar datos" (CSV) | Export endpoint or client-side CSV from existing list endpoints |
| Barcode step 2 (Open Food Facts) | Server-side lookup behind `GET /products/:barcode` before returning 404 |
| Web write operations (wallets, budgets, goals, recurring, loans, transaction delete) | None: endpoints exist. Only `web/AGENTS.md`'s read-only rule and the missing service functions |
| Web Ajustes › phone / city | None: fields exist on `/me` |

**States (both platforms)**
- Loading: skeletons with the same shape and size as the final card; never spinners inside cards. Amounts show as a 60%-width bar.
- Sync or network error: a non-blocking banner at the top of the content, "No pudimos actualizar tus datos." with "Reintentar". The last loaded data stays visible.
- Empty (new user): the hero shows $0 and "Agrega tu primera billetera" (opens wallet creation). Presupuestos, Metas and Préstamos show their existing empty-state copy with their "+" action.
- Mutations: optimistic update, then refetch the affected list (`ARCHITECTURE.md` §10). On failure, revert and show a toast.

**Header period selector (Web)**
- Shown only on Movimientos. It is a month dropdown (current month plus previous months), and it filters the list together with search and the type filters.
- Hidden on Inicio: that screen always shows the current state (balance, alerts, upcoming items).
- Hidden on Reportes, which keeps its own 3M/6M/12M range. Also hidden on Planes (budgets are monthly and always the current month) and Ajustes.

**Web layout**
- Designed at 1440px. The sidebar (212px) is fixed.
- Two-column rows stack to one column below 1100px.
- Alertas goes from 3 columns to 2 below 1100px, and to 1 below 760px.
- The "Nuevo movimiento" panel is 420px wide, or full width below 520px.

**Accessibility**
- Hidden amounts: when blurred, set `aria-hidden` on the number and expose "Monto oculto" instead, so screen readers never read a hidden balance.
- Every icon-only control needs an accessible name: eye ("Mostrar montos" / "Ocultar montos"), "✕" ("Descartar"), bell ("Notificaciones"), avatar ("Perfil").
- Status is never conveyed by color alone. Budget rows always show the percentage; loans show "Pendiente" / "Saldado" as text.
- Touch targets are at least 44dp on Android. Web rows are focusable, with a visible focus ring in `--accent`.

## 5. Parity contract for implementation

Android and Web are functionally the same app (architecture §4). The v2 mockups do not yet draw every Web write screen. Where a Web screen is missing, build it as a side panel (420px, same shell as "Nuevo movimiento") with the **same fields, validation and Spanish copy as the matching Android sheet** in `S2 Nova Android v2.dc.html`:

| Web operation | Android source to mirror |
|---|---|
| Edit transaction (from the detail dialog, "Editar") | Nuevo movimiento screen, prefilled |
| Create / edit / delete wallet | Billeteras sheet |
| Create / edit / delete budget | Planes › Presupuestos sheet |
| Create / edit / delete goal; "Aportar" | Planes › Metas sheet and GoalPaySheet |
| Create / edit loan ("+ Registrar préstamo" / "+ Registrar deuda", "Editar") | Planes › Préstamos sheet |
| Create / edit / pause / confirm Programado | Programados sheet |
| Categories | Category picker grid; management rules per `schema.prisma` |
| View / edit scanned purchase | Transaction detail + product fields (`productId`) |

The Web "Registrar abono" dialog and the "Nuevo movimiento" panel are already drawn in v2.

## 6. Known gaps, left for later stages
- Web Billeteras and Categorías pages don't exist yet, so they are not in the nav. The wallet rows link to filtered Movimientos in the meantime.
- Budgets/Goals on Web are still read-only cards; CRUD comes in the Planes stage.
- The Android "Recurrentes" screen keeps its title; it is renamed "Programados" in the Movimientos stage.
