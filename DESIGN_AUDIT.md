# S2 Nova — Auditoría de diseño (UX/UI, accesibilidad y propuesta de sistema visual)

> **Fecha:** 2026-09-28 · **Alcance:** clientes Android (Jetpack Compose) y Web (React + Vite), en temas claro y oscuro.
> **Fuente:** capturas en `s2-nova-screenshoots/` (`app-light/` y `app-dark/` = Android actual; `web-light/`, `web-dark/`, `auth-*`, variantes de presupuesto) y tokens de `web/src/index.css` y `android/app/src/main/java/com/s2nova/app/ui/theme/Color.kt`.
> **Metodología:** skill **UI/UX Pro Max** (reglas priorizadas §1–§10, búsquedas `--design-system`, `--domain style|color|typography|product`) y cálculo de contraste WCAG 2.x.
> **Estado:** enfoque validado. F0 completado en las pantallas principales (Inicio, Movimientos, Nuevo movimiento, Planes y Reportes) en Android y Web. F1 completado (tokens de marca y escala tipográfica). F2 completado (Inicio Bento). F3 completado (Nuevo movimiento).

**Restricción de diseño:** la única restricción visual fija es la **paleta del icono de marca S2 Nova**. Todo lo demás (resto de colores, tipografía, espaciado, componentes, maquetación) se puede rediseñar.

Severidades: **Crítico** (puede inducir a error financiero o bloquear una tarea) · **Alto** (fricción fuerte o incumplimiento de WCAG AA o de paridad) · **Medio** · **Bajo**.
Entre paréntesis va la regla de UI/UX Pro Max aplicada.

> ⚠️ **Sobre las capturas de Android (verificado en F0 con la app real en emulador).** A 412 dp y con el texto al 100 %, la app real **no** tiene la mayoría de los textos partidos que muestran `app-light/` y `app-dark/`: esas capturas vienen del mockup HTML a un ancho menor. Los defectos sí aparecen en un teléfono de **360 dp con el texto al 130 %**: el monto de ingresos del hero se partía ("$4.600.20 / 0"), "Movimientos" se cortaba en la barra inferior y los títulos de Próximos 7 días se partían. Además apareció un bug que las capturas no mostraban: las filas de Inicio formateaban un movimiento en USD con la moneda principal (Spotify salía como "−$6" en vez de "−US$5,99"). En tema claro, la tarjeta de saldo usaba colores de texto del tema claro sobre su fondo oscuro (2.3–3.9:1). Sobre las áreas táctiles: Compose amplía automáticamente el área de toque de los elementos pulsables de menos de 48 dp cuando hay espacio, así que los botones de 38 dp no son un problema real salvo entre controles pegados. Todo esto se corrigió en Inicio (F0).
>
> **Inicio web (F0, verificado con capturas del cliente real en modo invitado, 1440 px y 390 px, claro y oscuro).** Mismos arreglos que en Android: tokens de contraste y colores on-dark del hero en `web/src/index.css`, cifras tabulares en Plus Jakarta Sans (Inter eliminado), montos en una sola línea (a 390 px se partían: "$84.800 / ↵ $90.000"), nombres truncados con tooltip o en 2 líneas como máximo, botón de descartar alerta de 32 px y enlaces "Ver en …" de 24 px de alto. Próximos 14 días tenía el mismo bug de moneda que Android: un Programado en USD se mostraba y se sumaba al saldo proyectado como si fuera COP. Ahora muestra su moneda con la línea "≈" y el saldo proyectado convierte a la principal (también en Reportes › Flujo de caja, corregido en su pasada).
>
> **Movimientos (F0, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, y en web a 1440 y 390 px, claro y oscuro).** Android: a 360 dp/130 % el chip "Pendientes" se recortaba a "Pe"; ahora los chips pasan a una segunda línea. Montos, chips, título y botón "Programados" no se parten. El total del grupo "AYER" mostraba "$132.660,5"; ahora usa `formatApprox`, que además redondea hacia arriba como la web (antes Android mostraba "≈ $23.660" y la web "≈ $23.661"). Web: a 390 px el botón "Nuevo movimiento" se salía de la pantalla junto al selector de periodo; ahora bajo 520 px es un botón de solo icono de 34 px con nombre accesible y tooltip. Títulos y subtítulos de fila con tooltip. El cuarto filtro se llama "Programados" en ambos clientes (Android decía "Pendientes").
>
> **Nuevo movimiento (F0, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, y en web a 1440 y 390 px, claro y oscuro).** A 412 dp las acciones "Ahora · Repetir · Adjuntar · Presupuesto · Más" y el título ya se leían completos en la app real (los "Aho…", "Repe…" de las capturas venían del mockup). Sí fallaba a 360 dp/130 %: la pestaña "Transferencia" se partía en dos líneas y la cuadrícula de categorías cortaba "Alimentació / n" a mitad de palabra. Ahora las pestañas no se parten (con texto grande cada una toma el ancho de su etiqueta) y la cuadrícula pasa a 3 columnas cuando el texto es grande para la pantalla. Android: la flecha atrás, "›", "▼" y "✕" eran caracteres de texto; ahora son iconos del set, y atrás (48 dp) y quitar adjunto tienen nombre accesible. El botón "Guardar" deshabilitado era solo texto gris sobre el fondo en tema claro; ahora conserva su contenedor. Web: "▼" y "✕" pasan a iconos (quitar adjunto de 32 px), la categoría elegida se trunca con tooltip y las etiquetas de las acciones van en una línea con tooltip en vez de partirse a mitad de palabra (`OptionTile`, compartido con el modal de presupuesto). La divulgación progresiva de §1.4 sigue pendiente para F3.
>
> **Planes (F0, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, y en web a 1440 y 390 px, claro y oscuro).** Android: a 360 dp/130 % la pestaña "Préstamos" se partía en "Présta / mos" (ahora las pestañas no se parten y se desplazan si no caben) y el nombre de la meta perdía palabras enteras ("Fondo de", sin "emergencia"; ahora se trunca con elipsis). Las tarjetas de presupuesto indicaban el estado solo con el color de la barra; ahora muestran la misma nota que la web ("Holgado", "Vigílalo", "Cerca del límite", "Superado por …"). En Préstamos, "Registrar abono" y "Editar" eran texto de 17 dp sin área táctil propia (ahora 48 dp) y "Registrar abono" usaba el primary sobre la superficie oscura (3.9:1; ahora `accentText`). Web: el porcentaje de cada meta usaba el color de la meta como color de texto (no llega a 4.5:1 en claro; ahora texto neutro y el color queda en el anillo); en Préstamos, a 390 px "$420.000 pendiente" y "$0 de $420.000 · 0 %" se partían (ahora cada cifra va en una línea y la nota baja si no cabe); nombres de presupuesto, meta y persona truncados con tooltip.
>
> **Reportes (F0, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, y en web a 1440 y 390 px, claro y oscuro).** Android tenía un bug de moneda en el modo invitado: los agregados (`AnalyticsHelpers`) sumaban cada movimiento en su propia moneda, así que Spotify (US$5,99) salía como "$6" en Gasto por categoría y el ingreso de US$200 contaba como $200 (Ingresos del periodo $4.600.200 en vez de $5.390.000; también el "Ingresos del mes" del hero de Inicio). Ahora todo se convierte a la moneda principal. La gráfica "Ingresos vs gastos" de Android no tenía leyenda (verde/rojo solo por color): ahora la tiene, como la web, baja bajo el título si no cabe, y TalkBack lee los montos de cada mes. Montos en una línea y nombres de categoría con elipsis. Web: la fila de Flujo de caja muestra el monto en la moneda del Programado con su línea "≈", el nombre se trunca con tooltip y bajo 520 px el saldo proyectado pasa debajo del monto en lugar de ocupar una columna fija. Pendiente (no visual): los datos de invitado difieren entre clientes (la web tiene un "Aporte a Fondo de emergencia" de $100.000 y 11 meses de historia; Android no).

