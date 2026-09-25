# Access, first run and guides — spec

Mockup: `S2 Nova Android v2.dc.html` (Login, Crear cuenta, Onboarding, Inicio). UI copy in Spanish, verbatim. State management and persistence are a Claude Code implementation concern; this doc defines the UI states.

## 1. Guest / demo

- Login adds a secondary button under Google: "Continuar como invitado" (outlined, enter icon) with the caption "Explora una cuenta de ejemplo. No se guarda nada."
- It opens a sandboxed demo account with realistic seed data (wallets incl. a USD wallet, movements with receipts, budgets, goals with periodic contributions, loans, Programados). Everything is interactive; nothing syncs.
- Inicio shows a banner at the top: "Modo invitado" — "Estás usando datos de ejemplo. No se guarda nada." + "Crear cuenta".
- Guides are on for guests.
- **"Demo Account" is removed from Ajustes** on both platforms (Android "Acerca de" no longer says "datos de demostración"). There is no way to switch to demo from inside a real account.

## 2. First run (new account)

Crear cuenta › Onboarding (2 steps, not skippable) › Inicio.

1. "Tu moneda principal" — list of currencies with the detected one first and marked "Detectada en tu dispositivo · Colombia". Radio selection. "Continuar".
2. "Crea tu primera billetera" — body "Necesitas al menos una para registrar movimientos. Puede ser tu cuenta de ahorros, Nequi o el efectivo que llevas." Fields: Nombre (type auto-detected from the name), Tipo, Moneda (principal, read-only, "Puedes crear billeteras en otras monedas después, desde Billeteras."), Saldo actual. CTA "Crear billetera y entrar", disabled until a name exists.

Progress: two bars in the header + "PASO 1 DE 2". Back arrow returns to step 1 / Crear cuenta. The user never lands in an app without a wallet. After step 2 all other lists are empty and show their existing empty states.

Existing Android onboarding steps (income, budget suggestion) move after the first Inicio visit as optional alerts; they no longer block entry.

## 3. Contextual mini-guides

One card per main screen on the first visit, replacing the 4-step tutorial sheet.

| Screen | Title | Body |
|---|---|---|
| Inicio | "Tu dinero de un vistazo" | "El saldo suma todas tus billeteras en tu moneda principal. Debajo ves el mes, las alertas y lo que viene." |
| Movimientos | "Todo lo que entra y sale" | "Los programados aparecen arriba. Toca un movimiento para ver su detalle y su comprobante." |
| Planes | "Presupuestos, metas y préstamos" | "Pon límites a tus gastos, ahorra para lo que quieres y lleva la cuenta de lo que prestas." |
| Reportes | "Hacia dónde va tu dinero" | "Compara meses y revisa tus gastos por categoría o subcategoría." |
| Billeteras | "Dónde está tu dinero" | "Cada billetera tiene su moneda. El saldo total las convierte a tu moneda principal." |

- Card floats above the bottom bar (does not block content), label "GUÍA RÁPIDA · INICIO", actions "Omitir guías" (turns all off) and "Entendido" (marks this screen seen).
- Hidden while any sheet, dialog or notification panel is open.
- Nuevo movimiento has no card: the category sheet subtitle "Paso 1 de 2 · después ingresas el monto" does that job.
- Ajustes › "Ver las guías otra vez" resets the seen set.
- Persist `guidesSeen: string[]` per user (server preference) so a guide seen on Android is not repeated on Web.
