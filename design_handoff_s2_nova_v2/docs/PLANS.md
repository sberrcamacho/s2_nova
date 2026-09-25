# Planes — goals and budgets spec (Android first)

Mockup: `S2 Nova Android v2.dc.html` › Planes. UI copy in Spanish, verbatim.

## 1. Plan icons (goals and custom budgets)

Goals and custom budgets use an **icon**, not a category. Source: `PLAN_ICONS` in `s2-categories.js` (18 icons that reuse the taxonomy's `CAT_VIS` icon + color, so a travel goal and the Viajes expense category look the same).

- `guessPlanIcon(title)` suggests the icon while typing (Spanish and English keywords): "Portátil nuevo" → technology, "Vacaciones" → travel, "Fondo de emergencia" → savings (shield), "Carro" → transportation.
- The suggestion applies only while `iconAuto` is true. Tapping an icon sets `iconAuto = false` and the title no longer changes it.
- Note under the name: "Icono sugerido por el nombre. Toca otro para cambiarlo."
- Picker: 9×2 grid of 30 px marks; selected = 1.5 px ring in the icon color.

## 2. Goals

Fields: "Nombre" (required, with icon mark), "Icono", "Monto objetivo" (required), "Monto inicial", "Fecha objetivo (opcional)", "Aporte periódico".

Card: progress ring in the icon color with the icon centered; name; "68% · fecha objetivo 30 de junio de 2027"; current / target; note; plan line when a periodic contribution exists ("Aporte mensual de $250.000 desde Bancolombia · con confirmación · próximo 21 ago"); "Abonar".

Progress = initial amount + Σ contributions. Unchanged.

Migration: `Goal.themeIcon` / goal category → `Goal.icon` via `PLAN_ICON_FROM_GOAL`.

## 3. Periodic contributions (Aporte periódico)

Opened from the goal sheet row. Sheet over the goal sheet.

| Field | Options |
|---|---|
| "Monto de cada aporte" | required |
| "Frecuencia" | "Diario", "Semanal", "Mensual" |
| "Desde qué billetera" | wallet chips |
| "Empieza" | date |
| "Termina" | "Al cumplir la meta" (default), "Después de" N aportes, "En una fecha" |
| "En cada fecha" | "Pedirme confirmación" (default) / "Automático" |

Summary box, e.g. "Con 8 aportes de $350.000 cumples la meta hacia abril de 2027." Buttons "Aplicar", "Quitar aporte periódico".

Behavior:
- **Pedirme confirmación**: on each date a notification "Aporte programado a Viaje a Perú" — "Tienes un aporte de $250.000 COP para hoy desde Bancolombia." with inline actions "Confirmar aporte" (creates the contribution transaction) and "Omitir esta vez" (advances `next`). Push on Android; alert on Web Home.
- **Automático**: the contribution is created on the date and a notification reports it: "Aporte automático registrado — $100.000 COP a Fondo de emergencia desde Nequi · 17 ago".
- "Al cumplir la meta" stops the plan when progress ≥ target.
- Model: `GoalPlan { goalId, amount, frequency, walletId, startDate, endMode: GOAL|COUNT|DATE, count?, endDate?, autoConfirm, nextDate }`. Server job creates PLANNED or COMPLETED contributions.

## 4. Budgets

Kind chosen at the top of the sheet: "Por categoría" | "Personalizado".

Sheet layout (both kinds): kind switch, "Nombre" (its leading mark is tappable, with a small ▾ badge: opens the Categoría sheet, or the Icono sheet for Personalizado), "Monto", for Personalizado an inline "Icono" grid (9×2, suggestion preselected), then a row of option icons (48 px rounded squares with a label, same pattern as Nuevo movimiento). Each icon opens its own sheet and its label shows the current value; a one-line summary sits under the row ("Solo Servicios públicos · Internet, de todas tus billeteras · se reinicia cada mes.").

| Icon | Kind | Sheet |
|---|---|---|
| Category mark → "Categoría" / category or subcategory name | Por categoría | Category icon grid; picking a parent with children opens the Subcategoría grid ("Todas" first, "← Cambiar categoría") |
| Wallet → "Billeteras" / name / "2 billeteras" | Por categoría | Wallet chips ("Todas" or a subset) |
| Calendar → "Mensual" / "1 sep – 20 sep" | both | "Mensual" / "Rango personalizado" + Desde/Hasta |

### Por categoría (existing model)
- Name optional (defaults to the category name), category + subcategory ("Todas" = whole category), **"Billeteras"** ("Todas" or a subset), period, amount.
- Expenses count automatically when their category is inside the scope and their wallet is in the budget's wallet set.
- In Nuevo movimiento, the read-only budget line shows which budget the expense will count toward and the projected %. No second category picker.

### Personalizado (new)
- Name required, icon suggested from the name, period ("Mensual" or "Rango personalizado"), amount.
- Movements are assigned manually: Nuevo movimiento › "Presupuesto" icon › list of custom budgets (radio). An expense can count toward one category budget (automatic) and one custom budget (manual).
- Card subtitle: "Personalizado · 3 movimientos asignados".
- Model: `Budget.kind CATEGORY|CUSTOM`, `Budget.icon`, `Budget.walletIds[]`; `Transaction.customBudgetId`.

Status thresholds unchanged: healthy < 65 %, watch 65–89 %, at risk ≥ 90 %, exceeded > 100 %.

## 5. Deletion

Budgets, goals and loans use the two-step confirmation from `NEW_MOVEMENT.md` §9. For goals, step 2 is the existing sheet that asks where the saved money returns.
