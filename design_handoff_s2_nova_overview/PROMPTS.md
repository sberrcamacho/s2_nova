# Prompts y herramientas para Claude Code

Todo lo que sigue asume que esta carpeta (`design_handoff_s2_nova_overview/`) está en la raíz del
repo `s2_nova`, junto a `web/` y `android/`.

---

## 1. Herramientas requeridas

### Obligatorio

| Herramienta | Para qué | Verificación |
| --- | --- | --- |
| **Claude Code** | Implementar los cambios | `claude --version` |
| **Node 20+ y npm** | `web/` (React 19 + Vite + Tailwind v4) | `node -v` |
| **Git** | Trabajar en rama, revisar diffs | `git --version` |
| **Un navegador** | Abrir los `.dc.html` de referencia | — |

### Solo para el mockup Android

| Herramienta | Para qué |
| --- | --- |
| **JDK 17** | Compilar el módulo Android |
| **Android Studio** (o `sdkmanager` + emulador) | Build, preview de Compose, emulador |
| **Gradle wrapper** | Ya viene en el repo: `./gradlew` |

### Permisos que Claude Code va a pedir

Concédele estos desde el arranque para que no se detenga en cada paso:

- **Edit / Write** en `web/src/**` y `android/app/src/**`
- **Bash** para `npm install`, `npm run dev`, `npm run build`, `npx tsc --noEmit`, `./gradlew`
- **Read** en toda la raíz del repo (necesita leer `web/src/index.css` y los `AGENTS.md`)

No necesita red más allá de `npm install`, ni claves de API: los datos vienen de los mocks del repo.

### Antes del primer prompt

```bash
cd web && npm install && npm run dev    # confirma que el proyecto arranca en verde
```

---

## 2. Prompts

Van en orden. Cada uno es una tarea cerrada — deja que termine y revisa el diff antes de seguir.
No los pegues todos de una vez.

### Prompt 0 — Orientación (una sola vez)

```
Lee design_handoff_s2_nova_overview/README.md completo, y después
web/AGENTS.md, web/src/index.css y web/src/components/ui/.

No escribas código todavía. Dime:
1. Qué componentes de components/ui/ cubren ya lo que pide el handoff y cuáles faltan.
2. Qué tokens del handoff no existen en index.css.
3. En qué orden implementarías las 7 pantallas y por qué.
```

### Prompt 1 — Chrome (sidebar + header)

```
Implementa el chrome del handoff: el sidebar de 212px y el header sticky, tal como los
describe la sección "Chrome (present on every screen)".

Reglas:
- Usa clases de token de Tailwind (bg-surface, text-ink-tertiary, border-border), nunca hex crudos.
- El sidebar queda permanentemente oscuro en ambos temas — es la única excepción.
- Reusa el componente Logo y los iconos de lucide que ya están instalados.
- Las 7 rutas son las que ya existen en el router. No agregues ni quites destinos.

Al terminar corre npx tsc --noEmit y npm run build.
```

### Prompt 2 — Overview

```
Rediseña web/src/dashboard/pages/OverviewPage.tsx según la sección "1. Overview" del handoff.

Referencia visual: abre design_handoff_s2_nova_overview/S2 Nova Dashboard.dc.html (tema oscuro)
y "S2 Nova Dashboard Light.dc.html" (tema claro). Ambos son la misma pantalla; el tema claro
mantiene el hero de saldo y el sidebar oscuros a propósito.

Cambios estructurales respecto al código actual:
- El hero de saldo pasa a ser una tarjeta con gradiente y glow, 1.35fr del ancho.
- Ingresos / Gastos / Ahorro se apilan en una columna de 1fr a su derecha.
- Los cinco chequeos de salud financiera pasan de grid de cinco columnas a lista de una fila
  por chequeo.
- Conserva la lógica de changeTone que ya existe (gastar menos es positivo).

Todos los números salen de los servicios actuales. Ningún string hardcodeado: usa useTranslation
y useCurrency.
```

### Prompt 3 — Las otras seis pantallas

Uno por mensaje, no los seis juntos:

```
Implementa la pantalla Insights según la sección "2. Insights" del handoff.
```

```
Implementa Analytics según la sección "3. Analytics". Las cuatro pestañas deben renderizar
paneles distintos — no basta con estilar la pestaña activa. El selector de rango 3M/6M/12M
alimenta también el gráfico de la pestaña Income.
```

