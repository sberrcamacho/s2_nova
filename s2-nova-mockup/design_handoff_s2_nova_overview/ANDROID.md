# Android — especificación del mockup

Referencia visual: `S2 Nova Android.dc.html` (oscuro) y `S2 Nova Android Light.dc.html` (claro).
Son la misma app en los dos temas. Las medidas de abajo son las del mockup, en dp.

Todos los colores salen de `ui/theme/Color.kt` a través de `MaterialTheme.colorScheme` y
`NovaColors.current`. Las tablas nombran el token, no el hex, salvo donde el hex es el valor
literal de un token.

## Tokens

| Rol | Claro | Oscuro | Token |
| --- | --- | --- | --- |
| Fondo | `#FFFFFF` | `#050507` | `colorScheme.background` |
| Superficie de tarjeta | `#FFFFFF` | `#0E0E15` | `colorScheme.surface` |
| Superficie elevada | `#F7F7FA` | `#13131D` | `surfaceVariant` |
| Borde | `#EBEBF2` | `#1C1C28` | `NovaColors.current.border` |
| Borde fuerte | `#DCDCE6` | `#262635` | `border.strong` |
| Divisor dentro de tarjeta | `#F0F0F5` | `#16161F` | borde al ~60% |
| Tinta | `#111118` | `#FFFFFF` | `onBackground` |
| Tinta secundaria | `#666673` | `#A8A8B8` | `onSurfaceVariant` |
| Tinta terciaria | `#9C9CAA` | `#6F6F82` | terciaria |
| Primario | `#6657E8` | `#6C5CE7` | `colorScheme.primary` |
| Primario claro | `#7B6FF6` | `#8578FF` | `primarySecondary` |
| Contenedor primario | `#EAE7FF` | `rgba(108,92,231,.16)` | `primaryContainer` |
| Positivo | `#22A06B` | `#32C98A` | `NovaColors.current.positive` |
| Negativo | `#D64545` | `#FF6262` | `negative` |
| Advertencia | `#B5760F` | `#F0B429` | `warning` |
| Hero desde → hasta | `#16123A → #241A5E` | `#050507 → #211A4D` | `heroFrom` / `heroTo` |

Colores de categoría (idénticos en ambos temas, de `MockCategories.kt`):
alimentación `#E8A23D`, transporte `#3D8BE8`, compras `#3DBBA8`, salud `#E85D6B`,
educación `#5D6BE8`, entretenimiento `#B25DE8`, servicios `#8A8A99`,
suscripciones `#D95DB2`, salario `#22A06B`, freelance `#6657E8`, otros `#9C9CAA`.

## Tipografía

Plus Jakarta Sans. Los montos van con la fuente numérica y `tabular-nums`.

| Uso | sp / peso / tracking |
| --- | --- |
| Saldo del hero | 34 / ExtraBold / −0.03em |
| Monto en Nuevo movimiento | 20 / ExtraBold |
| Título de pantalla | 21 / ExtraBold / −0.02em |
| Título de pantalla apilada | 17 / ExtraBold / −0.015em |
| Título de tarjeta | 13.5 / ExtraBold |
| Cifra grande en tarjeta | 20–22 / ExtraBold / −0.025em |
| Título de fila | 13 / Bold |
| Detalle de fila | 11–11.5 / Normal / tinta secundaria |
| Cejilla / encabezado de grupo | 10–10.5 / Bold / tracking 0.1em / mayúsculas |
| Chip, pill, delta | 11–12 / Bold–ExtraBold |
| Etiqueta de pestaña inferior | 10 / Medium (Bold si activa) |

## Geometría

- Radios: hero 24; tarjeta 18–20; tarjeta anidada y campo 14; chip de tipo 12; pill 999.
- Padding: pantalla horizontal 20; tarjeta 16–18; campo 12–14 vertical.
- Gaps: 12–16 entre tarjetas, 13–14 dentro de un grupo.
- Barras de progreso: 6 de alto, 3 de radio, track `border`. La del total en Presupuestos es de 7.
- Anillo de meta: 62, `conic-gradient` con círculo interior de 48 en color de superficie.
- Marca de categoría: círculo de 38 (34 en filas de Perfil), relleno al 13% del color y glifo
  al 46% del diámetro en el color sólido. Es `CategoryIcon`, no un cuadro de color.
- Sombra del FAB: `0 8dp 24dp` primario al 40–45%.

## Chrome

### Barra inferior — `NavigationBar`

`containerColor = colorScheme.surface`, borde superior de 1 en `border`, padding 8/8/4.
Cinco ranuras: **Inicio · Reportes · [FAB] · Presupuestos · Perfil**. La ranura central no es
un ítem: es el FAB de 52, `CircleShape`, primario, que abre `AddActionsSheet`.

Ítem: icono de 22 dentro de una píldora de 58×30 (`primaryContainer` si está activo, si no
transparente), etiqueta debajo con gap 3. Activo `primary`, inactivo `onSurfaceVariant`.

La barra se oculta en las pantallas apiladas (Movimientos, Nuevo movimiento y las cuatro de
Perfil), que en su lugar llevan encabezado con flecha atrás de 38.

### Hoja del FAB — `AddActionsSheet`

