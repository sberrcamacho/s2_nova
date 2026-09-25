# Nuevo movimiento — spec (Android first)

Mockup: `S2 Nova Android v2.dc.html`. Use the "Estado" selector above the phone to jump to each state listed here. Web follows in a later pass with the same model; see §11.

UI copy is Spanish and quoted verbatim.

## 1. Screen structure

Top to bottom. Only the first four items are always visible; everything else is behind an option icon.

1. Type segmented control: "Gasto" · "Ingreso" · "Transferencia".
2. Category row ("CATEGORÍA"). Shows `catLabel(id)`, e.g. "Alimentación · Mercado". Empty state: dashed mark + "Elige una categoría".
3. Amount row ("MONTO") with the currency pill (e.g. "COP ▼") on the right. Below it, a conversion line when the currency differs from the wallet's; a "PROGRAMADO · 1 sep · 08:00" badge when the date is in the future.
4. Wallet chips ("Billetera" / "Billetera que recibe" / "Desde"). Non-principal wallets show their code: "Wise · USD".
5. Budget line (expenses only, read-only): "Suma a Alimentación · Por la categoría · $780.900 de $900.000 con este gasto" + status %. Uses budget thresholds from `PLANS.md`.
6. "Título (opcional)" and "Nota (opcional)" single-line inputs. No title is suggested or prefilled. Display name = title, else note, else the category/subcategory name. Title max 60 characters.
7. Option icons row (5 columns, 48 px targets, label under each). Icon filled/outlined in accent when set; label shows the value:

| Icon | Label (unset → set) | Opens | Types |
|---|---|---|---|
| clock (calendar when future) | "Ahora" → "Hoy 08:15" / "20 ago" / "1 sep" | Fecha y hora sheet | all |
| repeat | "Repetir" → "Semanal ×4" | Repetir sheet | all |
| paperclip | "Adjuntar" → "1 adjunto" | Adjuntar comprobante sheet | all |
| person | "De" → "Andrés Gómez" | ¿De quién? sheet | Ingreso |
| target | "Presupuesto" → budget name | Presupuesto personalizado sheet | Gasto |
| more | "Más" | Más opciones (loan flag, goal contribution) | Gasto, Ingreso |

8. Attachment chip (when set), repeat summary line (when set).
9. Primary button: "Guardar movimiento" / "Programar movimiento" (future date) / "Guardar y repetir" (repeat set). Disabled until category (not for transfers) and amount > 0.

Currency is not in the icon row: the pill next to the amount is the single currency control.

## 2. Progressive flow

1. "+" › "Registrar manualmente" opens the screen with the **category sheet already open** ("¿En qué gastaste?" / "¿De dónde viene el ingreso?", "Paso 1 de 2 · después ingresas el monto").
2. Picking a parent with subcategories opens the subcategory sheet; picking a leaf (or "Ninguna") continues.
3. The **amount pad opens automatically**. "Listo · $168.500" closes it.
4. Wallet is preselected (last used). Everything else is optional. The user can save immediately.
5. Changing the type resets the category and reopens the category sheet. "Transferencia" skips the category and opens the pad if the amount is empty.
6. Tapping the category row or amount row reopens the corresponding sheet; the active row gets a white 1.5 px border.

Target: category + amount + save in 4 taps plus digits.

## 3. Amount pad

Bottom sheet over the form (overlay 45 % so the form stays readable).

- Header: context ("Monto · Alimentación · Mercado") and a two-segment mode switch with icons: "Teclado" | "Calculadora". The active segment is filled accent; this is the mode indicator.
- Display: expression line (only when there are operators: "150.000 + 18.500 =") and the live result with the currency code.
- Keypad mode (3×4, 56 px keys): `1-9`, `,`, `0`, `⌫`.
- Calculator mode (4×5, 50 px keys): `C ⌫ ÷ ×`, `7 8 9 −`, `4 5 6 +`, `1 2 3 =` (`=` spans two rows), `00 0 ,`. Operators use accent-tinted keys.
- Switching modes never clears the expression. In keypad mode an existing expression still evaluates.
- **Default mode = last used** (persist `padMode` as a local preference per device).
- Rules: max 12 digits per operand; one decimal separator per operand (`,`); a second operator replaces the first; `÷ 0` is ignored; results are rounded to 2 decimals and clamped at ≥ 0; "Listo" commits the evaluated result.
- Decimal places displayed follow the currency (COP 0 unless typed, USD/EUR 2).

## 4. Fecha y hora

- Initialized to now (`date`, `time`). The option label reads "Ahora" and is visually neutral until changed.
- Sheet: shortcuts "Ahora", "Ayer", "Anteayer", "Como el anterior · 19 ago, 12:30" (the last manually chosen date/time, stored locally); "Programar a futuro": "Mañana", "En una semana", "1 de septiembre" (next 1st); month calendar; "Hora" time field; context note; "Listo".
- Past date: saved as COMPLETED with that date.
- Future date: saved as **PLANNED** ("Programado"). Same transaction object, not a separate entity. It does not affect balances until the date arrives and the user confirms (same rule as Programados). Visual distinction everywhere: amber "PROGRAMADO" badge in the form, a "PROGRAMADOS" group at the top of Movimientos with muted amounts, "Programado · 1 sep · Bancolombia" subtitle, amber status pill in the detail.

