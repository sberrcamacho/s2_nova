# S2 Nova

One personal finance product with two clients — Android and Web — that
share one backend, one database and one domain model, and offer the same
financial capabilities (barcode capture is the only Android-only feature).

- **`android/`** — native client (Kotlin + Jetpack Compose). See
  `android/AGENTS.md`. Install it from the latest
  [GitHub Release](https://github.com/sberrcamacho/s2_nova/releases/latest)
  (`s2-nova.apk`, Android 12+), also linked from the web landing page.
- **`web/`** — web client (React + TypeScript + Vite), live at
  <https://sberrcamacho.github.io/s2_nova/>. See `web/AGENTS.md`.
- **`backend/`** — shared API (Node.js + TypeScript + Fastify +
  Prisma/PostgreSQL) on Render + Aiven. See `backend/AGENTS.md`.
- **`docs/`** — technical documentation: architecture, current state,
  design system, testing and the Android release steps
  (`docs/README.md` is the index).

`AGENTS.md` has the product principles every change follows.