> **F1 (tokens de marca y tipografía, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, y en web a 1440 y 390 px, claro y oscuro).** El primary pasa de `#6657E8`/`#6C5CE7` a `#6622D6` en ambos clientes y temas, y los enlaces a `#5712C2` (claro) y `#D485FB` (oscuro). El hero de saldo (y la tarjeta de monto de Nuevo movimiento) deja el azul marino: en claro es el degradado violeta del logo y en oscuro un violeta profundo con el brillo violeta→azul del logo oscuro. En claro, ingresos y gastos van en blanco sobre el hero (la etiqueta del mosaico da el significado). Hallazgo al medir: `#9A39F9` no aguanta texto blanco pequeño (3.6–4.2:1), así que esa parada queda fuera de la tarjeta y el extremo visible es `#802EE8`. Otro: en oscuro `#6622D6` solo da 2.5:1 sobre la superficie, así que en oscuro el texto de marca usa `link` y los bordes de selección, radios e indicadores de pestaña usan `primary-border` (`#A80FFA`, 3.6–3.9:1). Antes ya fallaba (`#6C5CE7` daba 3.9:1 como texto). El anillo de foco de la web pasa a azul/cian. Bordes oscuros `#2E2E40`. El panel de marca de Login y Registro usa el hero oscuro. Tipografía: nada queda por debajo de 12 (118 tamaños en Android y 155 en web subieron a 12); se definieron los roles de §3 (`NovaType`, utilidades `text-caption` y demás), pero las pantallas aún no los usan todos: eso llega con cada rediseño. Al subir a 12 aparecieron dos cortes que se corrigieron: el lema "PERSONAL FINANCE" del sidebar se partía, y a 360 dp/130 % "Límite total" de Planes se recortaba (ahora baja a otra línea). También se corrigieron textos con contraste insuficiente sobre el nuevo hero (ayuda y chip "Programado" en ámbar). Quedan truncados con elipsis a 360 dp/130 %: "Ingresos del …" en el hero de Inicio y, a 412 dp, "Presupues…" en las opciones de Nuevo movimiento. Se resuelven en F2 y F3.
>
> **F2 (Inicio Bento, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440, 1100, 800 y 390 px, claro y oscuro).** Android: cabecera con botones de 40 dp en áreas de 48 dp; hero 2×1 con botón de ojo que cambia la preferencia compartida de ocultar montos (como en web), anunciando su estado; mosaicos Ingresos / Gastos con signo, variación contra el mes anterior con flecha y color según si es favorable, y una etiqueta accesible completa; alerta 2×1 con barra de tono semántico y acción explícita ("Revisar", o "Confirmar aporte" / "Omitir" para un aporte programado); Presupuestos (los tres más riesgosos, con barra de 8 dp e icono de estado) junto a Próximo pago; y los 5 movimientos recientes como lista plana. Web: cuadrícula de 12 columnas (hero 8 + Ingresos/Gastos/Ahorro 4; Alertas, Presupuestos y Metas 4 cada uno; Movimientos recientes como tabla 8 + Próximos 14 días 4) que se reacomoda por el ancho del contenido. Salieron de Inicio web las tarjetas de Billeteras, Préstamos y Gasto por categoría (siguen en Billeteras, Planes y Reportes; los préstamos siguen apareciendo como alerta), así ambos clientes muestran lo mismo. Hallazgos al verificar: a 360 dp/130 % "SALDO TOTAL" se cortaba junto a la píldora de billeteras (la píldora pasó bajo el saldo) y los nombres de presupuesto quedaban en 4 letras (el nombre va ahora en su propia línea); en web la tabla de recientes se salía de la tarjeta a 800 px (ahora es de ancho fijo con truncado) y los títulos de tarjeta se cortaban a 390 px (el enlace baja bajo el título). Quedan truncados con elipsis a 360 dp/130 %, como permite la regla de títulos: los encabezados de los mosaicos 1×1 y "Movimientos recientes". Se resuelve "Ingresos del …" del hero pendiente de F1.

> **F3 (Nuevo movimiento con divulgación progresiva, verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440 y 390 px, claro y oscuro).** Primer nivel en ambos clientes: tipo (control segmentado), monto en la tarjeta hero con su moneda, categoría, billetera, la línea de presupuesto (ahora con icono de estado además del color) y el título con etiqueta visible (antes solo tenía placeholder). Todo lo opcional pasa a "Más opciones", cerrado por defecto: una fila por opción con su valor actual (Fecha y hora, Repetir, Adjuntar, De o Presupuesto, Préstamo o meta) y el campo Nota. Esto reemplaza las 5 casillas de opción que cortaban "Presupues…". El botón Guardar queda fijo abajo en Android (en web ya estaba en el pie del panel). En Android el tipo sale de la tarjeta hero a un control segmentado estándar, igual que en web. Hallazgos al verificar: en oscuro el segmento elegido casi no se distinguía de la pista (ahora tiene borde), y a 360 dp/130 % la línea de presupuesto ocupaba 4 líneas (el porcentaje sube junto al título). "Eliminar con Deshacer" ya existía en ambos clientes (movimientos menores; los importantes piden doble confirmación).

