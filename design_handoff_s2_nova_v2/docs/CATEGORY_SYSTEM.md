# S2 Nova — Unified category system

One hierarchical taxonomy for income and expenses, reused by category budgets, filters, charts and reports.

> **Update (Sep 2026, Android pass):** goals and custom budgets no longer use categories. They use a plan icon (`PLAN_ICONS` in `s2-categories.js`), suggested from the title. Goal taxonomy nodes remain only for migration (`PLAN_ICON_FROM_GOAL`). The Categorías screen shows Gastos and Ingresos only. See [`PLANS.md`](PLANS.md). Every screen, chart, filter and report resolves categories through one registry keyed by stable IDs. Display names are Spanish UI copy and are never stored or compared.

**Source of truth:** [`../s2-categories.js`](../s2-categories.js) — taxonomy (`CAT_NODES`), visual identities (`CAT_VIS`), legacy map (`CAT_LEGACY`) and registry API. The same block is embedded verbatim in `S2 Nova Dashboard v2.dc.html` and `S2 Nova Android v2.dc.html`. Do not copy the taxonomy tables into docs; read them from the file.

## 1. Current state (codebase audit)

- **Transaction categories:** defined four times: `backend/prisma/seed.ts` (12 top-level rows + subcategories via `parentSlug`), `web/src/data/categories.ts`, `android data/mock/MockCategories.kt`, and the `CategoryId` union/enum in `web/src/types` and `android data/model`. Flat sets: 8 expense, 3 income (Salario, Freelance, Obsequio) and a shared "Otros".
- **Budget categories:** `Budget.categoryId` references a top-level `Category` row. Budgets are month-scoped (`"2026-08"`) and cannot target a subcategory or a custom range.
- **Goal categories:** separate enum `backend/src/lib/goalCategories.ts` `GOAL_CATEGORY_IDS` (EMERGENCY, TRAVEL, …), stored in `Goal.themeIcon`. Duplicated in `web/src/lib/planCopy.ts` and `android ui/components/GoalCategory.kt`.
- **Chart categories:** Web `inicio.ts` keeps its own `EXPENSE_CATEGORY_IDS` / `INCOME_CATEGORY_IDS`. Mockups hardcoded chart rows that did not trace back to transactions.
- **Icons and colors:** per platform: `web/src/lib/categoryGlyphs.ts` (`CATEGORY_GLYPHS`, `categoryColor`, `GOAL_MARKS`) and `android ui/components/CategoryIcon.kt`. Goals borrow expense icons, so one icon means two things.
- **Hardcoded names:** Spanish labels in `seed.ts`, `MockCategories.kt`, `Strings.kt`, `translations.ts`, `CategorySuggestion.kt`, tests (`PlanesPage.spec.tsx` looks up "Servicios") and mockup data.
- **Inconsistent names:** "Servicios" mixes utilities, rent and HOA fees. "Suscripciones" is top-level in some places and a subcategory in others. Labels differ ("Café y snacks" vs "Cafés", "Electrónica" vs "Tecnología").
- **Stored values:** backend stores the `Category` UUID; clients bridge to slugs (`backendCategories.ts`, `CategoryRepository.kt`), `slug == CategoryId.name.lowercase()`. Goals store an uppercase `GoalCategoryId` in `themeIcon`. Mockups stored Spanish strings.

## 2. Data model

```js
// Category node
{ id, type, parentId, key, name, vis, color, glyph, custom }
// type:     'expense' | 'income' | 'goal'
// parentId: null for a parent category
// vis:      visual identity key (icon + color)
// custom:   true for user-created nodes
```

ID convention: `<prefix>.<parent>[.<sub>]`, prefix `exp | inc | goal`.

```
exp.food                  parent
exp.food.groceries        subcategory
inc.work.salary
goal.technology.computer
exp.food.u_brunch         custom subcategory
```

The prefix keeps IDs unique when types share a concept (`exp.business` vs `inc.business`) or a leaf name (`exp.housing.maintenance` vs `exp.transportation.maintenance`). IDs never change after release.