```
Implementa Budgets según la sección "4. Budgets". Es de solo lectura en web.
```

```
Implementa Goals según la sección "5. Goals". Cuando una meta tiene menos de dos meses de
aportes, la nota lo dice — nunca inventes una fecha de finalización.
```

```
Implementa Reports según la sección "6. Reports".
```

```
Implementa Settings según la sección "7. Settings". Conecta idioma, tema y notificaciones a
ThemeContext y userService, que ya existen. hideAmounts es nuevo: agrega el campo de preferencia
y un formateador que difumine los montos hasta el hover.
```

### Prompt 4 — Consistencia

```
Revisa las 7 pantallas contra el handoff y arregla:
- Cualquier hex crudo que debería ser un token.
- Cualquier número que no venga de un servicio.
- Los estados de carga y vacío: Skeleton.tsx y EmptyState.tsx en cada lista.
- Responsive: grid-cols-1 en móvil, sm:grid-cols-2, y las proporciones del handoff en xl.
- Que el toggle de tema no rompa ninguna pantalla.

Corre npx tsc --noEmit, npm run build y npm run lint.
```

### Prompt 4b — Tema claro del dashboard web

```
Abre design_handoff_s2_nova_overview/S2 Nova Dashboard Light.dc.html como referencia del
tema claro. Es la misma pantalla, con los tokens de :root en web/src/index.css.

Recorre las 7 pantallas con el tema en claro y arregla:
1. Hex crudos oscuros que deberían ser tokens.
2. Texto que dependa de un color heredado y quede ilegible sobre blanco.
3. Dos excepciones que siguen oscuras en ambos temas: el sidebar y el hero de saldo
   (--hero-from #16123a → --hero-to #241a5e). Su texto necesita blanco explícito.
4. Rellenos con alpha bajo: sobre blanco se pierden.
5. Sombras: rgba(17,17,24,.04–.12), no negro al 40-60%.

No cambies estructura ni layout, solo color y contraste.
```

---

## Android — sesión aparte

El módulo Android ya tiene las 20+ pantallas construidas, pero este mockup ya no es solo un
retoque visual: trae **funcionalidad nueva y un cambio de navegación**. Lee
`INTERACCIONES.md` antes de empezar.

**La interfaz debe quedar IDÉNTICA al mockup.** Cada medida, color, texto y estado vacío va
tal cual; si dudas, abre el `.dc.html` y míralo. La única excepción es el selector Dark/Light
que rodea el teléfono en el mockup: es el control del prototipo, no parte del producto. La app
es móvil y sigue el tema del sistema — pero ambos temas deben verse idénticos a como los
muestra el mockup en cada posición de ese selector.

Lo que cambia de estructura: la cuarta ranura pasa a **Planes** (Presupuestos · Metas ·
Préstamos), **Préstamos sale de Perfil**, y el saldo del hero pasa a ser la suma de las
billeteras.

### Prompt A0 — Orientación

```
Lee design_handoff_s2_nova_overview/ANDROID.md y INTERACCIONES.md completos, y después
android/AGENTS.md, ui/theme/Color.kt, ui/theme/Theme.kt, ui/nav/BottomNavBar.kt,
ui/nav/NovaNavGraph.kt y ui/components/{NovaCard,CategoryIcon,TransactionRow,NovaCharts}.kt.

Abre design_handoff_s2_nova_overview/S2 Nova Android.dc.html en un navegador y recorre los
flujos: crea un presupuesto, una meta, abónale, elimínala; crea un préstamo y abónale
parcialmente; abre la campana; cambia los ajustes de privacidad.

No escribas código todavía. Dime, pantalla por pantalla, qué se diferencia del mockup
separando tres cosas: qué es puramente estilo, qué es funcionalidad que falta, y qué es
estructura que hay que mover.
```

### Prompt A1 — Tokens y chrome

```
Prepara la base:
1. Agrega a Color.kt los tokens que falten según ANDROID.md (incluidas las 10 categorías de
   METAS, que son un conjunto aparte del de gastos).
2. BottomNavBar: la cuarta ranura pasa de "Presupuestos" a "Planes". Cinco ranuras:
   Inicio · Reportes · [FAB] · Planes · Perfil.
3. NovaNavGraph: Préstamos deja de ser un destino de Perfil y pasa a ser una pestaña de Planes.
   Perfil queda con tres destinos: Billeteras, Recurrentes, Ajustes.
4. "Gestionar recurrentes" desde AddTransaction debe volver a AddTransaction al retroceder,
   no a Perfil: la flecha atrás respeta el origen.

No toques todavía el contenido de las pantallas. ./gradlew assembleDebug.
```

