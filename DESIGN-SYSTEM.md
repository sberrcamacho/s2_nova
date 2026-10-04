# S2 Nova Design System

The visual source of truth for both S2 Nova clients: Android (Jetpack Compose)
and Web (React + Tailwind v4). It replaces the retired v2 mockups. The
reasoning behind each decision (the problems found, the contrast
measurements and the styles considered) is in `DESIGN_AUDIT.md`; this file is
the spec to implement.

Built with the UI/UX Pro Max skill: style catalog (`bento-box-grid`,
`flat-design`, `minimalism-swiss`), product profile "Personal Finance
Tracker", stack guidelines for `jetpack-compose` and `html-tailwind`, chart
and UX rule sets. The skill's generic fintech palette (gold/amber) was **not**
used: the brand palette is fixed by the S2 Nova logo.

**Status:** v2.0 · 2026-10-04 · "Brand-signature minimalism": the brand is a restrained signature (one solid primary, the gradient only on the balance hero), neutral surfaces with an indigo undertone, tonal category marks, Inter, a calmer radius scale, and sheets that never scroll (§6.11). Implemented on both clients. Earlier F0–F4 work (tokens, type roles, bento Inicio, Nuevo movimiento, the main screens) still applies where this version doesn't change it.

---

## 1. Principles

1. **The number is the product.** Amounts are the most important thing on
   every screen. They never wrap, never lose their sign, always align, and
   always meet contrast.
2. **The brand is a signature, not a wash.** One solid violet from the mark
   means "tap here" or "selected"; the mark's gradient appears only on the
   balance hero and the logo. Surfaces are neutral with a faint indigo
   undertone: neither plain grey nor lilac. Income, expense and status use
   their own semantic colors. The goal is a professional finance product:
   not generic, and not a rainbow.
3. **Summaries are bento, details are flat.** Inicio and Reportes use modular
   tiles; lists, forms and settings use plain surfaces with dividers.
4. **One product, two clients.** Same tokens, same names, same component
   behavior on Android and Web. Differences are layout density, never
   meaning.
5. **Accessible by default.** WCAG 2.2 AA is the floor, not a later pass.
6. **Sheets and dialogs never scroll.** A choice never adds content under
   itself; dependent options open on their own page (§6.11).

---

## 2. Color

All ratios below are WCAG 2.x contrast ratios, computed with the formula in
`DESIGN_AUDIT.md` Appendix B.

### 2.1 Brand primitives (fixed — sampled from the logo)

Sampled from `web/src/assets/logo-mark-light.png` / `logo-mark-dark.png`
(identical to `android/.../drawable-nodpi/logo_mark_*.png`). Do not change
these values and do not recolor the logo.

| Primitive | Hex | Where in the mark |
|---|---|---|
| `brand.lilac` | `#D485FB` | light mark, highlight |
| `brand.violet400` | `#B859FB` | light mark, upper body |
| `brand.violet500` | `#9A39F9` | light mark, mid |
| `brand.violet600` | `#6622D6` | light mark, shadow |
| `brand.indigo` | `#5712C2` | light mark, base |
| `brand.electric` | `#A80FFA` | dark mark, start |
| `brand.blue` | `#0047F5` | dark mark, mid |
| `brand.cyan` | `#00C4FB` | dark mark, end |

Brand gradients:

- `gradient.brandLight`: `#D485FB → #9A39F9 → #6622D6 → #5712C2`
- `gradient.brandDark`: `#A80FFA → #0047F5 → #00C4FB`

### 2.2 Semantic tokens

The same token name is used on both platforms (see §10 for the spelling in each).

#### Surfaces and text

| Token | Light | Dark | Notes |
|---|---|---|---|
| `bg` | `#F6F6F9` | `#0C0B14` | Screen background (cool off-white / deep indigo ink) |
| `surface` | `#FFFFFF` | `#15131F` | Cards, rows, sheets |
| `surface-raised` | `#FFFFFF` | `#1C1A28` | Menus, dialogs |
| `surface-sunken` | `#F0EFF5` | `#1F1D2C` | Input fill, mark tiles, track of progress bars |
| `text` | `#15131F` | `#EEEDF5` | Primary text and amounts |
| `text-secondary` | `#5C5870` (6.81) | `#A8A3BD` (7.55) | Labels, supporting text |
| `text-tertiary` | `#686480` (5.6; 5.2 on `bg`) | `#928DA8` (5.7) | Metadata, timestamps. Must stay ≥ 4.5:1 |
| `text-disabled` | `#A0A0AE` | `#5A5A6E` | Disabled text only; exempt from contrast, always paired with a disabled semantic |
| `border` | `#E4E2EC` | `#2A2738` | Decorative separation between surfaces |
| `border-input` | `#8F8AA3` (3.32) | `#6C6785` (3.42) | Input, checkbox, radio and outline-button boundaries (≥ 3:1) |
| `divider` | `#EFEEF4` | `#1F1D2B` | Row dividers inside a card |
| `scrim` | `#111118` at 40 % | `#000000` at 60 % | Behind dialogs and sheets |

#### Brand-derived (action and selection)