### Registry API

| Function | Purpose |
|---|---|
| `catNode(x, type?)` | Resolves an ID or any legacy value to a node. `type` disambiguates "Otros" and goal keys. |
| `catParent(x)` | Parent node (or itself if a parent). |
| `catParents(type)` / `catChildren(id)` | Selector lists. Custom nodes included. |
| `catName` / `catLabel(x)` | Name, or "Parent · Sub" for a leaf. Use `catLabel` in lists, search, detail. |
| `catColor` / `catGlyph(x)` | Presentation from the node. Leaves inherit the parent color. |
| `catIn(x, scopeId)` | True if `x` equals `scopeId` or is its child. Used by budgets ("Todas"), filters, alerts. |
| `catAggregate(rows, level)` | Grouping by `'parent'` or `'sub'`; sorted by amount desc, then id. |
| `catGuess(text, type)` | Keyword suggestion returning the most specific id. UI preselects parent + sub. |
| `catRegisterCustom({type, parentId, name, vis})` | Adds a custom node. A child inherits the parent identity; a new parent picks a `vis` key. |
| `CAT_LEGACY` | Lower-cased legacy value → new id. The only place old names may appear. |

## 3. Taxonomy

Defined in `CAT_NODES` in `s2-categories.js`. Subcategories inherit the parent color; they use their own glyph where one exists and fall back to the parent's.

Notable placements:
- "Suscripciones" / streaming lives under Entretenimiento (`exp.entertainment.streaming`).
- Software lives under Negocio › Herramientas.

## 4. Visual identities

Each concept has one icon and one color across every type (`CAT_VIS`). `exp.housing` and `goal.housing` share the `housing` identity. Charts, lists, selectors, budget cards and filters read `node.color` and `node.glyph`; they never assign colors per chart.

## 5. Rules

- **Store IDs, render names.** Transactions, series, budgets, goals and alerts store a node id: a leaf when the user picks a subcategory, otherwise the parent. No screen compares display strings.
- **Aggregation.** Parent-level charts sum every leaf under the parent plus rows tagged with the parent. Subcategory charts group by leaf; parent-only rows appear under the parent name. Mockups derive every chart, the home "Gasto por categoría" list and budget spend from one leaf-level ledger (`MONTH_SPEND`).
- **Budgets.** Store a scope id, amount and period. Parent scope → UI shows "Todas" and every child counts. Leaf scope → only that subcategory counts. Period `monthly` (resets on the 1st, matching `Budget.month`) or `custom` with start/end dates (no reset). Spent is always derived.
- **Goals.** Goal taxonomy (parent + optional subcategory). Progress = initial amount + Σ contributions; nothing else stores a current amount. Target date optional. Ring shows the category icon; percentage sits next to the name.
- **Transfers.** A transaction type, not a category. Rendered with the reserved `transfer` presentation node, never in selectors or aggregations. "Transferencias recibidas" (`inc.transfers`) is an income category for gifts, donations and reimbursements.
- **Custom categories.** Created in "Ajustes › Categorías". Same node shape; id under their parent (`exp.food.u_brunch`) or type (`exp.u_mascotas_exoticas`). Available at once in selectors, filters, budgets, reports. Names unique among siblings. Built-in nodes cannot be renamed or deleted.

## 6. Migration map

`CAT_LEGACY` in `s2-categories.js` maps every legacy value: the Android `CategoryId` enum, web `CategoryId` slugs, `seed.ts` subcategory slugs, `GoalCategoryId` / `Goal.themeIcon` (prefixed `goal:`), and Spanish labels stored by earlier mockups. Unknown values fall back to the type's "Otros" node and never throw.

Entries that **move parent** (change aggregation bucket; check when comparing historical reports): `bills-rent*`, `subscriptions*`, `suscripciones*`, `subscriptions-software*`, `health-fitness*`.

## 7. Refactor plan

