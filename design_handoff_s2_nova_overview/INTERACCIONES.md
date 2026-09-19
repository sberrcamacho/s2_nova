# Interacciones y estado — app Android

Complemento de `ANDROID.md`. Ese documento describe cómo se ve cada pantalla; este describe
qué hace. La referencia ejecutable es `S2 Nova Android.dc.html`: ábrelo en un navegador y
recorre los flujos antes de escribir código.

**La interfaz resultante debe ser idéntica a ese archivo.** No es una guía de inspiración.
Cada medida, color, radio, texto y transición que aparece en el mockup va tal cual en la app.
Lo único que se descarta es el selector Dark/Light que rodea el teléfono en el mockup: es el
control del prototipo, no parte del producto. La app usa el tema del sistema.

## Modelo de estado

El mockup mantiene todo en memoria. En la app, cada lista es su propio flujo de datos
(repositorio + `StateFlow`), pero la forma de los objetos y las reglas derivadas deben
coincidir.

### Billeteras

```
Wallet(id, label, kind, amount)
kind ∈ { Cuenta de ahorros, Cuenta corriente, Nequi, Daviplata, Tarjeta de crédito, Efectivo }
```

- El **saldo total del hero en Inicio es la suma de `amount`**, no un campo aparte. El chip
  del hero muestra el conteo ("3 billeteras", singular "1 billetera").
- El `kind` determina el icono del círculo de 44. Se **sugiere a partir del nombre** al
  escribir: nequi→Nequi, daviplata→Daviplata, tarjeta/crédito/visa/master/amex→Tarjeta de
  crédito, corriente→Cuenta corriente, ahorro/bancolombia/davivienda/bbva/banco/cuenta/lulo/
  scotia/itaú→Cuenta de ahorros, efectivo/caja/billetera/bolsillo/cash→Efectivo. En cuanto el
  usuario toca un tipo manualmente la sugerencia deja de sobrescribir.
- Eliminar una billetera **reconcilia las selecciones que la apuntaban**: la billetera activa
  de Nuevo movimiento, el destino de transferencia y la billetera del abono a meta caen a la
  primera disponible. Nunca debe quedar un selector apuntando a algo que ya no existe.
- Los nombres cortos (lo que va antes de "—") son los que se usan en chips: "Bancolombia —
  Ahorros" aparece como "Bancolombia".

### Presupuestos

```
Budget(id, label, spent, limit, category)
```

- `pct = round(spent / limit * 100)`; `0` si `limit == 0`.
- Tono: ≥90% `negative`, ≥65% `warning`, si no `positive`.
- La tarjeta de resumen suma `spent` y `limit` de la lista. Su etiqueta es
  "Gastado en presupuestos" — deliberadamente distinta del total de gastos del mes que
  muestran Inicio y Reportes, porque no son el mismo número.
- **Categoría sugerida por el nombre** (misma mecánica que billeteras, con las categorías de
  gasto): mercado/comida/restaurante/domicilio→Alimentación, taxi/gasolina/peaje→Transporte,
  estudio/semestre/matrícula/curso→Educación, vacaciones/viaje/cine/hotel→Entretenimiento,
  médico/eps/gym/farmacia→Salud, luz/agua/internet/arriendo/factura→Servicios,
  suscripción/streaming/membresía→Suscripciones, ropa/regalo/tecnología/hogar→Compras.
- Estado vacío real: "Aún no tienes presupuestos. Crea el primero y se asignará una categoría
  según el nombre."

### Metas

```
Goal(id, label, target, category, note, contributions: Map<walletName, amount>)
```

- `current` es la **suma de `contributions`**, no un campo. Esa es la pieza central del
  modelo: cada meta recuerda de qué billetera salió cada peso.