| Token | Light | Dark | Ratios |
|---|---|---|---|
| `primary` | `#5712C2` | `#6622D6` | white on it 9.25 / 7.60 |
| `primary-pressed` | `#460E9E` | `#5712C2` | — |
| `on-primary` | `#FFFFFF` | `#FFFFFF` | — |
| `primary-soft` | `#F1EAFC` | `#241A3D` | selected chip/row fill, active nav |
| `on-primary-soft` | `#5712C2` (7.89) | `#C29BFF` (7.31) | text on `primary-soft` |
| `link` | `#5712C2` (9.25) | `#C29BFF` (8.23) | "Ver todos", inline links |
| `primary-border` | `#5712C2` | `#A77BFF` (6.0) | selected boundaries, radio dots, focus |
| `accent` | `#0047F5` (6.52) | `#00C4FB` (9.42) | rare secondary emphasis; the cyan hairline on the hero's current bar |
| `focus-ring` | `#5712C2` | `#A77BFF` | 2 px ring + 2 px offset, ≥ 3:1 on every surface |

Brand usage rules:

- `brand.cyan` on a light surface is 2.04:1. **Never** use it as text or an
  icon in light theme. Use it as a fill only with `text` (`#0E0E15`) on top
  (9.42).
- `brand.blue` on a dark surface is 2.95:1, so in dark theme `accent`
  switches to cyan.
- `brand.electric` on a dark surface is 3.77:1. In dark theme use it only for
  fills, gradients and 3:1 boundaries, never for text.
- The brand never encodes money: income and expense are never violet or cyan.

#### Financial semantics

| Token | Light | Dark | Soft fill (L / D) | Text on soft (L / D) |
|---|---|---|---|---|
| `positive` (income, on-track) | `#0E7A55` (5.34) | `#3FD08E` (9.28) | `#E7F2ED` / `#132825` | 4.69 / 7.26 |
| `negative` (expense, over budget) | `#C02B45` (5.72) | `#FF7085` (6.91) | `#F9EBEA` / `#301A20` | 4.75 / 5.54 |
| `warning` (near limit, due today) | `#8F5A00` (5.78) | `#F0B429` (10.31) | `#F4EEE6` / `#2E2518` | 5.02 / 8.08 |
| `info` | = `accent` | = `accent` | `primary-soft` | — |

Color is **never the only signal** (§7.2):

- Income always shows `+`, expense shows `−` (U+2212).
- A variation shows an arrow ↑/↓.
- A budget state shows an icon (✓ / ⚠ / !).

Whether a variation is good or bad decides its color, not its sign. For
example, "−5 %" on Gastos is `positive`.

#### Hero card

| Token | Light | Dark |
|---|---|---|
| `hero-bg` | linear 135°: `#2A0B66` → `#4512A3` 58 % → `#5712C2` | linear 135°: `#1B0E4A` → `#2B1A8F` 55 % → `#0B3FA8` |
| `hero-text` | `#FFFFFF` (≥ 9) | `#FFFFFF` (≥ 8) |
| `hero-text-secondary` | `#FFFFFF` at 82–88 % (≥ 6) | same (≥ 5.5) |
| `hero-positive` / `hero-negative` | `#FFFFFF` + sign and arrow (no green/red on violet) | `#5FF0B0` / `#FFB4B4` |
| `hero-tile` | `#FFFFFF` at 12 % | `#FFFFFF` at 10 % |

The hero is the only element that uses the brand gradient: no auroras, no
glows, a 1 px white top highlight and a hairline border. Form amount fields
(Nuevo movimiento, the plan sheets) are neutral `surface` fields with the
`border-input` boundary, not hero surfaces.

Primary as text: `#6622D6` is only 2.5:1 on the dark surfaces, so in dark
theme text and icons use `link`, and selected boundaries, radio dots and tab
indicators use `primary-border` (`#5712C2` light / `#A77BFF` dark).

Category and plan marks are tonal: the glyph in its category color mixed
28 % toward the ink (light) or 30 % toward white (dark), on a neutral
`surface-sunken` tile with 28 % corner radius. The tile is never tinted per
category; categories are told apart by glyph and label.
On the inverted toast the action uses the opposite theme's `link`
(`accent-inverse`).

### 2.3 Data visualization

- **Income vs expense:** use `positive` and `negative`, always with a legend
  and direct labels.
- **Series** (non-financial comparisons, max 4):

  | | Light | Dark |
  |---|---|---|
  | Series 1 | `#6622D6` | `#B859FB` |
  | Series 2 | `#0047F5` | `#00C4FB` |
  | Series 3 | `#8F5A00` | `#F0B429` |
  | Series 4 | `#666673` | `#A8A8B8` |

- **Categories:** use the taxonomy's own category colors
  (`lib/taxonomy.json` / Android taxonomy), unchanged.
- **Gridlines:** `divider`. **Axis labels:** `text-tertiary`, 12.
- **Chart types** (UI/UX Pro Max `chart` domain):
  - Trend over time: line or area; bars when there are fewer than 4 points or for monthly totals.
  - Income vs expense per month: grouped bar.
  - Share by category: horizontal bars. Use a donut only with 5 or fewer categories.
  - Budget or goal vs target: bullet bar or ring.