### Backend
1. Add `Category.type` (`EXPENSE | INCOME | GOAL`), `Category.isCustom`, `Category.userId` (nullable). `slug` holds the dotted id. Seed all rows from `s2-categories.js`.
2. Migration: map every `Category` row and `Transaction.categoryId` through `CAT_LEGACY` (by slug); re-point transactions whose parent moved (`bills-rent` → `exp.housing.rent`). Keep old rows soft-deleted with a `mappedTo` column for one release.
3. Goals: add `Goal.categoryId` (FK) and `Goal.initialAmount`; backfill from `themeIcon` via `CAT_LEGACY` `goal:*`; deprecate `themeIcon`. Budgets: scope semantics (parent = all children), `period` (`MONTHLY | CUSTOM`), `startDate` / `endDate`.
4. `GET /categories` returns the full tree incl. the user's custom nodes. `POST /categories` (custom) with sibling-name uniqueness. Alerts and aggregates use the same parent/leaf rule.

### Web
1. Replace `data/categories.ts`, `lib/categoryGlyphs.ts`, the lists in `inicio.ts` and `GOAL_MARKS` in `planCopy.ts` with one generated module (TypeScript port of `s2-categories.js`). `CategoryId` becomes a string id.
2. `CategoryIcon` / `CategoryMark` take a node id and read from the registry. i18n keys become `category.<id>`.
3. Delete `backendCategories.ts` slug bridging once the API returns dotted ids. Update tests that query by Spanish label.

### Android
1. Replace the `CategoryId` enum, `MockCategories.kt`, `GoalCategory.kt`, glyph maps in `CategoryIcon.kt` and `CategorySuggestion.kt` with a `CategoryRegistry` fed by `GET /categories` plus a bundled fallback generated from `s2-categories.js`.
2. `iconFor(categoryId: String)` / `colorFor(categoryId: String)` are the only entry points. Remove goal icons borrowed from expenses.
3. Room/local cache: migrate stored enum names through the same legacy map.

### Rollout
1. Ship backend migration with dual-read (old slug or new id). Clients switch to ids. Remove legacy columns after one release.
2. Regenerate client modules whenever `s2-categories.js` changes. CI check that platform copies match the source hash.

## 7b. Category management (Ajustes › Categorías)

- Tabs: "Gastos", "Ingresos". Tap a parent card to edit it; tap a subcategory chip to edit it; "+ Subcategoría" at the end of each card; "+" in the header creates a parent.
- Edit sheet: name (unique among siblings), icon and color (parents only; subcategories inherit the parent color).
- Built-in nodes: rename and change icon allowed (the id never changes; renames are stored as a user label override). They cannot be deleted. Built-in parents can be hidden with "Mostrar al registrar": hidden nodes leave the Nuevo movimiento selector but keep their history in reports and filters.
- Custom nodes: can be deleted with the two-step confirmation (see `NEW_MOVEMENT.md` §9). Their movements are reassigned to the parent (for a subcategory) or to "Otros gastos" / "Otros ingresos" (for a parent).
- The category sheet in Nuevo movimiento links to this screen ("Gestionar categorías en Ajustes →") and returns to the sheet on back.

## 8. What changed in the mockups

- Both mockups embed the same taxonomy block; legacy `CAT_COLORS` / `CAT_GLYPHS` / `SUBCATEGORIES` are thin proxies over the registry.
- Seed data (transactions, programados, alerts, budgets, goals) stores node ids. Chart and budget figures derive from one leaf-level ledger.
- "Nuevo movimiento": parent grid plus subcategory chips; suggestion resolves to a leaf. Lists, detail and search show "Categoría · Subcategoría".
- Web Movimientos: category filter populated from the registry, incl. custom categories.
- Reportes (web + Android): "Categorías / Subcategorías" toggle.
- Presupuestos: category + subcategory ("Todas"), optional name, period "Mensual" or "Rango personalizado".
- Metas: category + optional subcategory, "Monto inicial", "Fecha objetivo".
- Ajustes › Categorías (web + Android): browse by type, create custom parents (icon + color) or subcategories (inherit parent identity).