- `pct = min(100, round(current / target * 100))`.
- Las metas tienen **su propio conjunto de categorías**, distinto del de gastos, porque
  describen para qué se ahorra, no en qué se gasta:
  Emergencia `#E85D6B`, Viaje `#3DBBA8`, Educación `#5D6BE8`, Vivienda `#E8A23D`,
  Vehículo `#3D8BE8`, Tecnología `#6657E8`, Salud `#22A06B`, Deuda `#8A8A99`,
  Retiro `#B25DE8`, Otros `#9C9CAA`.
- Sugerencia por nombre: fondo/emergencia/imprevisto→Emergencia, viaje/vacaciones/vuelo/
  hotel→Viaje, semestre/maestría/especialización/diplomado→Educación, casa/apartamento/cuota
  inicial/remodelación→Vivienda, carro/moto/bicicleta/soat→Vehículo, portátil/laptop/celular/
  consola→Tecnología, cirugía/ortodoncia/gimnasio→Salud, deuda/tarjeta/préstamo/saldar→Deuda,
  retiro/pensión/inversión/largo plazo→Retiro.
- El centro del anillo de 62 lleva el **icono de la categoría** en su color, no el porcentaje.
  El anillo sí es el porcentaje.
- La nota bajo el monto, cuando la meta no trae una escrita: "Sin abonos aún" si `current==0`,
  "Meta cumplida" si `current>=target`, si no "Faltan $X".

**Abonar** pide monto y billetera de origen, y suma a `contributions[billetera]`.

**Eliminar** es el flujo delicado: la meta tiene dinero, así que antes de borrarla hay que
decidir a dónde vuelve. La hoja de confirmación ofrece:

1. *Devolver a su origen* — subtítulo con el desglose real de `contributions`
   ("Bancolombia $6.000.000 · Nequi $1.800.000 · Efectivo $600.000"). Genera un movimiento por
   billetera.
2. *Todo a <billetera>* — una opción por billetera existente, un solo movimiento.

El CTA nombra el monto: "Eliminar y devolver $8.400.000". Si la meta no tiene abonos, dice
solo "Eliminar meta" y la primera opción muestra "Sin abonos registrados".

### Recurrentes

```
Series(id, label, amount, income, cat, freq, next, active, dueToday, confirmed)
freq ∈ { Semanal, Quincenal, Mensual, Anual }
```

- Las series **no mueven saldo** hasta que el usuario confirma cada cobro. Dilo en la UI: la
  nota de la hoja es "La serie no mueve saldo hasta que confirmas cada cobro."
- Detalle de la fila: "Pausada" si `!active`; si no `freq · Vence hoy` / `freq · Confirmado
  hoy` / `freq · Próximo 24 ago`.
- Acciones por fila: Pausar/Reanudar, Editar, y "Vence hoy · Confirmar" solo cuando aplica.
- El tipo Gasto/Ingreso cambia el conjunto de categorías de la hoja (gasto vs ingreso) y el
  signo y color del monto.
- La fila de Perfil muestra el conteo real de series activas.

### Préstamos

```
Loan(id, side, person, principal, paid, due, wallet)
side ∈ { Prestado, Recibido }
```

- `outstanding = max(0, principal - paid)`; `settled = paid >= principal`.
- **Admite abonos parciales.** La hoja de abono trae el pendiente precargado, con atajo
  "Saldar todo", y pide la billetera. El texto de la billetera cambia de lado: "Billetera que
  recibe el abono" cuando prestaste, "Billetera de donde sale el pago" cuando debes.
- Cada tarjeta lleva barra de progreso `paid/principal` (`positive` si está saldado,
  `primary` si no) y el detalle "abonado $100.000 de $420.000".
- Resumen por pestaña: "Te deben" en Prestado, "Debes" en Recibido, con el total pendiente y
  la línea "2 registros · 1 saldado" (concuerda en número, singular y plural).
- Cambiar la dirección dentro de la hoja mueve la pestaña al lado correspondiente al guardar.

### Notificaciones