- **Every chart has:**
  - a value axis with units;
  - a tooltip on hover, focus and tap;
  - a one-sentence text summary for screen readers;
  - a table alternative on Web;
  - an empty state and a skeleton while loading.
- **As built (F4):** Web's `components/v2/BarChart.tsx` (value axis with
  compact units such as "$6 M" / "$850 mil", a "nice" top of 1–8 × 10ⁿ,
  `divider` gridlines, each month a focusable button with a tooltip, a
  screen-reader summary and a "Ver como tabla" table) is used by every
  Reportes chart; Android's `BarsCard` draws the same axis and gridlines
  and shows the tapped month in a readout above the plot.

---

## 3. Typography

**One family: Inter** (variable, OFL). Android bundles
`android/app/src/main/res/font/inter_variable.ttf`; Web loads it from Google
Fonts (400–700). Inter's large x-height reads well at these sizes, and it
ships the `tnum` feature, so no second numeric font is needed. It replaced
Outfit (2026-10) for legibility and a more professional tone.

**Every amount, percentage, date number and table figure uses tabular
figures:**

- Compose: `fontFeatureSettings = "tnum"`
- CSS: `font-variant-numeric: tabular-nums`

| Role | Android (sp) | Web (px) | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|---|
| `display` | 36 | 40 | 600 | 1.1 | −2.5 % | Hero balance |
| `display-sm` | 28 | 32 | 600 | 1.15 | −2 % | Amount in Nuevo movimiento, detail amount |
| `headline` | 24 | 28 | 600 | 1.2 | −1.5 % | Screen title |
| `title` | 18 | 20 | 600 | 1.3 | 0 | Card/section title, dialog title |
| `title-sm` | 16 | 16 | 600 | 1.35 | 0 | Row title, stat value on mobile |
| `amount` | 16 | 16 | 600 | 1.3 | 0 | Row amounts (tnum) |
| `body` | 16 | 16 | 400 | 1.5 | 0 | Paragraphs, inputs |
| `body-sm` | 14 | 15 | 400 | 1.45 | 0 | Secondary text, metadata, buttons on Web |
| `label` | 14 | 14 | 600 | 1.3 | 0 | Buttons, chips, tabs |
| `overline` | 12 | 13 | 600 | 1.3 | +5 %, uppercase | Section headers ("HOY · −$189.500"), stat labels |
| `caption` | 12 | 13 | 400 | 1.45 | 0 | Axis labels, helper text |

The scale is per platform on purpose: a phone held at reading distance takes
smaller headings (a 28 sp screen title crowds a 360 dp screen), while a desktop
viewed from further away needs larger secondary text (12 px captions and 14 px
secondary lines read as small on a monitor). Body, titles of rows and labels
stay equal on both so the clients still feel like one product.

Rules:

- 12 is the absolute minimum. Nothing below it.
- Weights stop at 600 (SemiBold); 700+ reads heavy in Inter and is not used
  in the UI.
- Text styles come from the theme (`MaterialTheme.typography` / the CSS
  classes), never from ad-hoc `fontSize` or `text-[Npx]`. Sizes such as
  12.5, 13, 13.5, 15 or 17 are not part of the scale.
- Layouts must survive Android font scale 200 % and Web zoom 200 % without
  clipping or overlap.
- Line height is always explicit in the style, never `normal`, so wrapping
  never overlaps neighbours.

---

## 4. Spacing, shape, elevation, motion

### 4.1 Spacing (4/8 grid)

| Token | Value | Use |
|---|---|---|
| `space-1` | 4 | icon-to-text gap |
| `space-2` | 8 | gap between chips and touch targets (minimum) |
| `space-3` | 12 | bento gap (mobile), row internal gap |
| `space-4` | 16 | card padding (mobile), screen gutter (mobile), bento gap (web) |
| `space-5` | 20 | card padding (web) |
| `space-6` | 24 | section gap, web gutter |
| `space-8` | 32 | web page padding |
| `space-12` | 48 | page top spacing on web |

### 4.2 Radius

| Token | Value | Use |
|---|---|---|
| `radius-xs` | 6 | badges, small tags |
| `radius-sm` | 8–10 | chips (10), currency pills (8) |
| `radius-md` | 12 | buttons, inputs, option groups, icon tiles |
| `radius-lg` | 16 | cards, hero, amount fields |
| `radius-sheet` | 24 | bottom sheets (top corners); dialogs 18–20 |
| `radius-full` | 999 | FAB, avatar, switches, dots, progress bars |

Buttons and chips are rounded rectangles, not pills.

### 4.3 Elevation (two levels only)

| Level | Light | Dark | Use |
|---|---|---|---|
| 0 | none, 1 px `border` | none, 1 px `border` | all cards, rows, tiles |
| 1 | `0 8px 24px rgba(17,17,24,0.08)` | `0 8px 24px rgba(0,0,0,0.5)` | hero, sheets, dialogs, menus, bottom bar |
| FAB | a soft 6 dp shadow tinted `primary` | none | the central "+" only |

