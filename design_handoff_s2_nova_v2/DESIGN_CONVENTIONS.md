# S2 Nova — project conventions

- All design/technical documentation for developers is written in **English**: architecture, IA, navigation, flows, screen and component specs, design system, tokens, layout, spacing, typography, interaction, states, responsive, accessibility, Android/Web differences, implementation notes.
- The S2 Nova **user interface stays in Spanish**. Keep UI labels, buttons, messages and user-facing copy in Spanish; do not translate them. In English docs, quote UI copy verbatim in Spanish (e.g. the "Nuevo movimiento" button).
- The physical/IoT piggy bank is out of scope. Do not design or reference hardware.
- Developer documentation is Markdown (`.md`) in `docs/`, not `.dc.html`.
- Source of truth for product structure: `docs/PRODUCT_ARCHITECTURE.md`.
- Source of truth for categories: `s2-categories.js`, specified in `docs/CATEGORY_SYSTEM.md`.