La campana de Inicio **no es decorativa y el punto rojo no es estático**: se derivan del
estado. Las notificaciones se generan, en este orden:

1. Series activas con `dueToday` → "Administración vence hoy" · "$232.000 · confírmalo para
   que afecte el saldo" → abre Recurrentes.
2. Préstamos con saldo y fecha → "Camilo Restrepo te debe" / "Le debes a X" · "$420.000 ·
   vence 15 sep" → abre Planes › Préstamos en el lado correcto.
3. Presupuestos al ≥90% → "Servicios al 92% del límite" → abre Planes › Presupuestos.
4. Metas entre 90% y 99% → "Portátil nuevo está al 90%" · "Faltan $520.000 para cumplirla" →
   abre Planes › Metas.

Cada una tiene id estable, estado leído/no leído (fondo `surfaceVariant` y título ExtraBold
mientras no se lee), y navega al tocarla marcándose leída. El punto rojo de la campana solo
aparece si hay no leídas; el encabezado dice "N sin leer" o "Todo al día", con acción
"Marcar leídas". Estado vacío: "Nada pendiente. Te avisamos cuando un cobro venza o un
presupuesto se acerque al límite."

### Fechas

Ningún campo de fecha es texto libre. Los dos que existen — **Próximo cobro** (recurrentes) y
**Vencimiento** (préstamos, opcional) — son filas con icono de calendario de 16 que abren un
selector de mes:

- Encabezado con flechas ← → y "agosto 2026" capitalizado.
- Cabecera de días **iniciando en lunes**: L M M J V S D.
- Grilla de 7 columnas, celdas de 38 y radio 11. Seleccionada: relleno `primary`, texto
  blanco. Hoy sin seleccionar: borde y texto `primary` claro.
- Acciones: "Hoy", "Sin fecha" (solo en el campo opcional) y "Usar esta fecha".
- Internamente las fechas son ISO (`2026-09-15`). Se muestran como "15 sep" en listas y
  "15 de septiembre de 2026" en el campo. El campo vacío dice "Elegir fecha" / "Sin fecha".

En la app esto es un date picker nativo de Material 3 con locale `es-CO` y semana iniciando
en lunes; lo que importa es que el usuario **no pueda teclear una fecha inválida**.

### Ajustes — privacidad y sesión

Tarjeta "Privacidad y sesión", aparte de la de preferencias:

- **Difuminar el saldo total** (switch, activo por defecto). Cuando está activo, el saldo del
  hero se renderiza con `blur(11px)` y debajo aparece "Toca para mostrar"; tocarlo revela y
  vuelve a ocultar. La transición del blur es `.22s ease`. La ayuda cambia con el estado:
  "En Inicio el saldo aparece oculto; tócalo para mostrarlo." / "El saldo se muestra siempre
  al abrir Inicio."
- **Cierre de sesión automático** — pills `1 minuto / 5 minutos / 15 minutos / 1 hora /
  Nunca`, por defecto 5 minutos. El valor activo se repite a la derecha del título en
  `primary`. La ayuda nombra el método real: "Tras 5 minutos sin actividad pedimos tu huella
  de nuevo" si el ingreso biométrico está encendido, "tu contraseña" si no. Con "Nunca":
  "La sesión permanece abierta hasta que cierres manualmente."

### Ajustes — tutorial

"Repetir el tutorial" es una fila navegable con subtítulo "4 pasos · menos de un minuto" que
abre un recorrido real de cuatro pasos, con barra de progreso segmentada arriba, "Saltar",
"Atrás" y "Siguiente" (que en el último paso dice "Entendido"). Los cuatro pasos son:

1. *Todo tu dinero en un solo saldo* — el saldo de Inicio es la suma de las billeteras.
2. *Registra con el botón +* — gasto, ingreso o transferencia; categoría sugerida; movimiento
   próximo.
3. *Presupuestos y metas viven en Planes* — límite mensual por categoría; metas que recuerdan
   el origen de cada abono.