> **F4 · Reportes (verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440 y 390 px, claro y oscuro, pestañas Gastos, Ingresos y Patrimonio).** Todas las gráficas tienen ahora eje de valores con unidades ("$6 M", "$3 M", "$0") y líneas guía, y el tope del eje es un número redondo cercano al máximo. En web cada mes es un botón con tooltip al pasar el mouse, al enfocarlo y al tocarlo, hay un resumen en una frase para lectores de pantalla y un "Ver como tabla" con las cifras; en Android tocar un mes muestra sus cifras en una línea sobre la gráfica, y TalkBack lee el resumen y cada mes. La leyenda lleva signo (+ Ingresos, − Gastos) y las barras siempre van en ese orden, así que no dependen solo del color. El periodo 3M/6M/12M pasa a control segmentado en ambos clientes. En Android los totales del periodo pasan a una cuadrícula 2×2 y las variaciones llevan flecha (↑/↓) además del color, lo que resuelve el hallazgo de §2 sobre "−5 %" en verde. En web las subidas por categoría también llevan flecha. Nota: en modo invitado Android casi no tiene historia antes del mes actual, así que sus barras y variaciones se ven vacías; es la diferencia de datos de ejemplo ya anotada, no un error de la pantalla. Pendiente de F4: el resto de pantallas (Movimientos, Planes, Billeteras, Ajustes y los chips compartidos con check y 40 dp).

> **F4 · Movimientos y chips (verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440 y 390 px, claro y oscuro).** El chip compartido sigue §6.5 en ambos clientes: 40 dp de alto en un área de 48 dp (32 px en web), texto `label`, sin seleccionar con borde `border-input`, y seleccionado en `primary` con un check delante, así la selección no depende solo del color. Se aplica a todos los chips de los formularios (billeteras, frecuencia, período, bloqueo automático). Movimientos pasa al diseño plano: una tarjeta por día con divisores entre filas, y encima el nombre del día y su total alineado a la derecha. Las filas siguen §6.2: icono de 40, título `title-sm`, detalle `body-sm`, monto `amount` con el color de su tipo. Los iconos de adjunto y repetición pasan a la línea de detalle. Los programados llevan un reloj ámbar en vez de la etiqueta "Programado", que a 360 dp/130 % dejaba el detalle en "…". TalkBack lee cada fila como una frase. En Android la última fila ya no queda bajo el botón +. El botón "Programados" de la cabecera tiene icono y borde, y pasa a ser solo icono (con su nombre accesible) cuando no cabe junto al título, que antes se cortaba en "Movimie…". Pendiente de F4: Planes, Billeteras y Ajustes.

> **F4 · Planes (verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440 y 390 px, claro y oscuro, pestañas Presupuestos, Metas y Préstamos).** Presupuestos sigue §6.8 en ambos clientes: nombre con el porcentaje y su icono de estado (✓ / ⚠ / !) en la primera línea, alcance y período debajo, barra de 8 dp y, bajo la barra, "gastado de límite" junto al estado en palabras. Antes el estado iba en una píldora de color y cada tarjeta ocupaba tres líneas de detalle. El resumen de Android ya no dice "Quedan 0 días": el último día dice "Hoy cierra el mes". Metas: "Abonar" pasa a botón tonal (había un botón primario por tarjeta), el lápiz de Android tiene área de 48 dp (antes 19 dp) y las cifras ocupan todo el ancho de la tarjeta (a 360 dp/130 % se partían en "de / $12.000.000"). Préstamos: "Saldado" y "Pendiente" llevan icono además del color, y "Registrar abono" es tonal en web. Las pestañas de Android miden 48 dp, se anuncian como pestañas y muestran un desvanecido cuando una queda fuera de la pantalla. Cabeceras, tarjetas y textos usan los tokens y roles tipográficos. El texto "Abonar" de la web estaba fijo en español y ahora sale de las traducciones. Pendiente de F4: Billeteras y Ajustes.

> **F4 · Billeteras (verificado en emulador a 412 dp y a 360 dp con texto al 130 %, claro y oscuro, y en web a 1440 px en claro y a 390 px en oscuro).** Ambos clientes abren con una tarjeta de resumen: el total en la moneda principal y, si hay billeteras en otra moneda, la nota de conversión. Antes Android lo tenía como nota al pie y la web no lo mostraba. Android pasa a lista plana: una sola tarjeta con una fila por billetera (icono de 40, nombre, detalle y saldo con su "≈" en la moneda principal) y divisores entre filas. El detalle empieza por el "% del total", que Android no mostraba, para que sea lo que se conserva cuando la línea se acorta. Los botones Atrás y Nueva billetera son botones de icono con área de 48 dp y nombre accesible (antes eran los caracteres "←" y "+" en 38 dp). En web la tarjeta de cada billetera usa los tokens y roles tipográficos, y el botón "Nueva billetera" tiene la altura y el icono del sistema. Pendiente de F4: Ajustes.

> ⚠️ **Sobre las capturas web.** Las de `web-light/` y `web-dark/` corresponden a la **web anterior a v2**: sidebar en inglés con Overview · Insights · Analytics · Budgets · Goals · Reports. El código actual ya tiene **Inicio · Movimientos · Planes · Reportes** más Billeteras y Ajustes (`web/src/dashboard/components/Sidebar.tsx`, `NAV_ITEMS`), textos en español con traducción EN (`lib/i18n/translations.ts`) y presupuestos editables. Por eso los hallazgos web de este documento son **provisionales** hasta tener capturas de la web actual (ver §5).

---

## 0. Resumen ejecutivo

