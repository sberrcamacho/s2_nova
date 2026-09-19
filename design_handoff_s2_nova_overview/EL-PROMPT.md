# El prompt

Un solo mensaje para arrancar. Elige la variante según la plataforma. Después de que Claude
responda el paso 0, le vas pasando los prompts numerados de `PROMPTS.md`.

**La app debe quedar idéntica al mockup.** Esa exigencia está escrita dentro de los dos
prompts; no la quites al copiarlos.

---

## Web — `web/`

```
Vas a aplicar un rediseño visual al módulo web/ de este repo. El diseño ya está definido;
no inventes pantallas ni cambies rutas.

Lee primero, en este orden:
1. design_handoff_s2_nova_overview/README.md  — la especificación completa, medida por medida
2. web/AGENTS.md
3. web/src/index.css  — todos los tokens salen de aquí
4. web/src/components/ui/  — los primitivos que debes reusar

Referencia visual, ábrelas en un navegador:
- design_handoff_s2_nova_overview/S2 Nova Dashboard.dc.html        (tema oscuro)
- design_handoff_s2_nova_overview/S2 Nova Dashboard Light.dc.html  (tema claro)
Son la misma app en los dos temas. Son referencia, no código para copiar: sus números están
hardcodeados y en la app todo sale de los servicios.

Reglas para todo el trabajo:
- Usa clases de token (bg-surface, text-ink-tertiary, border-border), nunca hex crudos.
- Dos superficies son oscuras en AMBOS temas: la barra lateral y el hero de saldo
  (--hero-from #16123a → --hero-to #241a5e). Su texto va en blanco explícito, no heredado:
  ahí es donde suele fallar el tema claro.
- Reusa Card, Badge, ProgressBar, KPICard, Tabs, CategoryIcon y TransactionRow antes de
  escribir un primitivo nuevo.
- Nada de strings ni formatos de moneda hardcodeados: useTranslation y useCurrency.
- No cambies las rutas ni la estructura de navegación. Son 7 destinos, ni uno más.
- Los rellenos con alpha bajo que se ven bien en oscuro desaparecen en claro. Súbelos.

Orden de trabajo, una pantalla por turno. Detente después de cada una, dime qué cambiaste y
espera mi confirmación antes de seguir:
1. Chrome (barra lateral + header)
2. Overview
3. Insights
4. Analytics  (las cuatro pestañas renderizan paneles distintos, no solo estilo de pestaña)
5. Budgets  (solo lectura en web)
6. Goals
7. Reports
8. Settings
9. Pasada final de consistencia en los dos temas

Empieza por el paso 0: no escribas código todavía. Lee todo lo anterior y dime, pantalla por
pantalla, qué se diferencia del mockup y qué de eso es puramente estilo.

Después de cada pantalla: npx tsc --noEmit y npm run build.
```

---

## Android — `android/`

