# Handoff: S2 Nova v2 — movements, currencies, plans, onboarding (Android first, Web parity)

Target repo: `sberrcamacho/s2_nova` (branch `main`). Implement Android first, then Web.

## Overview
This package extends the existing S2 Nova personal-finance app (Web + Android). It adds:
- A faster "Nuevo movimiento": category → amount, keypad/calculator, date/time, future (scheduled) movements, repeat, currency, receipts, "De" for income, custom-budget assignment, optional "Título" and "Nota".
- Multi-currency: each wallet has one currency and each movement keeps its original currency + rate.
- Planes: category budgets and custom budgets (icon), goals with a suggested icon, one-off "Abonar" and periodic contributions (auto or with confirmation).
- One category taxonomy (income/expense + subcategories), managed in Ajustes › Categorías.
- Two-step confirmation for important deletions, and undo for minor ones.
- Guest mode from Login ("Continuar como invitado"), a required first-run flow (principal currency → first wallet), and short per-screen guides.
- "Demo Account" is removed from Ajustes.

## About the design files
The `.dc.html` files are **design references built in HTML**: prototypes that show the intended look and behavior. They are not production code. Recreate them in the repo's existing stack and patterns (Android native/Compose or what the repo uses; the existing Web framework). Don't ship the HTML or copy its runtime (`support.js`). Open them in a browser to click through the states.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy and interactions are final. Match them using the codebase's existing theme tokens and components.

## Language rule
All UI copy stays in **Spanish**, verbatim as in the mockups and docs. Developer docs are in English. The physical/IoT piggy bank is out of scope.

## How to navigate the prototypes
- `S2 Nova Android v2.dc.html`: phone frame. Use the **"Estado"** selector above the phone to jump to any state (26 states: Nuevo movimiento steps, detail with receipt, goal + aporte periódico, budgets, categories, currencies, wallet, first run, login/guest, deletion steps, notifications).
- `S2 Nova Dashboard v2.dc.html`: Web app. Same **"Estado"** selector, pill at the bottom-center.
- Everything is interactive and runs on shared seed data.

## Specs (source of truth, read in this order)
1. `docs/PRODUCT_ARCHITECTURE.md`: product structure, navigation, data model overview.
2. `docs/NEW_MOVEMENT.md`: Nuevo movimiento screen, flow, pad/calculator rules, date/time and scheduled movements, repeat, currency, attachments, "De", deletion (two-step), movement detail, data-model changes.
3. `docs/PLANS.md`: plan icons (`guessPlanIcon`), goals, periodic contributions (`GoalPlan`), budgets (`Budget.kind CATEGORY|CUSTOM`, `walletIds`, `Transaction.customBudgetId`).
4. `docs/CURRENCIES_AND_WALLETS.md`: principal currency from device locale, wallet currency, `fxRate` / `walletAmount`, display rules, Ajustes › Monedas.
5. `docs/CATEGORY_SYSTEM.md`: taxonomy, stable IDs, migration map, Ajustes › Categorías rules (rename, hide built-ins, delete custom with reassignment).
6. `docs/ONBOARDING.md`: guest mode, first-run flow, mini-guides (`guidesSeen` persisted server-side).
7. `docs/WEB_PARITY.md`: how every capability maps to Web vs Android. Web differs only in desktop patterns and the more detailed Reportes.

`s2-categories.js` is the canonical taxonomy and plan-icon data (IDs, Spanish names, colors, icon paths, keyword guessers, legacy migration). Port it as data (JSON/constants) on both platforms; keep IDs stable.

## Screens / states to implement (Android, then Web)
- Nuevo movimiento: default, category selection, amount (keypad), calculator, options row (Fecha y hora, Repetir, Adjuntar, De, Presupuesto, Más), future/scheduled, repeat, currency, attachment, income with "De", custom budget pick.
- Movimientos list with a "PROGRAMADOS" group; movement detail with receipt viewer.
- Goal create/edit, "Abonar", aporte periódico; goal-contribution notifications with "Confirmar aporte" / "Omitir esta vez".
- Budget create (Por categoría / Personalizado).
- Ajustes › Categorías, Ajustes › Monedas; Billeteras with currency.
- Login with guest, first-run (moneda → billetera), guide cards.
- Two-step destructive confirmation (movement ≥ $200.000, or with a receipt or repeat; budget; goal; wallet; series; loan; custom category; currency). Other deletions: undo snackbar/toast (4.5 s).

