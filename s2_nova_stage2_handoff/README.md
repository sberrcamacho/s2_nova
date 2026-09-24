# S2 Nova — Stage 2 handoff (Inicio + Préstamos)

Open each `.dc.html` directly in a browser. They are interactive mockups, not production code. Keep `support.js`, `doc-page.js` and `design_handoff_s2_nova_overview/assets/` next to them.

| File | What it is |
|---|---|
| `S2 Nova Product Architecture.dc.html` | Product architecture, grounded in the repo: inventory, IA, navigation, flows, MVP, decisions |
| `STAGE-2-INICIO.md` | What changed from the previous mockups and why; the Inicio spec for both platforms |
| `S2 Nova Android v2.dc.html` | Android mockup. New bottom bar, Movimientos as a tab, Perfil from the avatar, reworked Inicio |
| `S2 Nova Dashboard v2.dc.html` | Web mockup. New nav, Inicio, Planes with the Presupuestos · Metas · Préstamos tabs, "Nuevo movimiento" panel, "Registrar abono" |

## Conventions
- Docs are in English. The UI stays in Spanish: implement quoted copy verbatim.
- Visual source of truth: these v2 mockups. They evolve the previous `design_handoff_s2_nova_overview/S2 Nova Android.dc.html` and `S2 Nova Dashboard.dc.html`.
- Data rules and backend behavior: `backend/prisma/schema.prisma` and `backend/src/routes/*` in the repo.
- Scope limits: Web Billeteras and Categorías pages, loan create/edit on Web, and the Reportes merge are later stages. Android's "Recurrentes" keeps its title until the Movimientos stage.
- Web currently has a read-only rule in `web/AGENTS.md`. The architecture lifts it; update that file when Web gets write operations.
