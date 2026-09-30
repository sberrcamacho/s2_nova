# Project Instructions

@AGENTS.md

## VISUAL DESIGN RULES

The old v2 interactive mockups (`design_handoff_s2_nova_v2/`) are **no longer
a source of truth**. Do not look for them, reproduce them, or report them as
missing. Mentions of "the mockup" in the per-app `AGENTS.md` files and in
`PROJECT_STATE.md` are historical: they explain why the current UI looks the
way it does, not what it must look like.

### Brand palette (fixed)

The palette of the S2 Nova brand mark is the only fixed visual constraint:

- Light mark (`web/src/assets/logo-mark-light.png`,
  `android/app/src/main/res/drawable-nodpi/logo_mark_light.png`): a violet
  gradient from `#D485FB` through `#9A39F9` and `#6622D6` to `#5712C2`.
- Dark mark (`logo-mark-dark.png` / `logo_mark_dark.png`): violet `#A80FFA`
  to electric blue `#0047F5` to cyan `#00C4FB`.

Keep these colors and keep the logo assets unmodified. Every other visual
decision can be redesigned, including the remaining colors, typography,
spacing, components, layout and navigation styling. Derive brand/primary
tokens from the mark and do not replace it with an unrelated hue.

### Design direction

The visual source of truth is `DESIGN-SYSTEM.md` (tokens, type, layout,
components, accessibility). `DESIGN_AUDIT.md` explains the reasoning behind
it. Ask before applying a visual change the design system does not cover.
When a screen changes, apply the change to **both** clients (Android and Web)
so they stay visually consistent. Parity is a product rule (see `AGENTS.md`).

- Accessibility is a hard requirement. Text contrast must be at least 4.5:1
  (3:1 for large text and for UI boundaries such as input borders). Android
  touch targets must be at least 48 dp; web pointer targets at least 24 px,
  with 32 px recommended. Text is at least 12 sp/px. Never use color alone to
  carry meaning.
- Amounts: the sign and the figure never wrap apart, amounts use tabular
  figures, and the amount column takes width priority over the title.
- Labels, chips, tabs and buttons never wrap onto two lines; titles truncate
  with an ellipsis instead of overlapping neighbours.
- Use SVG/vector icons from one consistent set. No emoji as icons. Reuse the
  repo's existing assets (category glyphs, logo) where they exist.

### Visual verification loop

Every screen you change must go through this loop:

INSPECT CURRENT SCREEN → IMPLEMENT → RUN APPLICATION → CAPTURE SCREENSHOT →
COMPARE WITH THE APPROVED DESIGN → FIX → CAPTURE AGAIN → REPEAT

1. Capture the current screen before changing it. The latest captures live in
   `s2-nova-screenshoots/` (`app-light`, `app-dark` for Android;
   `web-light`, `web-dark` for Web).
2. Implement the change.
3. Run the real application and navigate to the same state.
4. Capture a rendered screenshot in light and dark themes.
5. Check it against the approved design and the accessibility rules above:
   layout, spacing, typography, color and contrast, icons, states, touch
   targets and text wrapping.
6. Fix discrepancies and capture again until it is right.

A screen is not complete just because it compiles or works. Do not claim
visual verification unless a screenshot was actually captured and compared.
If screenshot capture is unavailable, mark visual verification as BLOCKED.