### 4.4 Motion

| Token | Value | Use |
|---|---|---|
| `motion-fast` | 150 ms, standard decelerate | press, toggle, chip select, hover |
| `motion-base` | 250 ms, emphasized decelerate | sheets, dialogs, panel slide, route change |
| `motion-exit` | ≈ 65 % of the enter duration | dismissals |
| `motion-value` | 450 ms, emphasized decelerate | a total counting to its new value, a progress bar filling |

Rules:

- Motion explains a change; nothing loops or bounces for decoration, and a
  view animates at most one or two things at once.
- Route change (Android): a fade-through (the old screen is gone in 90 ms)
  while the new one slides a tenth of the width in. Between bottom-bar tabs
  it comes from the side of the tab's position in the bar; deeper screens
  come from the right and back reverses it. Web pages rise 6 px and fade; dialogs grow from 0.97,
  the side panel slides 32 px in from its edge.
- Press: cards, primary buttons and the FAB scale to 0.97–0.98 (FAB 0.92)
  while held.
- Lists: a row added or removed fades and the others glide into place; the
  first load shows at once.
- The balance total counts from the value last shown to the new one; the
  first value of a session just appears.
- Animate transform and opacity only.
- Animations are interruptible.
- Honour `prefers-reduced-motion` and Android's animator scale: under reduced
  motion, cross-fade instead of slide and drop the FAB pulse.

### 4.5 Z-index (Web)

| Layer | z-index |
|---|---|
| base | 0 |
| sticky header | 10 |
| sidebar | 20 |
| side panel | 40 |
| dialog | 50 |
| toast | 60 |

---

## 5. Layout

### 5.1 Android

- 412 dp reference width, 16 dp gutters.
- Content respects `WindowInsets.systemBars`. The last list item has bottom
  padding of bottom-bar height + 24 dp so the FAB never covers it.
- **Bento (Inicio, Reportes):** 2 columns, 12 dp gap. Tile sizes are 2×1
  (full width) and 1×1. Tiles in a row share their height.
- **Flat (Movimientos, Planes, Ajustes, forms):** full-width `surface` cards
  with 16 dp padding and `divider` between rows.
- **Movimientos search and filters:** under the title, a 48 dp search field
  (leading search icon, clear button once there is text) next to a 48 dp
  Filtros button. With filters on, the button fills with `primary` and shows
  their count. Filtros opens a sheet: Tipo as single-choice chips, and
  Categoría as a field that opens a list of check rows (category mark + name,
  grouped under Gastos / Ingresos) where several can be selected.
- **Bottom bar:**
  - Inicio · Movimientos · [+] · Planes · Reportes.
  - Flat, on `surface` with a hairline `outline` on top and a smooth concave
    notch in the middle that cradles the FAB with a 10 dp gap around it. The
    bar does not rise towards the FAB.
  - Icon (26) + label (12, `label` weight), no pill; the active item uses the
    accent ink on the icon and `on-surface` bold on the label.
  - The central + is a 56 dp round FAB in `primary` with the FAB glow, its
    centre on the bar's top edge. Below 340 dp wide the FAB shrinks to 48 dp
    and the notch with it; a label that still does not fit is ellipsized.

### 5.2 Web

- Layout: sidebar of 248 px (full viewport height, `surface`, right `border`)
  + content area.
- Sticky 64 px top bar holding search, the period selector and the primary
  "Nuevo movimiento" button.
- Content max width 1280 px, padding `space-8`.
- **Bento grid:** 12 columns, 16 px gap.

  | Viewport | Columns |
  |---|---|
  | ≥ 1280 | 12 |
  | 1024–1279 | 8 (tiles reflow) |
  | 768–1023 | 4 |
  | < 768 | 1 |

  No dead space: every row's tiles fill the 12 columns.

  As built (F2), the Inicio grid follows the **content width** (a CSS
  container query), not the viewport, because the sidebar takes 248 px: 12
  columns from 1024 px of content, 2 columns from 640 px, and 1 column below.
  Card headers let their link drop under the title on narrow cards.
- **Side panel:** 460 px on the right, `surface-raised`, elevation 1, scrim
  over the content. Used for Nuevo movimiento and row detail.
- **Sidebar:**
  - The logo tile at the top.
  - Nav items (40 px tall, `radius-md`, icon 20 + `label`); active =
    `primary-soft` fill + `on-primary-soft` text.
  - Footer: Billeteras · Ajustes, then the user card (avatar 32 + name on
    one line, truncated).

### 5.3 Reference screen compositions

Inicio (Android), top to bottom:

1. Header: logo, "Hola, Mariana", bell, avatar.
2. Hero, 2×1.
3. Ingresos mes / Gastos mes, 1×1 + 1×1.
4. Alert card, 2×1, with an inline action.
5. Presupuestos (top 3) / Próximo pago, 1×1 + 1×1.
6. Movimientos recientes: a flat list, 5 rows + "Ver todos".

Inicio (Web, 12 columns):

| Row | Tiles |
|---|---|
| 1 | Hero (8) · Ingresos / Gastos / Ahorro stacked (4) |
| 2 | Alertas (4) · Presupuestos (4) · Metas (4) |
| 3 | Movimientos recientes table (8) · Próximos 14 días with running balance (4) |