| # | Problema | Severidad |
|---|---|---|
| 1 | El texto se parte y se solapa: saludos, títulos, enlaces "Ver todos", etiquetas de presupuesto y chips de acción. | Crítico |
| 2 | Montos cuyo signo "–" queda en una línea y la cifra en otra, así que un gasto se puede leer como positivo. | Crítico |
| 3 | Contraste insuficiente en el texto terciario (ambos temas) y en los colores semánticos del tema claro. El verde de ingresos da **3.33:1**. | Alto |
| 4 | Títulos truncados a 7–8 caracteres y acciones de Nuevo movimiento ilegibles; objetivos táctiles de 32–38 dp sin área ampliada. | Alto |
| 5 | La densidad está mal repartida: en el móvil lo más consultado queda bajo el pliegue, y la web (capturas pre-v2) deja más del 40 % del viewport vacío. | Alto |

**Dirección recomendada:** un sistema híbrido **Bento Box Grid** (pantallas de resumen: Inicio y Reportes) + **Flat / Minimalism Swiss** (listas, formularios, Planes). Los tokens de marca salen **directamente del icono** (violeta → azul eléctrico → cian); el resto de la paleta se corrige a AA; se usan cifras tabulares en todos los montos. **Especificación final: `DESIGN-SYSTEM.md`.**

**Fases:** F0 corrección de texto, contraste y áreas táctiles → F1 tokens de marca unificados → F2 Inicio Bento → F3 Nuevo movimiento → F4 Reportes.

---

## 1. Problemas actuales de UX/UI

### 1.1 Maquetación de texto rota — **Crítico** (`truncation-strategy`, `compact-label-overflow`, `line-height`)

Muchas etiquetas cortas saltan a dos líneas, y la segunda línea se solapa con el elemento siguiente porque el contenedor tiene altura o interlineado fijos.

| Dónde | Evidencia |
|---|---|
| "Buenas tardes" queda debajo de "Mariana" | `app-light/05-inicio.png`, `app-dark/05-inicio.png` |
| "SALDO TOTAL", "Ver todos", "Próximos 7 días" y "4 billeteras" en dos líneas | `app-*/05-inicio.png` |
| "Servicios públicos" se monta sobre su barra de progreso | `app-*/05-inicio.png`, `app-light/22-planes-presupuestos.png` |
| "Gastado en presupuestos" encima de la cifra | `app-light/22-planes-presupuestos.png` |
| Título "Nuevo movimiento" en dos líneas junto a la flecha atrás | `app-light/14-nuevo-completo.png` |
| Los valores del detalle ("Mercado semanal", "Bancolombia · COP", "Alimentación · 68%") se parten | `app-light/10-eliminar-paso2.png` |
| "¿Olvidaste tu contraseña?" y "¿Nuevo aquí? Crear cuenta" partidos | `app-light/01-login.png` |
| *(web pre-v2)* "Mariana Torres" solapado con "account"; textos de "Suggestions" solapados; botones "This month", "Edit profile" y "Export PDF" y pestañas "Cash Flow" / "Net Worth" partidos | `web-light/01-s.png`, `03-s.png`, `09-s.png`, `web-dark/01-screen.png` |

**Causa probable:** `Row` sin `Modifier.weight(1f)` en el bloque de texto, o con `maxLines` sin definir (Compose), y en web `flex` sin `min-width: 0`. A eso se suma un interlineado fijo (`line-height: normal` heredado) que no deja crecer la segunda línea.
**Regla propuesta:** las etiquetas de control, badges, pestañas y botones nunca se parten (`maxLines = 1, softWrap = false` / `white-space: nowrap`). Los títulos de lista se truncan con elipsis y el texto completo va en el detalle. Los contenedores de texto son hijos que pueden encogerse.

### 1.2 Montos separados de su signo — **Crítico** (`number-tabular`, específico de finanzas)

En `app-*/05-inicio.png` (Próximos 7 días) y `app-light/07-movimientos.png` el signo "–" queda solo en una línea y "$232.000", "$180.000" o "$1.450.000" en la siguiente. En una app financiera, un gasto que se lee como ingreso es un error de interpretación del dato, no un simple detalle estético.

**Reglas obligatorias para cualquier monto:**
- El signo, el símbolo y la cifra forman una unidad que no se parte. En Compose: `maxLines = 1` y "−" (U+2212) + NBSP; en web: `white-space: nowrap`.
- Cifras tabulares (`fontFeatureSettings = "tnum"` / `font-variant-numeric: tabular-nums`) para que las columnas se alineen.
- La columna del monto tiene prioridad de ancho; el título es lo que se trunca.

### 1.3 Truncado agresivo de títulos — **Alto** (`truncation-strategy`, `content-priority`)

- En Movimientos (`app-light/07-movimientos.png`) aparecen "Cuota del curso de ingl…", "Arrien…", "Mercado seman…", "Spoti…", "Diseño de lo…" y "Salario mensu…". El título se corta en 7 u 8 caracteres mientras el bloque del monto reserva mucho más ancho del necesario, y los iconos de adjunto o de repetición le quitan aún más espacio.
- En Nuevo movimiento (`app-light/14-nuevo-completo.png`) las acciones rápidas muestran "Aho…", "Repe…", "1 adjun…", "Presupues…" y "M…". Seis acciones quedan sin etiqueta legible, y ese es el camino principal de captura.

### 1.4 Fricción en flujos financieros — **Alto**

| Flujo | Problema | Recomendación |
|---|---|---|
| **Nuevo movimiento** (`app-*/11…21`) | Una sola pantalla con unos 12 controles: tipo, categoría, monto, moneda, billetera, aviso de presupuesto, título, nota, 5 acciones, adjunto y guardar. (`progressive-disclosure`) | Primer nivel: **tipo · monto · categoría · billetera · Guardar**. Segundo nivel ("Más opciones"): fecha, repetir, nota, adjunto, presupuesto. CTA de guardar siempre fijo y visible. |
| **Saldo oculto** (`05-inicio`) | El desenfoque obliga a tocar cada vez y la única pista es el texto "Toca para mostrar". (`gesture-alternative`) | Mantener la preferencia y añadir un botón de ojo con etiqueta accesible y estado on/off. |
| **Eliminar movimiento** (`09-eliminar-paso1`, `10-eliminar-paso2`) | Dos pasos **más** una casilla de "Entiendo…": triple confirmación. (`confirmation-dialogs`, `undo-support`) | Una sola confirmación más una snackbar de **"Deshacer"** de unos 5 s. Reservar la casilla para acciones masivas (borrar billetera o cuenta). |
| **Login** (`01-login`) | Enlaces partidos, y "Crear cuenta" queda casi encima de la barra de gestos. (`safe-area-awareness`) | `WindowInsets.navigationBars` en el pie y enlaces en una sola línea. |
| **Alerta "Administración vence hoy"** (`05-inicio`) | La acción de confirmar no está a la vista; solo hay texto y una "×". | Botón explícito "Confirmar pago" dentro de la tarjeta. |