### Prompt A2 — Inicio

```
Aplica el mockup a HomeScreen.kt: hero con gradiente heroFrom→heroTo y glow, chip con el
conteo real de billeteras, Ingresos/Gastos en dos cajas sobre rgba(255,255,255,.06), tarjeta
de presupuestos con las tres barras, próximos pagos con la columna de fecha, y movimientos
recientes.

Además, dos cosas nuevas (ver INTERACCIONES.md):
- El saldo es la SUMA de las billeteras, y respeta el ajuste "Difuminar el saldo total":
  blur de 11dp con "Toca para mostrar" debajo, y transición de .22s.
- La campana abre una hoja de notificaciones DERIVADAS del estado (series que vencen hoy,
  préstamos con vencimiento, presupuestos ≥90%, metas entre 90 y 99%). El punto rojo solo
  aparece si hay no leídas.

Colores solo desde MaterialTheme.colorScheme y NovaColors.current. El hero es oscuro en ambos
temas: su texto va en Color.White explícito.
```

### Prompt A3 — Reportes

```
Aplica el mockup a ReportsScreen.kt: selector 3M/6M/12M, tabla de totales del periodo, barras
ingresos vs gastos y gasto por categoría. El tono de los cambios sigue el significado, no el
signo: gastar menos es positivo.
```

### Prompt A4 — Planes: Presupuestos

```
Convierte BudgetsScreen en PlanesScreen con tres pestañas (Presupuestos · Metas · Préstamos) e
implementa la primera, con CRUD completo según INTERACCIONES.md:

- Tarjeta de resumen ("Gastado en presupuestos"), fila punteada "+ Nuevo presupuesto", y una
  tarjeta por presupuesto con lápiz; la tarjeta completa abre la hoja de edición.
- Hoja modal: nombre, categoría, límite mensual, y "Eliminar presupuesto" solo al editar.
- La categoría se SUGIERE por el nombre (mercado→Alimentación, arriendo→Servicios,
  vacaciones→Entretenimiento…) y deja de sugerirse en cuanto el usuario elige una a mano.
- Guardar deshabilitado hasta que haya nombre y límite > 0.
- El chip de categoría seleccionado calcula su tinta por luminancia, no siempre blanco.
```

### Prompt A5 — Planes: Metas

```
Implementa la pestaña Metas con CRUD completo:

- El modelo guarda contributions por billetera; el actual es su suma. El anillo de 62dp lleva
  el ICONO de la categoría al centro, no el porcentaje.
- Categorías propias de metas (Emergencia, Viaje, Educación, Vivienda, Vehículo, Tecnología,
  Salud, Deuda, Retiro, Otros), también sugeridas por el nombre.
- "Abonar" pide monto y billetera de origen.
- "Eliminar" abre una hoja que pregunta a dónde vuelve el dinero: "Devolver a su origen" con
  el desglose real por billetera, o todo a una billetera. El CTA nombra el monto.

Las notas automáticas: "Sin abonos aún", "Meta cumplida", "Faltan $X".
```

### Prompt A6 — Planes: Préstamos

```
Implementa la pestaña Préstamos con CRUD completo:

- Segmentado de pills Prestado/Recibido (no otra fila de pestañas subrayadas), tarjeta de
  resumen "Te deben"/"Debes" con el total pendiente y "2 registros · 1 saldado".
- Tarjetas con barra de progreso paid/principal y "abonado $X de $Y".
- "Registrar abono" admite abonos PARCIALES: trae el pendiente precargado, atajo "Saldar todo",
  y pide billetera con el texto correcto según el lado.
- Hoja de préstamo: dirección, contraparte, monto, billetera, vencimiento opcional. Cambiar la
  dirección mueve la pestaña al guardar.
```

### Prompt A7 — Movimientos y Nuevo movimiento

```
Aplica el mockup a TransactionsScreen.kt (encabezados por día con el total del día y filtros
en chips) y a AddTransactionScreen.kt.

En Nuevo movimiento: hero con el segmentado sobre rgba(255,255,255,.08), círculo de categoría
a la izquierda del monto, chips de billetera. El método de pago sigue derivándose de la
billetera y el orden de campos no cambia.

Todos los campos deben ser EDITABLES: monto, descripción y nota. La descripción muestra la
etiqueta "SUGERIDO" mientras el usuario no escriba la suya. Los chips de presupuesto y meta
salen de las listas reales, no de constantes.
```

