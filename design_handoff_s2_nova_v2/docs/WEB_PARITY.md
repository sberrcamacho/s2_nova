# Web ↔ Android parity (Sep 2026 pass)

Mockups: `S2 Nova Dashboard v2.dc.html` (Web) and `S2 Nova Android v2.dc.html` (Android). Both use the same data (`TX_SEED`, wallets incl. "Wise — Dólares" in USD, budgets incl. custom ones, goals with plan icons and periodic contributions, currencies) and the same helpers (`PLAN_ICONS`, `evalExpr`, `repeatSummary`, `fmtCur`, taxonomy from `s2-categories.js`). Use the "Estado" selector (bottom-left on Web, above the phone on Android) to jump to each state.

Rule: every capability exists on both platforms with the same fields, copy, validation and data. Web adds depth only in Reportes (comparisons, more views, CSV) and uses desktop patterns (side panel, modals, inline sections instead of bottom sheets).

| Capability | Android | Web |
|---|---|---|
| Nuevo movimiento flow | Screen; category sheet opens first, then the amount pad | Side panel opens on the full form with the amount field focused; the "Categoría" row ("Elige una categoría") opens the category grid inline. Category is still required to save |
| Amount input | Pad sheet with "Teclado" / "Calculadora" switch, last mode remembered | Typed arithmetic in the field (`150000+18500`, `*` `/` `-` are mapped) + "Teclado"/"Calculadora" toggle that shows the same 4×5 key grid |
| Título / Nota | Two optional fields | Same |
| Option icons | 5 icon tiles → bottom sheets | Same tiles → one inline section inside the panel ("Listo" closes it) |
| Fecha y hora, programar a futuro | Shortcuts + calendar + time | Shortcuts + date + time inputs; same future/PLANNED rules |
| Repetir | Frequency, "Termina" (stepper / date / sin fin), start, confirmation | Same |
| Moneda | Pill next to amount → sheet | Pill next to amount → inline section |
| Adjuntar | Camera, gallery, PDF | Image upload, PDF upload, drag-and-drop zone (no camera) |
| De (ingresos) | Sheet | Inline section |
| Presupuesto (automatic line + custom pick) | Yes | Yes |
| Movimientos list | "PROGRAMADOS" group + days | Same groups, "Programado" badge, clip/repeat icons, filter "Programados", category select, search |
| Movement detail + receipt | Screen + viewer | Modal + viewer, adds "Descargar" |
| Two-step deletion | Bottom sheet | Centered dialog (same copy and rules) |
| Undo for minor deletions | Snackbar | Toast with "Deshacer" |
| Budgets (Por categoría / Personalizado) | Sheet: name mark opens category, icon tiles for Categoría / Billeteras / Periodo | Modal: same fields; tiles open inline sections |
| Goals + periodic contribution | Sheet + nested sheet | Modal + inline "Aporte periódico" section |
| One-off goal contribution ("Abonar") | Button on card → sheet (monto, billetera) | Button on card → modal (same fields) |
| Goal contribution alerts | Notification with "Confirmar aporte" / "Omitir esta vez" | Alert card on Inicio with the same actions |
| Billeteras with currency | Screen + sheet | "Billeteras" page in the sidebar + modal |
| Ajustes › Categorías (edit, hide, delete custom) | Screen + sheet | Page with list + side form |
| Ajustes › Monedas | Screen | Page |
| Guest login | "Continuar como invitado" | Same, plus banner in the app |
| First run (moneda + primera billetera) | 2-step screen | 2-step centered card |
| Mini-guides | Card above the bottom bar | Card bottom-right; Reportes guide mentions the extra Web depth |
| Bottom bar (notched FAB) | Yes | Not applicable ("Nuevo movimiento" button in the header) |

Removed on Web: the COP/USD "Moneda" switch in Ajustes (replaced by Monedas) and the goal category tab in Categorías.

Known gaps kept for a later pass: Web Reportes still aggregates from the static `MONTH_SPEND` ledger (same as Android); Programados management page on Web is still the Home "Próximos" list.