### 1.5 Densidad de datos incorrecta — **Alto** (`data-density`, `content-priority`, `container-width`)

- **Móvil, Inicio:** cuatro tarjetas a ancho completo apiladas (saldo, alerta, presupuestos, próximos). Los movimientos recientes quedan debajo del pliegue. Cada presupuesto ocupa unos 60 dp de alto.
- **Web (capturas pre-v2, a revalidar):**
  - El contenido ocupa menos del 60 % del alto útil (`web-light/03-s.png`, `05-s.png`, `07-s.png`).
  - El **fondo del sidebar termina en unos 335 px**.
  - Los gráficos no tienen eje de valores ni tooltips (`tooltip-on-interact`, `axis-labels`).
  - "Budget performance" parte "$412.000 / $450.000" sobre la barra (`web-light/09-s.png`).

### 1.6 Consistencia Web ↔ Android — **Alto** (`navigation-consistency`, regla de paridad de `AGENTS.md`)

- **Según el código actual**, la navegación ya es común: Inicio · Movimientos · Planes · Reportes, más Billeteras y Ajustes. El idioma también (ES con EN opcional), y la web ya permite escribir en todas las entidades.
- **Pendiente de verificar visualmente** con capturas nuevas de la web: que se vea igual que Android en jerarquía, tarjeta hero, filas de movimiento, chips y estados.
- Las capturas pre-v2 muestran la web en inglés y con presupuestos de "solo lectura". Si alguna ruta antigua sigue accesible, debe redirigir (`routes.tsx` ya lo hace según `web/AGENTS.md`).
- Nota de UX: el perfil está arriba a la derecha en Android y en el pie del sidebar en la web. Es aceptable como diferencia de plataforma.

### 1.7 Semántica de color de estado — **Medio** (`color-not-only`, `color-guidance`)

Los badges de variación (`app-dark/28-reportes.png`) colorean según bueno o malo, no según el signo: "−5 %" en Gastos sale verde e "−3 %" en Ingresos sale rojo. Es correcto, pero ambiguo sin un icono. En las barras de presupuesto el estado (ok / cerca / excedido) solo se distingue por color.
**Recomendación:** flecha ↑/↓ más icono de estado (✓ / ⚠ / !) y un texto accesible ("5 % menos que el período anterior, favorable").

### 1.8 Otros — **Medio/Bajo**

- El FAB "+" tapa la última fila de las listas (`07-movimientos`, `22-planes-presupuestos`) porque falta padding inferior. (`fixed-element-offset`)
- La tarjeta hero usa un índigo propio (`HeroFrom #16123A → HeroTo #241A5E`) que **no coincide** con el degradado del icono de marca. La marca y el elemento más visible de la app no hablan el mismo color.
- `primary` actual (`#6657E8` / `#6C5CE7`) es un violeta azulado ajeno a la paleta del icono (`#6622D6`, `#9A39F9`…).

---

## 2. Accesibilidad y legibilidad

### 2.1 Contraste de los tokens actuales (WCAG 2.x, texto normal ≥ 4.5:1; UI y bordes de input ≥ 3:1)

Los valores son idénticos en `web/src/index.css` y `ui/theme/Color.kt`.

| Token | Valor | Fondo | Ratio | ¿AA texto? |
|---|---|---|---|---|
| `text-secondary` claro | `#666673` | `#FFFFFF` | 5.66 | ✓ |
| `text-tertiary` claro | `#9C9CAA` | `#FFFFFF` | **2.71** | ✗ |
| `text-tertiary` claro | `#9C9CAA` | `#F7F7FA` (bg) | **2.53** | ✗ |
| `positive` claro (ingresos) | `#22A06B` | `#FFFFFF` | **3.33** | ✗ |
| `warning` claro | `#B5760F` | `#FFFFFF` | **3.77** | ✗ |
| `negative` claro (gastos) | `#D64545` | `#FFFFFF` | **4.38** | ✗ (límite) |
| `primary` claro como texto | `#6657E8` | `#FFFFFF` | 5.13 | ✓ |
| Blanco sobre `primary` | `#FFFFFF` | `#6C5CE7` | 4.86 | ✓ (justo) |
| `text-tertiary` oscuro | `#6F6F82` | `#0E0E15` | **3.91** | ✗ |
| `text-secondary` oscuro | `#A8A8B8` | `#0E0E15` | 8.20 | ✓ |
| `positive` / `negative` / `warning` oscuro | `#32C98A` / `#FF6262` / `#F0B429` | `#0E0E15` | 9.02 / 6.57 / 10.31 | ✓ |
| `border` claro / oscuro | `#EBEBF2` / `#1C1C28` | superficie | **1.19 / 1.14** | ✗ como borde de input (se exige 3:1) |

**Lectura para saldos y montos:**
- En el **tema claro**, los ingresos en verde (3.33) y los avisos en ámbar (3.77) no alcanzan AA en texto de 13–16 px. Los gastos en rojo quedan en el límite.
- Los montos dentro de la tarjeta hero pasan: verde 7.7:1 y rojo 5.6:1.
- El texto terciario (fechas, "Programado · 28 ago · Nequi", metadatos) falla en **ambos temas**, y es justo el texto que da contexto a cada movimiento.
- Los campos de formulario (`01-login`, `31-billetera-crear`) se distinguen por relleno gris sobre gris, sin un borde de 3:1.

### 2.2 Tamaños de texto (`readable-font-size`, `dynamic-type`)

Recuento en `android/app/src/main/java`: **57** usos de `11.sp`, **35** de `11.5.sp`, **11** de `10.5.sp`, **11** de `10.sp` y **3** de `9–9.5.sp`.
**Recomendación:** 12 sp como mínimo absoluto (solo overlines en mayúsculas con tracking), 14 para texto secundario y 16 para cuerpo. Verificar con `fontScale = 2.0` sin recortes. Hoy el texto ya se parte al 100 %, así que a 200 % se romperá más.

