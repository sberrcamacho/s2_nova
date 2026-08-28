# Corrección de la pantalla de login web — S2 Nova

La implementación actual se parece al diseño pero está mal en las proporciones, la tipografía y las gráficas. Corrige la pantalla existente con esta especificación. **No aproximes ningún valor: todos los números de abajo son literales.**

Fuente de verdad: `S2 Nova Login.dc.html` (variantes WEB — DARK y WEB — LIGHT). Ábrelo y lee el markup antes de escribir código; copia los paths SVG carácter por carácter.

---

## 0. Errores de la última iteración (léelos primero)

Estos son los defectos exactos de lo que acabas de generar. Corrígelos uno por uno.

1. **Falta el botón "Continuar con Google".** Es el segundo bloque del formulario, justo debajo del subtítulo y **arriba** del divisor. Ahora mismo el divisor "O CON TU CORREO" aparece sin nada encima, lo cual no tiene sentido.
2. **Falta el campo CONTRASEÑA** completo, con su link "¿Olvidaste?" y su acción "Ver".
3. **La columna derecha quedó blanca.** En dark su fondo es \`#050507\` y el texto \`#ffffff\`. La pantalla es una sola superficie: panel morado a la izquierda, fondo oscuro a la derecha.
4. **Los textos fueron reescritos.** Van verbatim: "Iniciar sesión" (título), "Bienvenida de vuelta, Mariana." (subtítulo), "Entrar" (botón), "¿Nuevo en S2 Nova? Crear cuenta" (pie). No uses "Inicia sesión", "Bienvenido de vuelta a S2 Nova", "Iniciar sesión" como texto de botón ni "¿No tienes cuenta? Regístrate".
5. **El formulario no está centrado verticalmente** y es más ancho de 340px. La columna derecha es \`flex:1\` con \`align-items:center; justify-content:center\`; el formulario mide \`width:340px\` exactos.
6. **Los inputs traen iconos** (sobre, candado) que no existen en el diseño. Quítalos: el input es texto plano con padding de 14px, y lo único a la derecha es la acción "Ver" en el de contraseña.
7. **Falta el label "CORREO"** en mayúsculas con su tracking; dice "Correo electrónico" en caja baja.
8. **El input tiene el borde de focus permanente y sombra.** Sin \`box-shadow\`; el borde \`#241a5e\` solo en focus.

---

## 0b. Errores previos que siguen vigentes

1. El panel de marca ocupa ~48% del ancho. Debe ser **452px fijos**, nunca porcentaje.
2. La tipografía no es Plus Jakarta Sans (se ve un grotesco con espaciado raro, "dinero ," se separa). Falta cargar la fuente y falta `letter-spacing` negativo.
3. Las gráficas están sobredimensionadas y el donut está cortado y desalineado.
4. El glow morado del panel no aparece.
5. El formulario no está verticalmente centrado y sus separaciones son mayores que las del diseño.
6. El pie del panel está pegado al borde inferior de la ventana en vez de al padding de 38px.

---

## 1. Fuentes (obligatorio antes que nada)

En el `<head>` o en el CSS global:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- Toda la pantalla: `font-family: 'Plus Jakarta Sans', system-ui, sans-serif`.
- Cifras y montos: `font-family: Inter, system-ui, sans-serif; font-variant-numeric: tabular-nums`.
- Si la app tiene otra fuente global, esta pantalla la sobrescribe.

---

## 2. Contenedor raíz

```
min-height: 100vh;
width: 100%;
display: flex;
background: #050507;          /* light: #ffffff */
color: #ffffff;               /* light: #111118 */
```

Pantalla completa: **sin** `border`, **sin** `border-radius`, **sin** `max-width`, **sin** `overflow:hidden` en la raíz. (Los 1120×700 del mockup son solo el marco de presentación.)

---

## 3. Panel de marca (columna izquierda)

```
width: 452px;
flex: none;                   /* NO flex:1, NO %, NO 48% */
position: relative;
overflow: hidden;
padding: 38px;
display: flex;
flex-direction: column;
justify-content: space-between;
box-sizing: border-box;
background: linear-gradient(150deg, #16123a 0%, #1d1650 55%, #241a5e 100%);
color: #ffffff;               /* idéntico en dark y light: el panel es SIEMPRE oscuro */
```

**Glow** (primer hijo, decorativo):
```
position: absolute;
top: -80px; right: -60px;
width: 260px; height: 260px;
border-radius: 50%;
background: rgba(123,111,246,.4);
filter: blur(60px);
```
Todos los demás hijos llevan `position: relative` para quedar por encima.

### 3.1 Fila de logo (bloque superior)
- `display:flex; align-items:center; gap:10px`.
- Imagen `logo-mark-dark.png`, `32×32`, `border-radius:9px`, `flex:none`, `object-fit:cover`.
- Texto en columna:
  - "S2 Nova" — `15px / 800 / letter-spacing:-.01em`.
  - "PERSONAL FINANCE" — `9.5px / 600 / letter-spacing:.1em / rgba(255,255,255,.42)`.

### 3.2 Bloque central
`display:flex; flex-direction:column; gap:22px`.

**Titular** — `font-size:34px; font-weight:800; letter-spacing:-.03em; line-height:1.14`, dos líneas separadas por `<br>`:
```
Todo tu dinero,
en una sola vista.
```
No apliques `letter-spacing` positivo ni `word-spacing`; la coma va pegada a "dinero".

**Gráficas** — contenedor `display:flex; flex-direction:column; gap:18px`.

*(a) Área.* SVG con `viewBox="0 0 376 132"`, `width:100%`, `height:132`, `display:block`, `overflow:visible`. Alto **fijo 132px**: no lo escales ni uses `aspect-ratio`. Contenido, en este orden:
```html
<defs>
  <linearGradient id="loginArea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8578ff" stop-opacity=".55"/>
    <stop offset="100%" stop-color="#8578ff" stop-opacity="0"/>
  </linearGradient>
</defs>
<line x1="0" y1="33"  x2="376" y2="33"  stroke="rgba(255,255,255,.08)" stroke-width="1"/>
<line x1="0" y1="76"  x2="376" y2="76"  stroke="rgba(255,255,255,.08)" stroke-width="1"/>
<line x1="0" y1="119" x2="376" y2="119" stroke="rgba(255,255,255,.08)" stroke-width="1"/>
<path d="M0 104 C 34 96, 46 68, 78 66 S 130 88, 156 74 S 208 34, 235 40 S 292 30, 313 20 S 358 14, 376 8 L 376 132 L 0 132 Z" fill="url(#loginArea)"/>
<path d="M0 104 C 34 96, 46 68, 78 66 S 130 88, 156 74 S 208 34, 235 40 S 292 30, 313 20 S 358 14, 376 8" fill="none" stroke="#a59dff" stroke-width="2.5" stroke-linecap="round"/>
<path d="M0 122 C 40 118, 62 112, 96 110 S 152 106, 188 100 S 250 96, 292 86 S 350 82, 376 76" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round"/>
<circle cx="376" cy="8" r="5" fill="#050507" stroke="#a59dff" stroke-width="2.5"/>
```
Si hay más de un SVG con degradado en la página, dale al `id` un sufijo único por instancia para que no colisione.

*(b) Donut + leyenda.* Fila `display:flex; align-items:center; gap:18px`.

Donut: SVG **66×66**, `viewBox="0 0 66 66"`, `flex:none`, `transform: rotate(-90deg)`. Tres círculos concéntricos `cx=33 cy=33 r=27 fill="none" stroke-width="8"`:
1. pista — `stroke="rgba(255,255,255,.12)"`
2. `stroke="#8578ff"`, `stroke-linecap="round"`, `stroke-dasharray="98 172"`
3. `stroke="#7cf0bb"`, `stroke-linecap="round"`, `stroke-dasharray="42 172"`, `stroke-dashoffset="-104"`

El donut se ve cortado cuando el SVG hereda `width:100%` o le falta `flex:none`; fíjale ancho y alto en 66 y no lo metas en un contenedor que lo estire.

Leyenda: columna `gap:8px`, tres filas `display:flex; align-items:center; gap:9px`; punto `7×7`, `border-radius:50%`, `flex:none`; texto `12.5px`, `rgba(255,255,255,.72)`:
| Punto | Texto |
|---|---|
| `#8578ff` | Gastos por categoría |
| `#7cf0bb` | Ahorro del mes |
| `rgba(255,255,255,.22)` | Proyección |

### 3.3 Pie del panel
`11.5px`, `rgba(255,255,255,.45)`: "Datos cifrados de extremo a extremo". Queda a 38px del borde inferior por el padding del panel, no pegado al viewport.

---

## 4. Columna del formulario

```
flex: 1;
min-width: 0;
display: flex;
align-items: center;          /* centrado vertical */
justify-content: center;      /* centrado horizontal */
padding: 38px;
box-sizing: border-box;
```

Formulario: `width:340px` fijo, `display:flex; flex-direction:column; gap:18px`. **El gap de 18px es el único separador entre bloques**: no añadas márgenes propios a los hijos.

Orden exacto:

**1. Encabezado**
- "Iniciar sesión" — `26px / 800 / letter-spacing:-.025em`.
- "Bienvenida de vuelta, Mariana." — `12.5px`, `rgba(255,255,255,.5)` (light `#9c9caa`), `margin-top:5px`.

**2. Botón de Google**
```
height: 46px; border-radius: 12px;
display:flex; align-items:center; justify-content:center; gap:10px;
background:#ffffff; color:#1f1f28;
font-size:13.5px; font-weight:700; cursor:pointer;
```
En light añade `border:1px solid #ebebf2`. Hover: dark `#f0f0f5`, light `#f6f6fa`.
Logo "G" `18×18`, `flex:none`, SVG oficial de 4 colores (`viewBox="0 0 48 48"`, los cuatro paths están en el mockup). No lo recolorees, no lo recortes, no uses una fuente de iconos.

**3. Divisor**
Fila `align-items:center; gap:12px`: línea `flex:1; height:1px; background:#1c1c28` (light `#ebebf2`) — etiqueta "O CON TU CORREO" `10.5px / 700 / letter-spacing:.08em`, `rgba(255,255,255,.35)` (light `#9c9caa`) — otra línea igual.

**4. Campos** — contenedor columna `gap:12px` (no 18).

Cada campo: columna `gap:6px`.
- Label: `11px / 700 / letter-spacing:.06em`, `rgba(255,255,255,.55)` (light `#666673`). En mayúsculas tal cual: CORREO, CONTRASEÑA.
- Input: `height:46px; border-radius:12px; padding:0 14px; font-size:13px; background:#0b0b14; border:1px solid #1c1c28; color:rgba(255,255,255,.85)`. Light: `background:#ffffff; border:1px solid #ebebf2; color:#111118`. Sin `box-shadow`, sin `outline` por defecto del navegador.
- Focus: solo cambia el borde a `#241a5e` (light `#7b6ff6`). Nada más.

La fila del label de **CONTRASEÑA** es `display:flex; align-items:center; justify-content:space-between` con el link "¿Olvidaste?" a la derecha — `11px / 700`, `#a69dff` (light `#7b6ff6`), `text-decoration:none`.
Dentro del input de contraseña, a la derecha, la acción "Ver" — `11px / 700`, `rgba(255,255,255,.45)` (light `#9c9caa`), `cursor:pointer`; alterna `type` entre `password` y `text`. Los puntos del placeholder llevan `letter-spacing:.22em`.

**5. Checkbox** — fila `align-items:center; gap:9px`. Caja `16×16`, `border-radius:5px`, `background:#7b6ff6`, `flex:none`, centrada, con un check SVG blanco `10×10` (`stroke-width:2`, `round`). Texto "Mantener sesión iniciada" `12px`, `rgba(255,255,255,.6)` (light `#666673`). Sin estado marcado: caja transparente con `border:1px solid` el token `border` y sin check.

**6. Botón Entrar**
`height:48px; border-radius:12px; background:#7b6ff6; color:#fff; font-size:14px; font-weight:800; letter-spacing:-.01em`, centrado. Hover: dark `#8578ff`, light `#6c5ce7`. Pressed `opacity:.9`. Loading: spinner 16px, botón deshabilitado, texto oculto.

**7. Pie**
Centrado, `12px`, `rgba(255,255,255,.5)` (light `#9c9caa`): "¿Nuevo en S2 Nova? " + link "Crear cuenta" `font-weight:700`, `#a69dff` (light `#7b6ff6`), `text-decoration:none`.

---

## 5. Tokens

| Token | Dark | Light |
|---|---|---|
| bg | `#050507` | `#ffffff` |
| surface (input) | `#0b0b14` | `#ffffff` |
| border | `#1c1c28` | `#ebebf2` |
| borderFocus | `#241a5e` | `#7b6ff6` |
| text | `#ffffff` | `#111118` |
| textMuted | `rgba(255,255,255,.5)` | `#9c9caa` |
| label | `rgba(255,255,255,.55)` | `#666673` |
| link | `#a69dff` | `#7b6ff6` |
| primary | `#7b6ff6` | `#7b6ff6` |
| primaryHover | `#8578ff` | `#6c5ce7` |
| accentSoft | `#a59dff` | `#a59dff` |
| positive | `#7cf0bb` | `#7cf0bb` |
| danger | `#d64545` | `#d64545` |

Añade a los tokens de tema del proyecto los que falten; no dejes hex sueltos en el componente salvo los del panel de marca y el SVG de Google, que son constantes.

---

## 6. Responsive

Un solo breakpoint, **900px**. Por debajo: oculta el panel de marca (`display:none`), la columna del formulario ocupa todo el ancho con `padding:24px`, el formulario pasa a `width:100%; max-width:340px`. Nada más cambia.

---

## 7. Comportamiento

- Formulario controlado. Validación: email con formato válido, contraseña ≥8 caracteres. Valida al enviar y luego en cada cambio del campo ya tocado.
- Error: borde `#d64545` en el input y mensaje `11px` `#d64545` a 6px debajo del campo. El layout no debe saltar: reserva el espacio o usa el gap existente.
- Google sign-in: Google Identity Services (`@react-oauth/google` o el script GIS). Botón propio, no el que renderiza Google. Al recibir el credential, llama `signInWithGoogle(credential)` en la capa de auth existente y navega al dashboard. Si aún no hay backend, mock con TODO explícito. Durante el flujo el botón queda deshabilitado con spinner.
- Accesibilidad: `<form>` real con submit, `label htmlFor` + `id` en cada input, `autoComplete="email"` y `"current-password"`, `aria-invalid` y `aria-describedby` en error, `aria-label` en el botón "Ver", el glow y los SVG decorativos con `aria-hidden="true"`.

---

## 8. Reglas

- Textos en español, verbatim: no reescribas ni "mejores" ninguna cadena.
- Ruta `/login`, fuera del layout con sidebar.
- Un solo componente para dark y light, con el mecanismo de tema existente.
- No toques ninguna otra pantalla.
- No hace falta compilar ni verificar. Al terminar, lista los archivos creados o modificados.