Nuevo movimiento (both, progressive disclosure):

1. Type segmented.
2. Amount (`display-sm`) + currency.
3. Category row.
4. Wallet chips.
5. Budget impact line.
6. A labeled Título field (required, so it stays on the first level).
7. A collapsed "Más opciones" section: one full-width row per option with
   its current value (Fecha y hora, Repetir, Adjuntar, De on income or
   Presupuesto on expenses, Préstamo o meta), then the Nota field. Its
   header summarises what is set, and it starts open when editing a
   movement that has an option set.
8. The "Guardar movimiento" button, fixed at the bottom.

---

## 6. Components

Each component is specified once and implemented on both clients with the
same name. Touch-target sizes are the **interactive area**. The visual size
can be smaller; in that case expand the hit area with
`Modifier.minimumInteractiveComponentSize()` or padding on Android, and
padding or a pseudo-element on Web.

### 6.1 AmountText

- The sign, currency symbol and figure form one unbreakable unit: `maxLines = 1, softWrap = false` / `white-space: nowrap`.
  - Sign: `−` (U+2212) or `+`, followed by a narrow no-break space when a symbol follows.
- Tabular figures, always.
- Format by currency and locale:
  - COP: `$1.927.100`, no decimals.
  - USD: `US$5,99`.
  - A foreign amount shows a secondary line in the principal currency, `≈ $23.660` in `text-tertiary`.
- Color follows the transaction type: `positive` for income, `negative` for
  expenses, `text` for transfers (no sign). The color always goes with the
  sign. Sizes: `amount` in rows, `title` in tiles, `display` in the hero.
- **Hidden mode** (the shared `blurBalance` preference):
  - The current blur (with the Web hover reveal) stays.
  - The accessible name becomes "Saldo oculto", and screen readers never announce the figure.
  - An eye `IconButton` next to the hero balance toggles it, announcing its pressed state.
  - "Toca para mostrar" is no longer the only cue.

### 6.2 ListRow (transaction, programado, budget line)

```
[icon 40] Title (title-sm, 1 line, ellipsis)          −$168.500 (amount)
          meta (body-sm, text-tertiary, 1 line)          ≈ $23.660 (caption)
```

- Minimum height 64 dp / 56 px. Padding 12 vertical, 16 horizontal.
- Column widths:
  - The amount column is **intrinsic width** and never shrinks.
  - The title column takes the rest (`weight(1f)` / `min-width: 0`) and truncates.
- Trailing badges (attachment, repeat) sit in the meta line, not next to the title.
- The whole row is one touch target. It is announced as "Mercado semanal, Éxito, Bancolombia, gasto 168.500 pesos".
- Pending or programado rows show a `warning` clock icon at the start of the meta line, and their accessible name includes "Programado". In Movimientos they already sit under the `warning` "Programados" heading; a full tag crowded the meta line out at 360 dp / 130 % (F4).

### 6.3 Buttons

| Variant | Fill | Text | Border | Height (Android / Web) |
|---|---|---|---|---|
| Primary | `primary` | `on-primary` | — | 52 / 44 |
| Secondary | `surface` | `text` | 1 px `border-input` | 52 / 44 |
| Tonal | `primary-soft` | `on-primary-soft` | — | 48 / 40 |
| Ghost / text | transparent | `link` | — | 48 / 36 (hit area 48 / 32) |
| Destructive | `negative` | `#FFFFFF` | — | 52 / 44 |

- Shape: `radius-md`. Text: `label`, one line, never wraps.
- States:

  | State | Treatment |
  |---|---|
  | Pressed | `primary-pressed`, or an 8 % `text` overlay |
  | Focus | `focus-ring` |
  | Disabled | 38 % opacity + disabled semantics |
  | Loading | spinner replaces the label, width is kept, input is blocked |

- One primary button per screen.
- Destructive actions are separated from the primary action by at least 16 dp.

### 6.4 IconButton

- Visual container 40 dp (Android) / 32 px (Web).
- Interactive area 48 dp / 32 px.
- Icon 24 / 20.
- `contentDescription` / `aria-label` is mandatory, and toggles expose their state.
- Examples: bell (with an unread dot plus "3 alertas sin leer" in its label), avatar, close, edit, eye.

### 6.5 Chip and Segmented control

- **Chip** (filters, wallet picker):
  - 40 dp tall (48 dp hit area) / 32 px on Web.
  - Padding 16 horizontal, 10 radius, `label` text, one line, never wraps.
  - The collection wraps or scrolls horizontally with a visible edge fade.
  - Unselected: `surface` + 1 px `border-input` + `text`.
  - Selected: `primary` fill + `on-primary` + a leading check icon, so selection is not color alone.
  - As built (F4): Android `V2Pill` (also behind `SheetPill`, the auto-lock options and the type filter in the Movimientos filters sheet) and Web `flatClass` / `chipClass` / `Flat` / `Pills` (the check is the `.chip-on` mask in `index.css`). Single-choice collections expose radio semantics; multi-select ones checkbox (Android) or `aria-pressed` (Web).