### 2.3 Objetivos táctiles (móvil) (`touch-target-size`, `touch-spacing`)

Material exige **48 × 48 dp**. El recuento en el código de Android da:

| Tamaño visual | Usos | Dónde (muestra) |
|---|---|---|
| `38.dp` | 15 | `NovaTopBar.kt`, `HomeScreen.kt` (campana, avatar), `ProfileScreen.kt`, `CategoriesScreen.kt` |
| `36.dp` / `34.dp` / `32.dp` | 2 / 3 / 2 | `NmSheets.kt`, `TransactionDetailScreen.kt`, `CurrenciesScreen.kt`, `FirstRunScreen.kt` |
| Chips de filtro (Todos / Gastos / Ingresos / Pendientes) | — | unos 34 dp de alto (`07-movimientos`) |
| Enlaces de texto "Ver todos", "Programados", la "×" de la alerta y la casilla de eliminar | — | área táctil igual a su texto o icono (unos 20–24 dp) |

Un tamaño visual de 38 dp es aceptable **si** el área táctil se amplía con `Modifier.minimumInteractiveComponentSize()` o con padding. Hoy la mayoría usa `.size()` directo, así que el área de toque es igual a la visual. En la web el mínimo WCAG 2.2 es 24 × 24 px; se recomienda 32 px o más para chips y toggles.

### 2.4 Otros puntos de accesibilidad

- **Solo color:** estado de presupuesto, variaciones y tipo de movimiento. Añadir un icono y el signo +/−. (`color-not-only`)
- **Privacidad por desenfoque:** los lectores de pantalla no deben anunciar el monto oculto. Exponer "Saldo oculto, toca para mostrar" como `contentDescription` / `aria-label`, con el estado.
- **Iconos sin etiqueta:** campana, avatar, "×", lápiz de editar, "⋯". Todos necesitan `contentDescription` / `aria-label`. (`aria-labels`)
- **Foco en web:** anillos de foco visibles en controles segmentados y toggles. (`focus-states`)
- **Movimiento reducido:** el halo animado del FAB y las transiciones deben respetar `prefers-reduced-motion` y la escala de animación del sistema.
- **Gráficos:** falta un resumen textual o una tabla alternativa para lectores de pantalla. (`screen-reader-summary`, `data-table`)

---

## 3. Propuesta del nuevo sistema visual

### 3.1 Estilo recomendado: **Bento Box Grid + Flat/Minimalism (Swiss)**

Del catálogo de estilos de UI/UX Pro Max (79 estilos, 50 activos) se evaluaron:

| Estilo | Veredicto | Motivo |
|---|---|---|
| **Bento Box Grid** | ✅ **Para las pantallas de resumen** (Inicio móvil y web, Reportes) | Tarjetas modulares de tamaños variados, jerarquía clara, complejidad baja, riesgo a11y bajo y soporte claro/oscuro. Sube lo más consultado por encima del pliegue en el móvil y llena el espacio vacío en la web. |
| **Flat Design / Minimalism & Swiss** | ✅ **Para listas, formularios, Planes y Ajustes** | Máxima legibilidad de cifras y buena densidad táctil. |
| Data-Dense Dashboard | ◐ Solo en Reportes web | Útil para tablas comparativas, pero excesivo para el uso diario. |
| Glassmorphism + Dark OLED | ✗ | Es la recomendación genérica del skill para "Personal Finance Tracker", pero el vidrio y el desenfoque bajan el contraste de los montos y se confunden con el desenfoque que ya se usa para ocultar saldos. |
| Claymorphism / Neubrutalism / Aurora | ✗ | Tono lúdico que resta confianza. El skill lista "playful design" como antipatrón para finanzas. |

**Cómo se ve Bento en S2 Nova:**
- Superficies planas con un borde sutil. La **tarjeta hero** es el único elemento con el **degradado de marca** y la única con elevación.
- Radio 20 dp en móvil y 16 px en web. Gap de 12 dp en móvil y 16 px en web.

### 3.2 Paleta

#### 3.2.1 Colores de marca (fijos, extraídos del icono)

Muestreados de `web/src/assets/logo-mark-light.png` y `logo-mark-dark.png` (los mismos que `android/.../drawable-nodpi/logo_mark_*.png`):

| Primitivo | Hex | Origen en el icono |
|---|---|---|
| `brand-lilac` | `#D485FB` | Luz superior del icono claro |
| `brand-violet-400` | `#B859FB` | Tramo medio del icono claro |
| `brand-violet-500` | `#9A39F9` | Tramo medio del icono claro |
| `brand-violet-600` | `#6622D6` | Sombra del icono claro |
| `brand-indigo` | `#5712C2` | Base del icono claro |
| `brand-electric` | `#A80FFA` | Inicio del degradado del icono oscuro |
| `brand-blue` | `#0047F5` | Tramo medio del icono oscuro |
| `brand-cyan` | `#00C4FB` | Final del degradado del icono oscuro |

**Degradados de marca:**
- **Claro:** `#D485FB → #9A39F9 → #6622D6 → #5712C2`
- **Oscuro:** `#A80FFA → #0047F5 → #00C4FB`

#### 3.2.2 Tokens semánticos derivados de la marca (ratios verificados)

| Token | Claro | Ratio | Oscuro | Ratio |
|---|---|---|---|---|
| `primary` (botones, FAB, selección) | **`#6622D6`** | blanco encima **7.60** · como texto 7.60 | **`#6622D6`** | blanco encima 7.60 |
| `primary-pressed` | `#5712C2` | blanco encima 9.25 | `#5712C2` | — |
| `accent-text` (enlaces, "Ver todos") | `#5712C2` | 9.25 | **`#D485FB`** | 7.83 |
| `accent-secondary` (enlaces secundarios, foco) | `#0047F5` | 6.52 | **`#00C4FB`** | 9.42 |
| `focus-ring` | `#0047F5` | ≥ 3:1 | `#00C4FB` | ≥ 3:1 |
| `selected-soft` (chip seleccionado de fondo) | `#6622D6` al 10 % | — | `#A80FFA` al 16 % | — |
| **Hero, claro** | degradado `#5712C2 → #6622D6 → #9A39F9` | blanco ≥ 5.7 | — | — |
| **Hero, oscuro** | — | — | base `#1A0B3D` + resplandor `#A80FFA → #0047F5 → #00C4FB` | blanco 18.1 · cian 8.9 · lila 7.4 |