### Prompt A8 — Billeteras y Recurrentes

```
Implementa el CRUD de WalletsScreen.kt y RecurringScreen.kt según INTERACCIONES.md:

- Billeteras: tipo sugerido por el nombre (nequi→Nequi, tarjeta→Tarjeta de crédito,
  ahorro/bancolombia→Cuenta de ahorros…), que define el icono. Eliminar una billetera
  RECONCILIA las selecciones que la apuntaban (billetera activa, destino de transferencia,
  billetera de abono a meta): ninguna puede quedar apuntando a algo que ya no existe.
- Recurrentes: nombre, tipo Gasto/Ingreso (cambia el set de categorías), categoría sugerida,
  monto, frecuencia y próximo cobro. Acciones por fila: Pausar/Reanudar, Editar, y
  "Vence hoy · Confirmar" cuando aplica. Las series no mueven saldo hasta confirmarlas.
- El campo "Próximo cobro" NO es texto libre: date picker de Material 3 con locale es-CO y
  semana desde el lunes. Igual el vencimiento opcional de préstamos.
```

### Prompt A9 — Ajustes, tutorial y Perfil

```
Aplica el mockup a SettingsScreen.kt y a las filas de ProfileScreen.kt:

- Perfil: tres filas navegables, con subtítulos de datos reales (conteo y total de billeteras,
  series activas), no texto fijo.
- Ajustes conserva su tarjeta de preferencias, pero el switch de "Modo oscuro" desaparece: la
  app sigue el tema del sistema.
- Tarjeta nueva "Privacidad y sesión": switch "Difuminar el saldo total" (activo por defecto)
  y "Cierre de sesión automático" en pills 1 min / 5 min / 15 min / 1 hora / Nunca, por
  defecto 5 minutos. La ayuda nombra el método real según el ingreso biométrico.
- "Repetir el tutorial" es una fila navegable con subtítulo "4 pasos · menos de un minuto" que
  abre un recorrido REAL de 4 pasos, con barra segmentada, Saltar, Atrás y Siguiente
  (que en el último dice "Entendido"). Los textos están en INTERACCIONES.md.
```

### Prompt A10 — Consistencia contra el mockup

```
Abre el mockup al lado de la app y recórrela entera en claro y en oscuro. Arregla:
- Cualquier Color(0xFF...) escrito dentro de una pantalla.
- Texto sobre superficies permanentemente oscuras que no sea blanco explícito.
- Rellenos con alpha bajo que desaparezcan en claro.
- Montos sin tabular-nums o sin agrupación es-CO.
- Plurales que no concuerden en sustantivo y adjetivo.
- Cualquier medida, radio o peso que no coincida con ANDROID.md.

./gradlew assembleDebug y prueba en el emulador con el tema del sistema en claro y en oscuro.
```

---

## 3. Reglas para pegarle a Claude Code al inicio

Ponlas en `CLAUDE.md` en la raíz del repo, o al principio de la sesión:

```
- Los tokens viven en web/src/index.css. Usa clases de token, nunca hex crudos, salvo el
  sidebar y el hero de saldo, que son oscuros en ambos temas.
- Reusa components/ui/ antes de crear un componente nuevo.
- Los .dc.html del handoff son el DISEÑO DE RÉCORD: la interfaz debe quedar idéntica a ellos.
  No son código para copiar — sus números están hardcodeados y en la app todo sale de los
  servicios — pero cada medida, color, texto y estado vacío sí va tal cual. Ante cualquier
  duda, abre el archivo y míralo.
- En Android, el selector Dark/Light que rodea el teléfono en el mockup NO se implementa: es
  el control del prototipo. La app sigue el tema del sistema.
- Nada de strings ni formatos de moneda hardcodeados: useTranslation y useCurrency.
- En web, no cambies las rutas ni la estructura de navegación: son 7 destinos.
- En Android sí hay cambio de navegación, y es el único: la cuarta ranura es "Planes"
  (Presupuestos · Metas · Préstamos) y Préstamos sale de Perfil.
- Después de cada pantalla: npx tsc --noEmit y npm run build (web) o ./gradlew assembleDebug
  (android).
```