## Interactions & behavior (key rules)
- Opening Nuevo movimiento on Android opens the category sheet; picking a leaf opens the amount pad automatically. On Web the panel opens on the full form with the amount focused; the Categoría row opens the grid inline. Category is required to save (except transfers).
- Pad default mode = last used (local preference). Switching modes never clears the value. Arithmetic: `+ − × ÷`, decimal `,`, `=`; results ≥ 0, 2 decimals.
- Date defaults to now. Future date ⇒ status PLANNED; it doesn't affect balances until confirmed. Visual: amber "PROGRAMADO" badge.
- Movement currency ≠ wallet currency ⇒ show "≈ $X COP en <wallet> · 1 USD = $3.950"; store original amount + rate.
- Category budgets link automatically by category + wallet set. Custom budgets are picked manually in Nuevo movimiento.
- Goal/budget icon is auto-suggested from the name until the user picks one manually.
- The last wallet cannot be deleted.

## State / data (summary; details in the docs)
New or changed: `Transaction.occurredAt`, `status PLANNED`, `currency`, `fxRate`, `walletAmount`, `title` (optional), `note` (optional), `counterpartyName/Kind`, `customBudgetId`; `Attachment` table; `RecurringSeries` + `DAILY`, `occurrences`, `endDate`, `autoConfirm`; `Budget.kind`, `icon`, `walletIds`; `Goal.icon`; `GoalPlan`; `UserCurrency`, `Account.currency`, `FxRate`; user prefs `padMode`, `guidesSeen`.

## Design tokens
Use the tokens already in the repo (dark palette, Plus Jakarta Sans + Inter). The values used in the mockups:
- Background `--bg` #0B0B10 · surface `--surface` #14141C · surface2 `--surface2` #1B1B25 · lines `--line` rgba(255,255,255,.06) / `--line2` rgba(255,255,255,.10)
- Text #F4F4F8 · muted #A8A8B8 · dim #6E6E80
- Accent #6C5CE7 · accent2 #A69DFF · positive #32C98A · negative #FF6262 · warning #F0B429
- Tints: accent rgba(108,92,231,.12–.16), warning rgba(240,180,41,.12–.18), negative-soft rgba(255,98,98,.14)
- Radii: 10–12 px (inputs/buttons Web), 14 px (inputs Android), 16–18 px (cards), 20–22 px (hero/sheets), 999 px (pills)
- Type: numbers use tabular figures; titles 24–26 px / 800; body 12.5–13.5 px; labels 10.5–11.5 px / 700–800, uppercase tracking .06–.12em
- Touch targets ≥ 44 px on Android (option tiles 48 px, keypad keys 56 px, calculator keys 50 px)
- Category colors/icons: from `s2-categories.js` (`CAT_VIS`)

If a value in the mockup differs from the repo's tokens, **use the repo's tokens**.

## Assets
- `design_handoff_s2_nova_overview/assets/logo-mark-dark.png`: logo mark (already in the repo).
- Icons are inline SVG line icons (24 px grid, stroke 1.9–2). Use the repo's icon set with equivalent glyphs.
- Receipt previews are placeholders.

## Files
- `S2 Nova Android v2.dc.html`: Android reference (all states).
- `S2 Nova Dashboard v2.dc.html`: Web reference (all states).
- `s2-categories.js`: taxonomy + plan icons (canonical data).
- `docs/*.md`: specs listed above.
- `DESIGN_CONVENTIONS.md`: project rules (Spanish UI, English docs, IoT out of scope).
- `support.js`: prototype runtime, only needed to open the HTML files. Do not port.