**Restricciones de uso de la marca:**
- `#00C4FB` (cian) sobre blanco da **2.04**. **Nunca** se usa como texto en tema claro; solo como relleno con texto oscuro (`#0E0E15` sobre cian da 9.42) o como acento en tema oscuro.
- `#0047F5` sobre el fondo oscuro da 2.95, así que en oscuro se usa cian en su lugar.
- `#A80FFA` sobre el fondo oscuro da 3.77, así que en oscuro solo se usa en rellenos, degradados y bordes de 3:1, no como texto.
- La marca se reserva para **acción, selección y hero**. No se usa para codificar datos financieros, así que ingresos y gastos no son violeta ni cian.

#### 3.2.3 Resto de la paleta (rediseñable; propuesta corregida a AA)

| Token | Claro actual → propuesto | Ratio | Oscuro actual → propuesto | Ratio |
|---|---|---|---|---|
| `positive` (ingresos) | `#22A06B` → **`#0F7A4A`** | 5.38 | `#32C98A` (se mantiene) | 9.02 |
| `negative` (gastos) | `#D64545` → **`#C0362F`** | 5.51 | `#FF6262` (se mantiene) | 6.57 |
| `warning` | `#B5760F` → **`#8F5A00`** | 5.78 | `#F0B429` (se mantiene) | 10.31 |
| `text` | `#111118` (se mantiene) | — | `#FFFFFF` (se mantiene) | — |
| `text-secondary` | `#666673` (se mantiene) | 5.66 | `#A8A8B8` (se mantiene) | 8.20 |
| `text-tertiary` | `#9C9CAA` → **`#6B6B7A`** | 5.24 (4.90 sobre bg) | `#6F6F82` → **`#8E8EA0`** | 5.98 |
| `border-input` (nuevo) | → **`#8C8C9C`** | 3.31 | → **`#6A6A82`** | 3.66 |
| `border` decorativo | `#EBEBF2` (se mantiene) | — | `#1C1C28` → `#2E2E40` | separación visible |
| `bg` / `surface` | `#F7F7FA` / `#FFFFFF` | — | `#050507` / `#0E0E15` | — |

**Paleta de gráficos:** series de marca `#6622D6`, `#0047F5`, `#00C4FB` (en oscuro `#D485FB`, `#00C4FB`, `#B859FB`) más los colores de categoría de la taxonomía. Ingresos y gastos en gráficos usan `positive` y `negative`, siempre con leyenda y patrón o etiqueta directa.

**Reglas generales:**
- Ingreso y gasto siempre llevan **signo + color + icono de categoría**. El color nunca va solo.
- Tokens en tres capas (**primitivo de marca → semántico → componente**) con **los mismos nombres** en `web/src/index.css` y `ui/theme/Color.kt`.
- Se eliminan el `primary` azulado actual (`#6657E8` / `#6C5CE7`), el hero índigo (`#16123A → #241A5E`) y los tokens paralelos `--color-login-*`, reemplazados por los tokens de marca.

### 3.3 Tipografía

| Rol | Fuente | Motivo |
|---|---|---|
| Titulares y UI | **Plus Jakarta Sans** (se mantiene) | Ya viene incluida en ambos clientes; geometría redondeada coherente con las esquinas del icono. |
| Cifras y montos | **Plus Jakarta Sans** con `tnum` / `tabular-nums` | La fuente incluye la función OpenType `tnum` (verificado en su tabla GSUB), así que no hace falta una segunda familia. Se elimina Inter de la web. |

Alternativas que el skill ofrece y **no** se recomiendan: *IBM Plex Sans* ("Financial Trust", corporativa) y *Fira Code + Fira Sans* ("Dashboard Data", demasiado técnica). Ninguna resuelve un problema que la corrección de escala no resuelva ya.

**Escala compartida (sp en Android = px en web):**

| Rol | Tamaño / peso / interlineado |
|---|---|
| Display (saldo hero) | 40 / 700 / 1.1 |
| H1 (título de pantalla) | 28 / 700 / 1.2 |
| H2 (título de tarjeta) | 20 / 600 / 1.3 |
| Monto de lista | 16 / 600 / 1.3, tnum |
| Cuerpo | 16 / 400 / 1.5 |
| Secundario | 14 / 400–500 / 1.45 |
| Etiqueta / overline | 12 / 600 / 1.3, tracking +0.04em (mínimo absoluto) |

### 3.4 Espaciado, forma, elevación y movimiento

- **Espaciado:** retícula de 4/8. Tokens 4 · 8 · 12 · 16 · 24 · 32 · 48. Márgenes laterales de 16 dp en móvil y 24–32 px en web.
- **Radios:** 8 (chips e inputs) · 12 (botones) · 20 móvil / 16 web (tarjetas) · 28 (sheets). Son coherentes con los vértices redondeados del icono.
- **Elevación:** nivel 0 (plano con borde) para todas las tarjetas; nivel 1 para hero, sheets y FAB. El FAB usa un halo de `primary` al 30 %.
- **Movimiento:** 150 ms para micro-interacciones y 250 ms para sheets y navegación, con desaceleración al entrar. Se desactiva con movimiento reducido.
- **Objetivos táctiles:** 48 dp de área mínima en Android y 32 px recomendados en web.

---

## 4. Recomendaciones de estructura (para validar)

### 4.1 Arquitectura de información (ya común en código; se mantiene)

```
Android (barra inferior)                 Web (sidebar)
─────────────────────────                ─────────────────────────
Inicio                                   Inicio
Movimientos                              Movimientos
  (+) Nuevo movimiento  [FAB]            Planes (Presupuestos·Metas·Préstamos)
Planes (Presupuestos·Metas·Préstamos)    Reportes
Reportes                                 ── pie ──
Perfil → Billeteras, Categorías,         Billeteras · Ajustes (Categorías, Monedas…)
         Programados, Ajustes
```

Propuesta menor: en la web, dar a **Programados** una entrada propia. Hoy solo se gestionan desde Inicio y Movimientos, mientras Android tiene pantalla propia (`app-*/32-programados.png`).

### 4.2 Esquemas de pantalla