- **Segmented** (Gasto | Ingreso | Transferencia, 3M/6M/12M, theme):
  - `surface-sunken` track; the selected segment is `surface` with elevation 1 and weight 600.
  - Height 44 dp / 36 px. It exposes tab or radio semantics.

### 6.6 Inputs

- Visible label above the field (`overline`, `text-secondary`). Never placeholder-only.
- Field:
  - 52 dp / 44 px tall, `surface` fill, 1 px `border-input`, `radius-sm`, `body` text.
  - Focus: 2 px `primary` border + `focus-ring` on Web.
  - Error: 2 px `negative` border + message below (`caption`, `negative`, with an icon), linked with `aria-describedby`.
- Use the right keyboard (email, number, decimal) and autofill hints. Password fields have a show/hide toggle.
- The amount input uses `display-sm` with tnum and a currency pill.

### 6.7 Card and StatTile

- **Card:**
  - `surface`, 1 px `border`, `radius-xl` (Android) / `radius-lg` (Web), padding `space-4` / `space-5`.
  - Title row: `title` + an optional trailing `link` ("Ver todos") on **one line**; the title truncates first.
- **StatTile** (bento 1×1):

  ```
  OVERLINE LABEL
  $4.288.500          (title, tnum)
  ↑ 3 % vs julio      (caption, semantic color + arrow)
  ```

  The accessible label is "Ingresos del mes, 4.288.500 pesos, 3 % más que julio, desfavorable".

### 6.8 BudgetBar / ProgressBar

- Track 8 dp, `surface-sunken`, `radius-full`. The fill color follows the state.
- States. Thresholds come from the backend, never from the client.

  | State | Range | Color | Icon |
  |---|---|---|---|
  | On track | < 80 % | `positive` | ✓ |
  | Near limit | 80–99 % | `warning` | ⚠ |
  | Over budget | ≥ 100 % | `negative` | ! (bar capped at 100 %) |

- Layout: the name (`title-sm`) and the percentage + icon on the first line, the bar, then `$84.800 de $90.000` (`body-sm`, tnum) below. Nothing overlaps the bar.
- It exposes `progressBarRangeInfo` / `role="progressbar"` with `aria-valuenow`, and a text state.
- As built (F4, Planes): both clients keep the display thresholds they already shared with Inicio (positive < 65 %, warning 65–89 %, negative ≥ 90 %) instead of the 80/100 split above; the state note ("Holgado", "Vigílalo", "Cerca del límite", "Superado por …") sits on the line under the bar next to the figures. A list with several cards uses tonal buttons for the per-card action ("Abonar", "Registrar abono"), so the screen keeps one primary button.

### 6.9 HeroCard