```
Vas a aplicar un rediseño visual **y una tanda de funcionalidad nueva** al módulo android/ de
este repo. El diseño ya está definido; no inventes pantallas ni copy.

La regla que manda sobre todas: **la interfaz debe quedar IDÉNTICA al mockup.** No es una
referencia de inspiración. Cada medida, radio, color, peso, texto, estado vacío, orden de
secciones y transición va tal cual. Si dudas de algo, abre el .dc.html y míralo: el archivo
manda sobre la documentación. Única excepción: el selector Dark/Light que rodea el teléfono en
el mockup NO se implementa — es el control del prototipo para revisar los dos temas en una
página, no parte del producto. Es una app móvil: sigue el tema del sistema. Los dos temas sí
deben verse idénticos a como los muestra el mockup en cada posición de ese selector.

Lee primero, en este orden:
1. design_handoff_s2_nova_overview/ANDROID.md       — cómo se ve, medida por medida
2. design_handoff_s2_nova_overview/INTERACCIONES.md — qué hace: estado, CRUD, validaciones
3. android/AGENTS.md
4. ui/theme/Color.kt y ui/theme/Theme.kt  — todos los tokens salen de aquí
5. ui/nav/BottomNavBar.kt y ui/nav/NovaNavGraph.kt
6. ui/components/NovaCard.kt, CategoryIcon.kt, TransactionRow.kt, NovaCharts.kt

Referencia visual, ábrela en un navegador:
- design_handoff_s2_nova_overview/S2 Nova Android.dc.html
Trae los dos temas y toda la interacción real. Recorre los flujos antes de escribir código.
Sus números están hardcodeados: en la app todo sale de los ViewModels.

Reglas para todo el trabajo:
- Ningún Color(0xFF...) nuevo dentro de una pantalla. Todo desde MaterialTheme.colorScheme y
  NovaColors.current; si falta un color, se agrega a Color.kt.
- Dos superficies son oscuras en AMBOS temas: el hero de saldo y el hero de Nuevo movimiento.
  Su texto va en Color.White explícito, nunca onSurface: ahí es donde suele fallar el claro.
- Reusa CategoryIcon, NovaCard, TransactionRow y NovaCharts. No dupliques sus estilos.
- No toques la hoja del FAB (son dos acciones, no más) ni el orden de campos de
  AddTransactionScreen: ya coinciden con el diseño.
- Los rellenos con alpha bajo que se ven bien en oscuro desaparecen en claro. Súbelos.
- Todos los montos con tabular-nums y agrupación es-CO.
- Ningún campo de fecha es texto libre: date picker con locale es-CO y semana desde el lunes.
- Concordancia de plurales en sustantivo Y adjetivo ("1 saldado" / "2 saldados").

Cambios estructurales respecto al código actual (con detalle en INTERACCIONES.md):
- La cuarta ranura de la barra inferior pasa de "Presupuestos" a **Planes**, con tres pestañas:
  Presupuestos · Metas · Préstamos.
- **Préstamos sale de Perfil** y entra a Planes. Perfil queda con tres destinos: Billeteras,
  Recurrentes, Ajustes.
- El saldo del hero es la SUMA de las billeteras, no un campo aparte.
- Presupuestos, metas, préstamos, billeteras y series recurrentes necesitan CRUD completo con
  hoja modal, y categoría/tipo sugerido a partir del nombre.
- Las metas guardan contributions por billetera; al eliminarlas hay que elegir a dónde vuelve
  el dinero (a su origen, con desglose real, o todo a una billetera).
- La campana de Inicio muestra notificaciones derivadas del estado, no un punto estático.
- Ajustes gana la tarjeta "Privacidad y sesión" (difuminar saldo, cierre de sesión automático)
  y "Repetir el tutorial" abre un recorrido real de 4 pasos.

Orden de trabajo, una pantalla por turno. Deténte después de cada una, dime qué cambiaste y
espera mi confirmación antes de seguir:
1. Tokens y chrome (Color.kt, BottomNavBar con la ranura Planes)
2. HomeScreen (incluido el saldo difuminado y la hoja de notificaciones)
3. ReportsScreen
4. PlanesScreen — pestaña Presupuestos, con su CRUD
5. PlanesScreen — pestaña Metas, con abonos y el flujo de eliminación
6. PlanesScreen — pestaña Préstamos, con abonos parciales
7. TransactionsScreen
8. AddTransactionScreen (campos editables)
9. WalletsScreen y RecurringScreen, con su CRUD y el date picker
10. SettingsScreen, tutorial y las filas de ProfileScreen
11. Pasada final de consistencia en los dos temas, mockup al lado

Empieza por el paso 0: no escribas código todavía. Lee todo lo anterior, recorre el mockup y
dime, pantalla por pantalla, qué se diferencia de él: qué es puramente estilo, qué es
funcionalidad que falta y qué es estructura que hay que mover.

Después de cada pantalla: ./gradlew assembleDebug y revisa el preview de Compose en claro y
en oscuro.
```
