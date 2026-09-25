# Currencies and wallets — spec

Mockup: `S2 Nova Android v2.dc.html` › Ajustes › Monedas, Billeteras, Nuevo movimiento. UI copy in Spanish, verbatim.

## 1. Model

- **Principal currency** (user preference). Preselected on first run from the device's regional settings (Android `Locale.getDefault()` + `Currency.getInstance(locale)`; Web `Intl.NumberFormat().resolvedOptions().locale`). Total balance, budgets and reports are shown in it.
- **User currencies**: the list the user enabled (principal + others). Each has a daily rate to the principal.
- **Wallet**: exactly one currency. Its balance is kept in that currency.
- **Movement**: `amount` + `currency` as it happened. If `currency ≠ wallet.currency`, store `fxRate` (wallet units per 1 movement unit) and `walletAmount`. The wallet balance changes by `walletAmount`. Rates are frozen per movement.
- **Totals**: Σ wallet balance × rate to principal (rate of the day). Budget spend and reports convert each movement with its stored rate.

Replaces the old COP/USD "Formato de moneda" switch, which is removed from Ajustes.

## 2. Display rules

- Every amount shows its currency symbol (`$`, `US$`, `€`…). The code appears wherever two currencies meet: currency pill in Nuevo movimiento, "Wise · USD" wallet chip, "Cuenta de ahorros · USD" wallet card.
- Foreign amounts carry a secondary line in the principal currency: "≈ $1.264.000" (lists, wallet cards, detail).
- Never show a bare number whose currency is ambiguous.

## 3. Ajustes › Monedas

- "Moneda principal" card: symbol badge, name, code, "Principal" tag, note "Detectada por la región de tu dispositivo (Colombia). El saldo total, los presupuestos y los reportes se muestran en COP."
- "Otras monedas": name · code, "1 USD = $3.950 · 1 billetera". "Quitar" only when no wallet uses it (two-step confirmation; existing movements keep their amount and rate).
- "+ Agregar moneda" sheet with the catalog (MXN, PEN, BRL, GBP, CLP…).
- Changing the principal currency is a follow-up (requires recomputing displayed totals only; stored data is unaffected).

## 4. Wallets

- Wallet sheet adds "Moneda" chips (user currencies) with the note "El saldo se lleva en <moneda>. Los movimientos en otra moneda se convierten al registrarlos." The balance field uses the wallet's symbol.
- Wallet list: amount in wallet currency + "≈" principal line; footer "<total> en total, en COP. Las billeteras en otra moneda se convierten con la tasa del día."
- The last wallet cannot be deleted (snackbar "Necesitas al menos una billetera para usar S2 Nova."). Other deletions use the two-step confirmation and list how many movements go with it.

## 5. Backend

`Currency` catalog; `UserCurrency { userId, code, isPrincipal }`; `Account.currency`; `Transaction.currency`, `fxRate`, `walletAmount`; daily `FxRate { base, quote, date, rate }`. Transfers between wallets with different currencies store both amounts.
