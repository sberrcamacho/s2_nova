# S2 Nova

S2 Nova is **one personal finance product with two clients** that share one
backend, one database, one user identity and one domain model:

- `android/` — native mobile client (Kotlin + Jetpack Compose), tuned for
  everyday mobile use: quick entry, quick review, notifications, barcode
  scanning. See `android/AGENTS.md`.
- `web/` — web client (React + TypeScript + Vite), tuned for desktop
  management and deeper analysis: tables, side panels, richer charts, CSV
  export. See `web/AGENTS.md`.
- `backend/` — the shared API (Node.js + TypeScript + Fastify + Prisma/
  PostgreSQL). It is the single source of truth for financial data and
  business rules. See `backend/AGENTS.md`.
- `s2_nova_stage2_handoff/` — the approved product architecture
  (`S2 Nova Product Architecture.dc.html`), stage specs (`STAGE-*.md`) and
  the v2 interactive mockups (`S2 Nova Android v2.dc.html`,
  `S2 Nova Dashboard v2.dc.html`) — the visual source of truth.

**Functional parity.** Android and Web are functionally the same
application: every operation that changes the user's financial data
(wallets, transactions, categories, budgets, goals, loans and abonos,
Programados, profile and preferences) must be available on both. The only
platform-specific capability is barcode *capture* (Android camera); the
resulting purchase is ordinary shared data that Web can view and edit.
Differences between the clients are UX, never capability.

**Business rules live in the backend.** When both clients need the same
figure or rule (balances, budget progress, loan outstanding, alerts,
monthly aggregates), implement it once in `backend/` and consume it from
both clients instead of duplicating the logic.

**Vocabulary.** UI copy is Spanish and shared across platforms: Inicio,
Movimientos, Planes (Presupuestos · Metas · Préstamos), Reportes,
Billeteras, Categorías, Alertas, Programados, Abono, Aporte. Technical
documentation stays in English. Out of scope: business finance and the
physical IoT piggy bank.

The two clients are still separate codebases, built and deployed
independently. Do not reintroduce a single "responsive web app that is
also the mobile app". See `ARCHITECTURE.md` for the backend/database/auth/
sync design. For work inside either app, read that app's own `AGENTS.md`
first — it has the concrete dev commands, structure, and conventions.

# UI IMPLEMENTATION RULES

## SOURCE OF TRUTH

The provided mockups are the SINGLE SOURCE OF TRUTH for the visual design.

When implementing a screen, reproduce the corresponding mockup as accurately
as technically possible.

Do NOT treat the mockup as inspiration.
Do NOT redesign it.
Do NOT improve it according to your own design preferences.
Do NOT substitute elements with existing components merely because they already exist.

If the mockup and the existing application disagree, the mockup takes priority
for the visual appearance of that screen.

---

## COMPONENT REUSE

Existing components may ONLY be reused when they are visually identical to
the component required by the mockup.

If an existing component differs in:

- size
- spacing
- typography
- color
- border radius
- icon
- alignment
- padding
- layout
- elevation/shadow
- behavior

then DO NOT reuse it.

Create a new component or modify the existing component only if doing so
preserves the exact appearance required by the mockup.

Do not force the mockup to fit the existing component architecture.

---

## NO CREATIVE INTERPRETATION

You are implementing a design, not designing a new one.

Do not:

- add UI elements that are not present in the mockup
- remove UI elements that are present in the mockup
- change the layout
- change colors
- change typography
- change spacing
- change button shapes
- change navigation placement
- introduce additional cards
- introduce additional animations
- introduce additional functionality
- "modernize" the interface
- make the interface "cleaner"
- make the interface "more consistent" with existing screens

If something appears unusual in the mockup, reproduce it anyway.

---

## EXISTING CODE

Before modifying a screen:

1. Inspect the existing implementation.
2. Inspect the target mockup.
3. Identify differences.
4. Implement the mockup.
5. Do not modify unrelated screens.
6. Do not refactor unrelated components.
7. Do not perform general UI cleanup.

The existence of an older component is NOT a reason to use it.

---

## EXACTNESS

Prioritize visual fidelity over code reuse.

The following order of priority applies:

1. Mockup visual fidelity
2. Required functionality
3. Existing architecture
4. Code reuse
5. Personal design judgment

Never sacrifice #1 to improve #3 or #4.

---

## WHEN INFORMATION IS MISSING

If the mockup does not specify something, use the smallest possible
implementation necessary to make the screen functional.

Do not invent significant visual elements.

---

## VERIFICATION

Before declaring the screen complete, compare the implementation against
the mockup.

Check:

- overall layout
- element positions
- dimensions
- spacing
- typography
- colors
- borders
- corner radius
- icons
- images
- buttons
- navigation
- alignment
- screen proportions

If the implementation differs visibly from the mockup, fix it before
considering the task complete.