`RoundedCornerShape(28.dp)` arriba, asa de 32×4, y exactamente **dos** acciones: "Registrar
manualmente" y "Escanear código". Cada una es un círculo de 44 con el icono en primario,
título de 14 y detalle de 11.5. No agregues más acciones.

## Pantallas

### Inicio

Encabezado: logo de 34 (radio 10) + saludo de 11 sobre nombre de 16/ExtraBold; a la derecha
campana de 38 con punto de notificación de 7 en `negative`, y avatar de 38 en primario.

**Hero de saldo** — superficie oscura en ambos temas, así que su texto va en `Color.White`
explícito. Radio 24, borde `#2B2450`, padding 22, gradiente `heroFrom → heroTo`, y un glow
de 170 desenfocado 46 en primario al 38–42%, desplazado arriba a la derecha.
Dentro: cejilla "SALDO TOTAL" en `#EAE7FF`; chip "3 billeteras" en blanco al 10% con texto al
70%; saldo de 34; y dos cajas de igual ancho (blanco al 6%, radio 14) con Ingresos en
`positive` y Gastos en `negative`.

Luego tres tarjetas: **Presupuestos** (tres barras con porcentaje, enlace "Ver todos"),
**Próximos pagos** (columna de fecha de 42 con mes de 9.5 y día de 15, nombre, monto) y
**Movimientos recientes** (filas con marca de categoría, descripción, `comercio · fecha`, monto).

El tono de las barras y porcentajes de presupuesto: ≥90% `negative`, ≥65% `warning`, si no
`positive`.

### Reportes

Título de 21 y tres chips de rango `3M / 6M / 12M`. Tres tarjetas: totales del periodo
(cuatro filas con valor y pill de cambio, donde el tono sigue el significado y no el signo),
ingresos vs gastos (pares de barras de 16 máx., alto 132) y gasto por categoría (cinco barras).

### Presupuestos

`PrimaryTabRow` con **Presupuestos** y **Metas** — colores por defecto: activa `onSurface`,
inactiva `onSurfaceVariant`, indicador `primary`.

Pestaña Presupuestos: tarjeta de resumen (gastado, límite, barra de 7, días y saldo restante)
y una tarjeta por presupuesto con marca de categoría, porcentaje en pill, `gastado de límite`
y barra. El borde de la tarjeta cambia a `#F0D2D2` / `#3A2029` cuando pasa del 90%.

Pestaña Metas: anillo de 62 con porcentaje al centro, nombre, `actual de objetivo`, nota, y un
botón **Abonar** a todo el ancho. No hay pantalla de detalle de metas, así que no hay segundo
botón.

### Movimientos

Pantalla apilada. Cuatro chips de filtro y grupos por día: encabezado con la fecha y el total
del día, luego filas de 38 con marca, descripción, `comercio · billetera` y monto.

### Nuevo movimiento

Hero oscuro en ambos temas (`heroFrom → heroTo`, radio 22, padding 20, texto blanco):
segmentado de tres en una pill de blanco al 8% (activa blanca con texto `#211A4D`), círculo de
categoría de 56 a la izquierda y campo de monto con `$` y la cifra en 20.

Debajo, en este orden: **Billetera** (chips) con la nota de que el método de pago lo deriva el
servidor · **Transferir a** solo cuando el tipo es Transferencia · **Descripción** ·
**Nota** · **Más opciones** desplegable (presupuesto, meta, switch "Próximo (planeado)",
switch de préstamo y el enlace a Recurrentes) · botón **Guardar movimiento**.

Hoja de categorías: asa, título de 15, y grilla de cuatro columnas con círculos de 52. El
seleccionado sube el relleno al 24% y toma borde de 2 en su propio color. El conjunto cambia
según el tipo: nueve categorías de gasto, tres de ingreso.

Switch: track 42×24, knob de 18 blanco, `primary` encendido y `border.strong` apagado.

### Perfil y sus cuatro destinos

Perfil: tarjeta de identidad (avatar de 54, nombre de 15.5, correo, ciudad y antigüedad),
lista de cuatro filas navegables con marca de 34 y chevron, y "Cerrar sesión" en `negative`.

- **Billeteras** — encabezado con `+`. Una tarjeta por billetera: círculo de 44 con el
  gradiente hero e icono blanco según `WalletType`, nombre, tipo y saldo. Al pie, la nota de
  que el saldo total de Inicio es la suma de estas billeteras.
- **Recurrentes** — encabezado con `+`. Una tarjeta por serie: marca de categoría, nombre,
  `intervalo · próxima fecha` (o "Pausada"), monto con signo, y la acción Pausar/Reanudar.
  Cuando la serie vence hoy aparece además "Vence hoy · Confirmar".
- **Préstamos** — `PrimaryTabRow` Prestado/Recibido. Tarjetas con contraparte, vencimiento
  (o "Sin fecha de vencimiento"), monto y la acción Saldar, que pasa a "Saldado" en `positive`.
  Recibido está vacío y muestra su estado vacío real.
- **Ajustes** — datos personales en campos de 14 de radio, con el correo deshabilitado sobre
  `surfaceVariant`; botón Guardar cambios; tarjeta de preferencias con los switches de modo
  oscuro, notificaciones e ingreso biométrico más los selectores COP/USD e idioma en el patrón
  de dos pills; "Repetir el tutorial"; y la tarjeta Acerca de.
