# S2 Nova — Login (web + Android)

Mockup de referencia: `S2 Nova Login.dc.html` (ábrelo en el navegador; contiene las 4 variantes).
Todo está medido en px = dp. No hay valores inventados: si algo no aparece aquí, tómalo del mockup.

---

## 1. Tokens

| Token | Dark | Light |
|---|---|---|
| `bg` | `#050507` | `#ffffff` |
| `surface` (input) | `#0b0b14` | `#ffffff` (Android email: `#f6f6fa`) |
| `border` | `#1c1c28` | `#ebebf2` |
| `borderFocus` | `#241a5e` | `#7b6ff6` |
| `text` | `#ffffff` | `#111118` |
| `textMuted` | `rgba(255,255,255,.50)` | `#9c9caa` |
| `label` | `rgba(255,255,255,.55)` | `#666673` |
| `primary` | `#7b6ff6` | `#7b6ff6` |
| `primaryHover` | `#8578ff` | `#6c5ce7` |
| `accentSoft` | `#a59dff` | `#a59dff` |
| `positive` | `#7cf0bb` | `#7cf0bb` |

Panel de marca (idéntico en dark y light, siempre oscuro):
`linear-gradient(150deg, #16123a 0%, #1d1650 55%, #241a5e 100%)`
+ glow: círculo 260×260, `top:-80px; right:-60px`, `rgba(123,111,246,.4)`, `blur(60px)`, sin overflow.

Tipografía: **Plus Jakarta Sans** (400–800). Cifras: **Inter** con `font-variant-numeric: tabular-nums`.

---

## 2. Web — 1120 × 700, dos columnas

Contenedor: `display:flex`, `border-radius:22px`, `overflow:hidden`, borde 1px `border`, fondo `bg`.

### 2.1 Panel izquierdo — 452px fijo, padding 38px, `justify-content:space-between`
1. **Logo row** — gap 10px. Marca 32×32, radius 9. Título `S2 Nova` 15px/800, `letter-spacing:-.01em`. Bajada `PERSONAL FINANCE` 9.5px/600, `letter-spacing:.1em`, `rgba(255,255,255,.42)`.
2. **Bloque central** — columna, gap 22px:
   - Titular 34px/800, `letter-spacing:-.03em`, `line-height:1.14`: "Todo tu dinero,\nen una sola vista."
   - **Gráficas** (columna, gap 18px):
     - *Área*: `viewBox="0 0 376 132"`, alto 132. Tres líneas guía horizontales y=33/76/119, `rgba(255,255,255,.08)`, 1px. Relleno con `linearGradient` vertical `#8578ff` .55 → 0. Trazo `#a59dff` 2.5px round. Línea punteada secundaria `rgba(255,255,255,.28)` 2px `dasharray 5 6`. Punto final: círculo r=5 en (376,8), relleno `bg`, trazo `#a59dff` 2.5px. Paths exactos en el mockup.
     - *Donut + leyenda*: fila, gap 18px. SVG 66×66, rotado −90°, círculos r=27 `stroke-width:8`, pista `rgba(255,255,255,.12)`; arco `#8578ff` `dasharray 98 172`; arco `#7cf0bb` `dasharray 42 172` `dashoffset -104`. Leyenda: 3 filas gap 8px, punto 7×7, texto 12.5px `rgba(255,255,255,.72)` — "Gastos por categoría" / "Ahorro del mes" / "Proyección".
3. **Pie** — 11.5px `rgba(255,255,255,.45)`: "Datos cifrados de extremo a extremo".

### 2.2 Columna derecha — flex:1, centrada, padding 38px
Formulario ancho fijo **340px**, columna, **gap 18px**, en este orden:
1. Título "Iniciar sesión" 26px/800 `letter-spacing:-.025em`; subtítulo 12.5px `textMuted`, `margin-top:5px`.
2. **Botón Google** — alto 46, radius 12, fondo `#ffffff` (light añade borde 1px `#ebebf2`), texto `#1f1f28` 13.5px/700, gap 10px, logo "G" 18×18 (SVG 4 colores oficial, incluido en el mockup). Hover: dark `#f0f0f5`, light `#f6f6fa`.
3. **Divisor** — línea 1px `border` a cada lado, etiqueta 10.5px/700 `letter-spacing:.08em`: "O CON TU CORREO".
4. **Campos** (columna gap 12px). Cada campo: label 11px/700 `letter-spacing:.06em` color `label`, gap 6px, input alto 46, radius 12, padding-x 14, fondo `surface`, borde 1px `border`, texto 13px. El campo de contraseña va en estado focus (borde `borderFocus`), muestra puntos con `letter-spacing:.22em` y acción "Ver" 11px/700 a la derecha. La fila de label de contraseña lleva el link "¿Olvidaste?" 11px/700 alineado a la derecha.
5. **Checkbox** "Mantener sesión iniciada" — caja 16×16 radius 5 `primary` con check blanco 2px; texto 12px.
6. **Botón Entrar** — alto 48, radius 12, `primary`, texto 14px/800 blanco. Hover `primaryHover`.
7. **Pie** 12px centrado: "¿Nuevo en S2 Nova? **Crear cuenta**".

---

## 3. Android — 390 × 844 dp

Padding horizontal **24dp** en toda la pantalla (`box-sizing:border-box`; en Compose `Modifier.padding(horizontal = 24.dp)`).
Status bar 44dp. Contenido arranca a **52dp** bajo la status bar. Columna con **gap 28dp**.

1. **Encabezado** (gap 18dp): marca 52×52 radius 15; título "Iniciar sesión" 30sp/800 `letter-spacing:-.03em` `line-height:1.12`; subtítulo 13.5sp `textMuted` a 7dp.
2. **Campos** (gap 14dp): label 11sp/700 + input alto **56dp**, radius 16, padding-x 16, texto 14.5sp. Email: fondo `surface` (light `#f6f6fa`) + borde `border`. Password: focus, borde `borderFocus`, puntos `letter-spacing:.24em`, acción "Ver" 12sp/700. Debajo, alineado a la derecha, "¿Olvidaste tu contraseña?" 12.5sp/700 `primary`.
3. **Acciones** (gap 16dp): botón **Entrar** alto 56, radius 16, `primary`, 15sp/800 blanco → divisor con etiqueta "O" → botón **Continuar con Google** alto 56, radius 16, fondo `#ffffff` (light con borde `#ebebf2`), texto `#1f1f28` 14.5sp/700, logo 20×20, gap 12dp.
4. **Pie** pegado abajo (`margin-top:auto`, padding-bottom 26dp, gap 16dp, centrado): "¿Nuevo aquí? **Crear cuenta**" 13sp + home indicator 134×5 radius 999 (`rgba(255,255,255,.22)` / `#d8d8e2`).

Orden deliberado: en móvil el email es primario y Google va debajo del divisor; en web Google va arriba.

---

## 4. Estados a implementar

- Input: reposo (borde `border`) / focus (borde `borderFocus`, sin sombra) / error (borde `#d64545`, mensaje 11px `#d64545` a 6px bajo el campo).
- Botones: reposo / hover (solo web) / pressed (opacidad .9) / loading (spinner 16dp, botón deshabilitado, texto oculto).
- "Ver" alterna la visibilidad de la contraseña.
- Google: durante el flujo, el botón muestra spinner y queda deshabilitado.

## 5. Accesibilidad
- Objetivos táctiles ≥48dp en Android (los botones son 56dp; "Ver" necesita área de toque de 48dp).
- Labels asociados a inputs (`htmlFor`/`id` en web, `semantics` en Compose).
- El botón de Google conserva la marca oficial sin recolorear ni recortar.
