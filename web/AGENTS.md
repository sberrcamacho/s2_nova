# s2-nova web dashboard

React + Vite + Tailwind CSS web application — the S2 Nova **web dashboard**
(financial statistics, charts, budgets, categories, analytics, reports).
This is one of two S2 Nova applications; see the root `AGENTS.md` for how it
relates to `android/`. This app has no login/mobile screens of its own — it
runs as a single-user demo (`AuthContext` auto-hydrates the mock user).

## Development Server

Run `pnpm dev` from this directory to start the Vite development server on
`$PORT` (default 8443).

- Preview URL: http://localhost:8443 (or the configured `$PORT`)
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files
below. Only follow imports or inspect other files when required, when a
documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Root component; mounts the dashboard route tree at `/`
- `src/dashboard/` - The entire application: layout, pages, and dashboard-local state (`DashboardFiltersContext`)
- `src/components/ui/`, `src/components/charts/` - Shared, reusable building blocks used across dashboard pages
- `src/state/` - App-wide React context (auth, theme, toast, mock app data) plus `useCurrency`/`useTranslation`, hooks bound to `user.currency`/`user.preferences.language` — use these instead of importing `lib/currency.ts` or hardcoding copy directly, so amounts/text stay in sync with the Settings page's currency-format and language toggles
- `src/lib/i18n/` - Small hand-rolled translation dictionary (`es`/`en`) consumed via `useTranslation()`'s `t()`. Coverage is app chrome (sidebar, header, page titles) + the full Settings screen, **plus every category/payment-method/budget-status label shown anywhere** — `useTranslation()` also exposes `tCategory(id)`/`tPaymentMethod(id)` for those (mirrors `data/categories.ts`'s `CategoryId`/`PaymentMethod` values, which are the exact dictionary-key suffixes: `category.<id>`, `paymentMethod.<id>`). It is *not* a page-by-page translation of every dashboard screen's own copy (table headers, empty states, chart titles, etc. are still Spanish-only) — that's a separate, larger effort from the category/payment-label fix. Never read `.label` off `data/categories.ts` directly in a component; always go through `tCategory`/`tPaymentMethod` so it reacts to the language toggle.
- `src/services/`, `src/data/` - Mock "backend" layer: in-memory CRUD + seed data. No real API/database yet.
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import, and the S2 Nova design tokens (light/dark palettes)
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React and Tailwind CSS v4 plugins plus the `@` alias for `src`

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin
configured in `vite.config.ts`. `src/index.css` imports Tailwind with
`@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and
put global CSS or Tailwind v4 theme customization in `src/index.css`. This
scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in
`src/index.css`. Keep CSS `@import` statements first, then add any
`@font-face` rules and font-family defaults there.

The dashboard sidebar (`src/dashboard/components/Sidebar.tsx`) is
**permanently dark navy**, independent of the light/dark app theme — this
matches the Figma reference and is intentional, not a bug. Use
`<Logo tone="inverted" />` on dark, non-theme-reactive surfaces like it.

The logo ships as two pre-rendered PNG tiles, `assets/logo-mark-dark.png`
and `assets/logo-mark-light.png` (own rounded-card background baked in, not
a transparent glyph — extracting a transparent glyph from the source art
left a visible stray border, which is why it's not done that way).
`LogoMark`/`Logo` (`components/ui/Logo.tsx`) pick between them via
`useTheme()`, unless `tone="inverted"` pins the dark tile. Regenerate both
from `design-reference/suggestions/logo-dark.png` /`logo-light.png` if the
mark ever changes, rather than re-deriving one from the other.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- `ProgressBar`'s `className` prop styles the **fill** bar, not the wrapper — use `trackClassName` (or wrap it in a sized container) for layout/spacing classes. Mixing this up produces a bar with no visible fill.