## 5. Repetir

- Frequencies: "No se repite", "Diario", "Semanal", "Mensual", "Anual".
- "Termina": "Después de" N (stepper −/+), "En una fecha" (date), "Sin fin".
- "Empieza": the movement date (tapping opens Fecha y hora and returns to Repetir).
- "En cada fecha": "Pedirme confirmación" (default; creates a PLANNED occurrence and notifies) or "Registrar automáticamente" (creates COMPLETED and notifies).
- Summary line, e.g. "Cada semana × 4 · del 21 ago al 11 sep".
- Backend: extends `RecurringSeries` with `DAILY`, `occurrences` / `endDate`, and `autoConfirm`. The existing "Quincenal" mismatch stays open.

## 6. Moneda

- Default: the selected wallet's currency. The pill shows the code.
- Sheet lists the user's currencies (Ajustes › Monedas) with "1 USD = $3.950 COP". Choosing the wallet currency clears the override.
- When different from the wallet: the form shows "≈ $23.660,5 COP en Bancolombia · 1 USD = $3.950". The movement stores `amount` + `currency` (original) + `fxRate` + `walletAmount`. The wallet balance moves by `walletAmount`.
- Link: "Gestionar monedas en Ajustes →" (returns to the sheet).

## 7. Adjuntar comprobante

- Sheet: "Tomar foto" (camera), "Elegir de la galería", "Subir PDF o documento" ("PDF, JPG o PNG · hasta 10 MB").
- Form shows one compact chip (icon, name, size, ✕). One attachment per movement in MVP.
- Detail screen: "Comprobante" card with thumbnail, name, "Foto · 1,2 MB · agregado el 21 ago", actions "Ver" (full-screen viewer with "Compartir" / "Descargar"), "Reemplazar", "Quitar" (undo snackbar). Without an attachment: dashed "Adjuntar recibo o factura".
- Backend: new `Attachment { id, transactionId, kind: IMAGE|PDF, mime, size, url }`, upload via signed URL. Web shows and downloads; Web upload uses a file picker (no camera).

## 8. De (income only)

- Optional free text (max 40) + optional source type: "Empleador", "Cliente", "Familia", "Amigo", "Otro". "Recientes" chips from previous income.
- Stored as `counterpartyName` + `counterpartyKind` on the transaction (reuses the loan field name). Shown in lists ("Andrés Gómez · Wise") and detail ("De").

## 9. Deletion with double confirmation

Shared bottom sheet, z-index above any other sheet.

- **Step 1** — trash icon on `--neg-soft`, "Eliminar “<name>”", "SE VA A ELIMINAR" list of concrete consequences (amount/date/wallet, attachment, future repetitions, recalculated balances), outlined red "Continuar", "Cancelar".
- **Step 2** — warning icon, "No se puede deshacer", checkbox with an explicit statement ("Entiendo que el movimiento y su comprobante se eliminan para siempre."), solid red CTA enabled only after the checkbox, "Volver".
- Applies to: budgets, goals (step 2 is the existing "where does the money go" sheet), wallets (also lists linked movements; the last wallet cannot be deleted), Programados series, loans, custom categories, currencies, and **significant movements**: amount ≥ $200.000 in principal currency, or with an attachment, or with repetition.
- Other movements delete immediately with a "Movimiento eliminado · Deshacer" snackbar (4.5 s).

## 10. Movement detail

Header "Movimiento". Hero card: category mark (56 px), `catLabel`, signed amount in original currency, conversion line when foreign, status pill ("Registrado" / "Programado · no afecta el saldo todavía"). Rows: Descripción, Fecha y hora, Billetera (with currency), De, Comercio, Presupuesto (auto budget + %), Se repite. Then Comprobante, then "Eliminar movimiento".

## 11. Web

Implemented in `S2 Nova Dashboard v2.dc.html`. See [`WEB_PARITY.md`](WEB_PARITY.md) for the platform mapping.

## 12. Data model changes (summary)

| Field | Where | Notes |
|---|---|---|
| `occurredAt` (datetime) | Transaction | Replaces date-only; default now |
| `status` PLANNED when `occurredAt` > now | Transaction | Existing enum |
| `currency`, `fxRate`, `walletAmount` | Transaction | Original currency kept |
| `counterpartyKind` | Transaction | Income "De" |
| `customBudgetId` | Transaction | Optional, see PLANS.md |
| `Attachment` | new table | 1 per transaction in MVP |
| `DAILY`, `occurrences`, `endDate`, `autoConfirm` | RecurringSeries | |
| `title`, `note` | Transaction | Both optional; title is never suggested. Display falls back to note, then category name |
