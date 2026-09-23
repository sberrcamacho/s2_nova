# Project Instructions

@AGENTS.md

## STRICT VISUAL FIDELITY MODE

The provided mockups are the visual source of truth for the UI.

Do not redesign, reinterpret, simplify, modernize, or replace visual elements based on assumptions.

Every visible element matters, including:

- layout and positioning
- spacing and dimensions
- typography
- colors
- backgrounds
- borders
- corner radii
- shadows
- buttons
- cards
- navigation
- icons
- images
- selected/unselected states
- dialogs and overlays

### Icons and assets

Do not use semantic equivalence as a substitute for visual equivalence.

If the mockup contains a specific icon, use the exact corresponding asset/icon whenever it exists.

Do NOT replace it with:

- a generic Material icon
- another icon with the same meaning
- a Unicode character
- an emoji
- an improvised visual substitute

Search the repository for the correct asset before creating or choosing a replacement.

Reuse an existing component only when its rendered appearance actually matches the mockup. Do not reuse a component merely because it serves a similar purpose.

If an exact required asset cannot be found, report the missing asset instead of silently substituting a visually different one.

### MANDATORY VISUAL VERIFICATION LOOP

Every screen must independently follow this process:

MOCKUP
→ INSPECT
→ IMPLEMENT
→ RUN APPLICATION
→ CAPTURE SCREENSHOT
→ COMPARE WITH MOCKUP
→ IDENTIFY DIFFERENCES
→ FIX DIFFERENCES
→ CAPTURE SCREENSHOT AGAIN
→ COMPARE AGAIN
→ REPEAT UNTIL ACCEPTABLE

For every screen:

1. Inspect the complete reference mockup before implementation.
2. Identify all visible elements.
3. Implement the screen.
4. Run the actual application.
5. Navigate to the exact state represented by the mockup.
6. Capture an actual rendered screenshot.
7. Compare it against the reference mockup.
8. Check layout, spacing, typography, colors, components, icons, assets, borders, shadows, states, and navigation.
9. Identify meaningful discrepancies.
10. Fix them.
11. Capture another screenshot.
12. Compare again.
13. Repeat until the screen is visually faithful.

A screen is NOT complete merely because:

- the code compiles
- the screen opens
- functionality works
- the layout is approximately similar
- the correct semantic components are present
- an icon has the same meaning

The rendered result must visually correspond to the reference.

Do not claim that visual verification was performed unless an actual screenshot was captured and compared against the reference.

If screenshot capture is unavailable in the current environment, explicitly mark visual verification as BLOCKED. Never pretend it was completed.

### NO UNAUTHORIZED DESIGN CHANGES

Do not:

- invent UI elements
- remove UI elements
- replace icons without justification
- change colors
- change typography
- change spacing
- redesign navigation
- introduce new visual patterns
- simplify the mockup
- "improve" the design without explicit authorization

If the existing implementation conflicts with the mockup, follow the mockup.

### SCREEN COMPLETION CRITERIA

A screen is complete only when:

- required functionality works
- navigation works
- the rendered screen has been captured
- it has been compared against the reference mockup
- meaningful discrepancies have been corrected
- the corrected screen has been captured and compared again

Apply these rules independently to EVERY screen.