- `hero-bg`, `radius-lg`, elevation 1, padding 20.
- Content:
  - Label "Saldo total" (`overline`, `hero-text-secondary`).
  - The eye button on the label's row (40 visual / 48 hit on Android, 32 px on Web, on `hero-tile`).
  - Balance in `display`, stepping down to fit instead of wrapping.
  - "4 billeteras ›" under the balance, as a tonal pill on `hero-tile` (on the label's row the label truncated at 360 dp / 130 %).
  - Web only: the 6-month net trend, pinned to the bottom of the card.
  - The month's income and expenses are **not** in the hero: they are the StatTiles next to it (§5.3).
- Hidden mode follows §6.1.

### 6.10 Alert card

- `surface` with a 4 px leading bar in the semantic color, plus an icon tile of 40 in the soft fill.
- Title (`title-sm`, one line) and body (`body-sm`, up to 2 lines).
- Always an explicit action button ("Confirmar pago") and a close `IconButton` (48 hit area).

### 6.11 Sheets, dialogs, toasts

- **Sheets and dialogs never scroll** (both clients; the user's rule,
  2026-10). At 100 % font scale on a 360×740 dp phone (and in a desktop
  dialog) the whole content and the primary button are visible at once:
  - A choice never adds content under itself. Options that depend on a
    choice open on their own page in the same sheet: a step
    (`StepSheet` / `StepModal`) or a drill-in sub-page with a back arrow
    (`StepSubPage`, `SheetPageHeader`; Web `subPage`).
  - Pickers fit one screen: the category grid, wrapping chips, or radio
    rows (`StepChoiceRow`). A single-choice tap advances or closes, with no
    "Continuar".
  - Secondary options with their own sub-choices are 56 dp option rows
    (`StepOptionRow` in a `StepOptionGroup`: icon, label, current value,
    chevron) that open their sub-page: Periodo, Billeteras, Termina, Tipo,
    Moneda. A date is a `DateOptionRow` that opens the date picker.
  - The content keeps a scroll container only as the fallback for a 200 %
    font scale or the open keyboard. An unbounded feed (Notificaciones)
    keeps its list scroll.
- **Bottom sheet (Android):**
  - `surface`, `radius-sheet` top corners, grab handle 32×4.
  - Max 92 % height, `scrim`, swipe-down to dismiss.
  - Primary action fixed at the bottom above the insets.
- **Dialog / side panel (Web):**
  - Dialog: centered, max width 520, radius 18. Step dialogs use the same
    steps and sub-pages as Android.
  - Side panel: 460 px (§5.2).
  - Focus is trapped, Esc closes, and focus returns to the trigger.
- **Destructive confirmation:**
  - Everyday deletes (a movement): one confirmation, then a toast with **"Deshacer"** for 5 s.
  - Bulk or irreversible deletes (a wallet with movements, the account): a two-step confirmation.
- **Toast / Snackbar:**
  - Inverted (`text` fill, `surface` text), `radius-full`, bottom center, above the bottom bar.
  - 4 s, or 5 s with an action.
  - `aria-live="polite"`; never steals focus.

### 6.12 Empty, loading, error states

- **Empty:** icon (48, `text-tertiary`), one line of `title-sm`, one line of `body-sm`, and a primary action ("Registrar tu primer movimiento").
- **Loading:** skeletons with the final shape (rows, tiles, chart frame) instead of spinners for anything over 300 ms. Reserve the space so nothing shifts.
- **Error:** inline where the data belongs, with the cause and a "Reintentar" action.

---

## 7. Accessibility requirements

### 7.1 Contrast and size

| Requirement | Value |
|---|---|
| Normal text | ≥ 4.5:1 |
| Large text (≥ 24 regular / 18.7 bold) | ≥ 3:1 |
| Icons that carry meaning, input boundaries, focus rings | ≥ 3:1 |
| Minimum text size | 12 |
| Android touch target | ≥ 48 × 48 dp, with 8 dp spacing |
| Web pointer target | ≥ 24 × 24 px (32 recommended) |

### 7.2 Meaning and semantics

- **Never color alone:** sign for money, arrow for variation, icon for budget
  and alert state, check for selected chips.
- **Screen readers:**
  - Every icon-only control has a label.
  - Decorative icons beside text are hidden.
  - Amounts are read as words ("gasto de 168.500 pesos"), hidden amounts as "oculto".
  - Charts have a text summary.
- **Web keyboard:**
  - Visible `focus-ring` on everything focusable.
  - Logical tab order and a skip-to-content link.
  - The `N` shortcut for Nuevo movimiento is announced in its tooltip.

### 7.3 Scaling and motion

- Android font scale 200 % and Web zoom 200 %: no clipping or overlap. Rows
  grow in height and the amount stays on one line.
- Reduced motion is honoured (§4.4).

---

## 8. Iconography

- One stroke icon set: 1.75 px stroke at 24, rounded caps and joins, matching
  the logo's rounded geometry.
  - Web: the existing inline stroke paths (`components/v2` stroke icons); Phosphor Regular for any new glyph.
  - Android: the same paths as `ImageVector`s.
- Category and subcategory glyphs stay the taxonomy's own outline paths
  (`CAT_GLYPHS` / `SUB_GLYPHS` on Android, `CategoryMark` on Web). Do not
  replace them with Material icons.
- **Sizes:**

  | Size | Use |
  |---|---|
  | 16 | inline meta |
  | 20 | Web nav and buttons |
  | 24 | Android nav and buttons |
  | 40 | category tile (glyph 20 inside a `radius-md` tile in the category's soft color) |

- No emoji as icons. The logo is always the provided PNG tile
  (`LogoMark`), never redrawn.

---

## 9. Content rules

- UI copy is Spanish with the English dictionary (`translations.ts` /
  Android strings), and the shared vocabulary from `AGENTS.md`.
- Labels are short enough to fit on one line at 200 % scale on a 360 dp
  screen. If a label does not fit, shorten the copy; do not wrap it.
- Dates:
  - Row meta: `21 ago`.
  - Detail: `21 de agosto de 2026 · 09:12`.
  - Group headers: `HOY`, `AYER`, `18 DE AGOSTO`, each followed by the day's total.
- Numbers use locale grouping. Large figures in tiles may abbreviate (`$4,3 M`), always with the full value in the accessible label and tooltip.

---

## 10. Implementation mapping

### 10.1 Token names per platform

| Design token | Web CSS variable (`src/index.css`) | Tailwind utility | Compose (`ui/theme`) |
|---|---|---|---|
| `bg` | `--color-bg` | `bg-bg` | `NovaColors.bg` |
| `surface` / `surface-raised` / `surface-sunken` | `--color-surface`, `--color-surface-raised`, `--color-surface-sunken` | `bg-surface`… | `NovaColors.surface`, `.surfaceRaised`, `.surfaceSunken` |
| `text` / `text-secondary` / `text-tertiary` / `text-disabled` | `--color-text`, `--color-text-secondary`, … | `text-ink`, `text-ink-secondary`, … | `NovaColors.text`, `.textSecondary`, … |
| `border` / `border-input` / `divider` | `--color-border`, `--color-border-input`, `--color-divider` | `border-border`… | `NovaColors.border`, `.borderInput`, `.divider` |
| `primary-border` | `--color-primary-border`, `--v2-accent-line` | `border-primary-border`, `border-v2-accent-line` | `NovaColors.primaryBorder` |
| hero | `--hero-bg`, `--hero-tile`, `--hero-overline`, `--hero-label`, … | `bg-[var(--hero-tile)]` | `Modifier.heroSurface()`, `NovaColors.heroTile`, … |
| `primary`, `primary-pressed`, `on-primary`, `primary-soft`, `on-primary-soft` | `--color-primary`, … | `bg-primary`… | `MaterialTheme.colorScheme.primary`, `.onPrimary`, `.primaryContainer`, `.onPrimaryContainer` + `NovaColors.primaryPressed` |
| `link`, `accent`, `focus-ring` | `--color-link`, `--color-accent`, `--color-focus` | `text-link`… | `NovaColors.link`, `.accent`, `.focus` |
| `positive` / `negative` / `warning` (+ `-soft`) | `--color-positive`, `--color-positive-soft`, … | `text-positive`… | `NovaColors.positive`, `.positiveSoft`, … |
| brand primitives | `--brand-lilac` … `--brand-cyan` (primitives, never used directly in components) | — | `BrandColors.lilac` … `BrandColors.cyan` |
| typography roles | `.type-display`, `.type-title`, … or `text-display` utilities via `@theme` | `text-display`… | `MaterialTheme.typography.displayLarge` … + `NovaType.amount`, `.overline` |

- **Web:**
  - Declare the tokens under `:root` / `[data-theme="dark"]` and register them in `@theme inline` (Tailwind v4 CSS-first theming), so components use `bg-primary`, never `bg-[#6622D6]` or `bg-[var(--…)]`.
  - Set `--font-sans` to Inter only; `.tabular` / the `amount` role adds `font-variant-numeric: tabular-nums`.
- **Web (as of F1):** the screens still use the `v2-*` utilities; their values are
  now the semantic tokens (`v2-accent` = primary, `v2-accent2` = link,
  `v2-accent-line` = primary-border), and `--color-login-*` are aliases of the
  semantic tokens. Renaming the utilities happens screen by screen in F2–F4.
  The type roles exist as `text-caption`, `text-body-sm`, …; every text
  smaller than 12 px became `text-caption`.
- **Android:**
  - `Color.kt` holds `BrandColors` (primitives) and the light/dark semantic palettes.
  - `Theme.kt` maps them onto `ColorScheme` plus `NovaExtraColors` (`LocalNovaExtraColors`).
  - `Type.kt` defines the roles with explicit `lineHeight` and `fontFeatureSettings = "tnum"` on the numeric roles.
  - No hardcoded `Color(0x…)` or `fontSize = …sp` in screens.
  - As of F1, `NovaType` holds the roles (line heights in `em`) and every
    size under 12 sp was raised to 12. A bare `Text()` inherits only the
    font family (`NovaDefaultTextStyle`), because most screens still size
    text ad hoc and a role's line height would stretch it; screens move onto
    the roles as they are redesigned in F2–F4.

### 10.2 Migration from the current tokens

| Current | Becomes |
|---|---|
| `--color-primary` `#6657E8` / `#6C5CE7`, `LightPrimary` / `DarkPrimary` | `primary` `#6622D6` |
| `--color-primary-secondary`, `--color-highlight`, `LightAccentText` / `DarkAccentText` | `link` / `accent` |
| `--color-accent-soft` | `primary-soft` |
| `HeroFrom` / `HeroTo` / `DarkHeroMid`, `--v2-hero-*` | `hero-bg` |
| `--color-text-tertiary` / `TextTertiary` / `TextDim` | `text-tertiary` (new values) |
| `--color-positive` / `negative` / `warning` light | new light values in §2.2 |
| `--color-login-*`, `--v2-*` | removed; the login and v2 screens use the semantic tokens |
| `--font-numeric` | Inter + `tnum` (one family) |

### 10.3 Rollout

The phases follow `DESIGN_AUDIT.md` §4.4:

| Phase | Scope |
|---|---|
| **F0** | Wrapping, amount unit, touch targets, contrast |
| **F1** | Tokens and type from this file |
| **F2** | Bento Inicio |
| **F3** | Nuevo movimiento |
| **F4** | Reportes and the rest |

Each screen goes through the verification loop in `CLAUDE.md` on both
clients and in both themes.

---

## 11. Screen checklist (run before calling a screen done)

- [ ] Only design tokens are used; no raw hex or sp in the screen.
- [ ] No label, chip, tab, button or title wraps or overlaps, including at 200 % scale.
- [ ] Every amount is one unit with its sign, uses tnum and is right-aligned in lists.
- [ ] Text contrast is ≥ 4.5:1 and input borders and icons ≥ 3:1, in light **and** dark.
- [ ] Touch targets are ≥ 48 dp (Android) / ≥ 24 px (Web); gaps are ≥ 8 dp.
- [ ] Meaning never relies on color alone (sign, arrow, icon, check).
- [ ] Icon controls have labels; the reading order matches the visual order.
- [ ] Empty, loading and error states exist.
- [ ] The FAB and sticky bars do not cover content; insets are respected.
- [ ] Reduced motion is respected.
- [ ] Android and Web render the same component the same way.
- [ ] Screenshots were captured before and after, and compared against this spec.
