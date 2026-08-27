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

El módulo Android ya tiene las 20+ pantallas construidas. El trabajo es visual, no estructural:
la navegación, la hoja del FAB y el orden de campos de `AddTransactionScreen` ya están bien.
El mockup existe en los dos temas y ambos son la misma app.

### Prompt A0 — Orientación

```
Lee android/AGENTS.md, ui/theme/Color.kt, ui/theme/Theme.kt, ui/nav/BottomNavBar.kt y
ui/components/{NovaCard,CategoryIcon,TransactionRow,NovaCharts}.kt.

Abre design_handoff_s2_nova_overview/S2 Nova Android.dc.html y
"S2 Nova Android Light.dc.html" — mismo diseño, tema oscuro y claro.

No escribas código todavía. Dime en qué se diferencian las pantallas actuales del mockup,
pantalla por pantalla, y qué de eso es puramente estilo.
```

### Prompt A1 — Inicio

```
Aplica el mockup a HomeScreen.kt: hero de saldo con gradiente heroFrom→heroTo y glow,
Ingresos/Gastos en dos cajas sobre rgba(255,255,255,.06), tarjeta de presupuestos con las
tres barras, próximos pagos con la columna de fecha, y movimientos recientes.

Reglas:
- Colores solo desde MaterialTheme.colorScheme y NovaColors.current. Ningún Color(0xFF...)
  nuevo en pantallas: si falta un color, va en Color.kt.
- El hero es superficie oscura en ambos temas, así que su texto es Color.White explícito,
  no onBackground.
- Reusa CategoryIcon, NovaCard y TransactionRow. No dupliques sus estilos.

./gradlew assembleDebug y revisa el preview de Compose en claro y en oscuro.
```

### Prompt A2 — Reportes, Presupuestos y Metas

```
Aplica el mockup a ReportsScreen.kt (selector 3M/6M/12M, tabla de totales del periodo,
barras ingresos vs gastos, gasto por categoría) y a BudgetsScreen.kt, incluyendo la
pestaña de metas con el anillo de progreso de 62dp y los botones Abonar / Detalle.

El PrimaryTabRow y sus colores por defecto ya son correctos: no los sobrescribas.
```

### Prompt A3 — Movimientos y Nuevo movimiento

```
Aplica el mockup a TransactionsScreen.kt (encabezados por día con el total del día y filtros
en chips) y a AddTransactionScreen.kt.

En Nuevo movimiento no cambies el orden de campos ni la lógica: solo el hero con el
segmentado sobre rgba(255,255,255,.08), el círculo de categoría a la izquierda del monto,
y los chips de billetera. El método de pago sigue derivándose de la billetera.
```

### Prompt A4 — Las cuatro pantallas de Perfil

```
Aplica el mockup a WalletsScreen.kt, RecurringScreen.kt, LoansScreen.kt y SettingsScreen.kt,
y a las filas de ProfileScreen.kt que llevan a ellas.

Detalles del mockup que vienen del código y deben conservarse:
- Billeteras: círculo de 44dp con el gradiente heroFrom→heroTo e icono blanco por WalletType.
- Recurrentes: intervalo + próxima fecha, "Pausada" cuando active = false, y la fila
  "Vence hoy · Confirmar" solo cuando toca.
- Préstamos: pestañas Prestado/Recibido, "Saldado" en positive cuando loanSettled.
- Ajustes: el correo es un campo deshabilitado; los selectores de moneda e idioma son el
  patrón PreferenceChoiceRow, no un dropdown.
```

### Prompt A5 — Consistencia y temas

```
Recorre la app entera en tema claro y en tema oscuro y arregla:
- Cualquier Color(0xFF...) escrito dentro de una pantalla.
- Texto sobre superficies permanentemente oscuras (hero, escáner) que no sea blanco explícito.
- Rellenos con alpha bajo que desaparezcan en claro.
- Que el switch de modo oscuro de Ajustes no rompa ninguna pantalla.

./gradlew assembleDebug y prueba el toggle de tema en el emulador.
```

---

## 3. Reglas para pegarle a Claude Code al inicio

Ponlas en `CLAUDE.md` en la raíz del repo, o al principio de la sesión:

```
- Los tokens viven en web/src/index.css. Usa clases de token, nunca hex crudos, salvo el
  sidebar y el hero de saldo, que son oscuros en ambos temas.
- Reusa components/ui/ antes de crear un componente nuevo.
- Los .dc.html del handoff son referencia visual, no código para copiar. Sus números están
  hardcodeados; en la app todo sale de los servicios.
- Nada de strings ni formatos de moneda hardcodeados: useTranslation y useCurrency.
- No cambies las rutas ni la estructura de navegación.
- Después de cada pantalla: npx tsc --noEmit y npm run build.
```