4. *Lo que se repite, automatízalo* — recurrentes con frecuencia, que no mueven saldo hasta
   confirmarlos.

## Navegación

Cinco ranuras: **Inicio · Reportes · [FAB] · Planes · Perfil**.

`Planes` (antes "Presupuestos") tiene tres pestañas: **Presupuestos · Metas · Préstamos**.
Las tres son compromisos con fecha, por eso viven juntas. Dentro de Préstamos, Prestado/
Recibido es un segmentado de pills, no otra fila de pestañas subrayadas — para que se
distinga de las pestañas padre.

Perfil queda con tres destinos: **Billeteras · Recurrentes · Ajustes**.

Las pantallas apiladas (Movimientos, Nuevo movimiento, y los tres destinos de Perfil) ocultan
la barra inferior y llevan encabezado con flecha atrás de 38. "Gestionar recurrentes", el
enlace desde Nuevo movimiento, navega a Recurrentes y **vuelve a Nuevo movimiento** al
retroceder, no a Perfil: la flecha atrás respeta el origen.

## Hojas modales

Todas comparten la misma forma: radio superior 28, asa de 32×4, fondo `surfaceVariant`, y
overlay negro al 65% (72% para el tutorial y el calendario, que van encima de otra hoja).

| Hoja | Abre desde | Campos |
| --- | --- | --- |
| Presupuesto | + / tarjeta en Planes › Presupuestos | nombre, categoría, límite, (eliminar) |
| Meta | + / lápiz en Planes › Metas | nombre, categoría, objetivo, (eliminar) |
| Abonar a meta | botón Abonar | monto, billetera de origen |
| Eliminar meta | "Eliminar meta" | destino del dinero (radio), CTA con monto |
| Préstamo | + / Editar en Planes › Préstamos | dirección, contraparte, monto, billetera, vencimiento, (eliminar) |
| Abono a préstamo | "Registrar abono" | monto (+ "Saldar todo"), billetera |
| Billetera | + / tarjeta en Billeteras | nombre, tipo, saldo, (eliminar) |
| Serie recurrente | + / Editar en Recurrentes | nombre, tipo, categoría, monto, frecuencia, próximo cobro, (eliminar) |
| Calendario | campos de fecha | mes navegable, Hoy, Sin fecha |
| Notificaciones | campana de Inicio | lista derivada, marcar leídas |
| Tutorial | Ajustes | 4 pasos |

Reglas comunes de las hojas:

- El botón Guardar está **deshabilitado** (fondo `surfaceVariant`, texto terciario, sin
  cursor) hasta que los campos obligatorios son válidos: nombre no vacío y monto > 0.
- Los campos de monto son numéricos, se limitan a 12 dígitos y se agrupan con punto de miles
  en vivo (`es-CO`).
- Eliminar es un enlace de texto en `negative` al pie de la hoja de edición, nunca un botón
  primario. Solo aparece al editar, no al crear.
- Tocar el overlay cierra la hoja sin guardar.
- El chip de categoría seleccionado usa **tinta calculada por luminancia** (negro `#111118`
  sobre colores claros, blanco sobre oscuros) para que el texto siempre contraste. No lo
  fijes en blanco.

## Detalles que se suelen perder

- Las cifras usan `tabular-nums`. Sin eso, las columnas de montos bailan.
- Los chips de presupuesto y meta en Nuevo movimiento salen de las listas reales, no de
  constantes: si el usuario crea "Vacaciones", aparece ahí.
- Los campos de Nuevo movimiento son editables, incluido el monto del hero; el título trae la
  etiqueta "SUGERIDO" mientras el usuario no escribe el suyo, y desaparece cuando lo hace.
- Pluralización: concuerdan sustantivo *y* adjetivo ("1 saldado" / "2 saldados",
  "1 billetera" / "3 billeteras", "1 registro" / "2 registros").