**Inicio móvil (Bento, 2 columnas)**
```
┌───────────────────────────────┐
│ [logo] Hola, Mariana   🔔 (MT)│
├───────────────────────────────┤
│ HERO (degradado de marca) 👁  │  2×1
│ Saldo total      4 billeteras › │
│ $16.147.300                    │
├───────────────┬───────────────┤
│ Ingresos mes  │ Gastos mes    │  1×1 + 1×1
│ +$4.288.500   │ −$1.927.100   │
├───────────────┴───────────────┤
│ ⚠ Administración vence hoy    │  alerta con botón [Confirmar]
├───────────────┬───────────────┤
│ Presupuestos  │ Próximo pago  │  1×1 (top 3 barras) + 1×1
│ ▓▓▓▓▓▓▓░ 94% ! │ 21 ago −$232k │
├───────────────┴───────────────┤
│ Movimientos recientes   Ver → │  lista plana (Flat)
└───────────────────────────────┘
```

**Inicio web (Bento, 12 columnas)**
```
┌──────────────── 8 col ───────────────┬──── 4 col ────┐
│ HERO saldo + tendencia 6 m           │ Ingresos      │
│ (degradado de marca)                 │ Gastos        │
│                                      │ Ahorro        │
├──────── 4 col ───────┬──── 4 col ────┼──── 4 col ────┤
│ Alertas              │ Presupuestos  │ Metas         │
├──────────────────────┴──── 8 col ────┼──── 4 col ────┤
│ Movimientos recientes (tabla)        │ Próximos 14 d │
└──────────────────────────────────────┴───────────────┘
```

**Nuevo movimiento (divulgación progresiva)**
```
[Gasto | Ingreso | Transferencia]
Monto   $168.500            [COP ▾]     ← teclado abierto por defecto
Categoría  Alimentación · Mercado   ›
Billetera  (Bancolombia)(Nequi)(Efectivo)…
Aviso: 87 % del presupuesto Alimentación  ⚠
▸ Más opciones  (fecha · repetir · nota · adjunto · presupuesto)
[        Guardar movimiento        ]   ← fijo, sobre la barra de gestos
```

### 4.3 Contrato de componentes compartidos (mismo comportamiento en ambos clientes)

| Componente | Reglas |
|---|---|
| `AmountText` | Signo "−"/"+" más cifra como unidad sin corte; `tnum`; color semántico más signo; formato por moneda y locale; modo oculto accesible. |
| `ListRow` | Icono de 40 dp · título flexible con elipsis · metadatos en terciario ≥ 4.5:1 · columna de monto de ancho intrínseco · fila de al menos 56 dp. |
| `Chip` / `Segmented` | Nunca se parte; área de al menos 48 dp en Android y 32 px en web; seleccionado = `primary` más peso 600 (no solo color). |
| `StatTile` (bento) | Etiqueta 12 · valor 20–24 tnum · variación con flecha, icono y texto accesible. |
| `ProgressBar` | Barra más porcentaje más icono de estado; umbrales calculados por el backend. |
| `HeroCard` | Degradado de marca según tema; único elemento con elevación. |
| `IconButton` | Visual de 38–40, área de 48; `contentDescription` obligatorio. |

### 4.4 Hoja de ruta propuesta

| Fase | Contenido |
|---|---|
| **F0** | Texto que se parte o se solapa, montos partidos, padding bajo el FAB, áreas táctiles de 48 dp y contraste AA de texto terciario y semánticos. No cambia el aspecto general. |
| **F1** | Tokens de marca del icono (primary, hero, acentos) y escala tipográfica, unificados en `index.css` y `Color.kt`. |
| **F2** | Inicio Bento (móvil y web). |
| **F3** | Nuevo movimiento con divulgación progresiva; eliminar con "Deshacer". |
| **F4** | Reportes (Bento más gráficos con tooltips y ejes) y revisión del resto de pantallas. |

Cada fase pasa por el bucle de verificación visual de `CLAUDE.md` en ambos clientes y ambos temas: captura antes, implementación, captura después, comparación y corrección.

---

## 5. Preguntas abiertas para validar el enfoque

1. ¿Se aprueba el estilo **Bento + Flat/Swiss** y la paleta derivada del icono (primary `#6622D6`, acentos `#0047F5` / `#00C4FB`)?
2. ¿Se aprueba una sola familia, Plus Jakarta Sans con cifras tabulares (`tnum`), o se prefiere explorar otra (la marca solo fija el color)?
3. **Capturas web actuales:** las de `web-light/` y `web-dark/` son pre-v2. ¿Se generan unas nuevas (web en marcha con backend) para cerrar las secciones 1.5 y 1.6?
4. ¿Se empieza por **F0** (solo correcciones) antes de aprobar el rediseño completo?

---

## Apéndice A — Consultas de UI/UX Pro Max ejecutadas

```
search.py "personal finance fintech budgeting app" --design-system -p "S2 Nova" --density 6
search.py "bento grid dashboard"          --domain style
search.py "flat design clean"             --domain style
search.py "fintech personal finance"      --domain color
search.py "fintech dashboard tabular numbers" --domain typography
search.py "personal finance tracker"      --domain product
```
El resultado de `--design-system` (patrón "Trust & Authority + Conversion", paleta dorada) está orientado a landing pages y **no** se adoptó: la paleta de marca viene fijada por el icono. Se tomaron de él las reglas de estilo (Swiss o Minimal) y los antipatrones (evitar diseño lúdico y degradados decorativos fuera de la marca).

## Apéndice B — Cálculo de contraste

```python
def L(h):
    c = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def ratio(a, b):
    a, b = L(a), L(b)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)
```

## Apéndice C — Capturas revisadas en detalle

- **Android actual:** `app-light/01-login`, `05-inicio`, `07-movimientos`, `10-eliminar-paso2`, `14-nuevo-completo`, `22-planes-presupuestos` · `app-dark/05-inicio`, `28-reportes`.
- **Web pre-v2:** `web-light/01-s`, `03-s`, `05-s`, `07-s`, `09-s` · `web-dark/01-screen`, `04-s`.
- **Icono de marca:** `web/src/assets/logo-mark-light.png`, `logo-mark-dark.png`.

El resto del inventario de `app-light/` y `app-dark/` (36 pantallas por tema) sigue los mismos patrones de componentes y se usó para confirmar que los hallazgos se repiten.
