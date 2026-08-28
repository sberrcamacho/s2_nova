Implementa la pantalla de login de S2 Nova en web y Android, siguiendo LOGIN.md al pie de la letra.

Contexto: el rediseño de S2 Nova ya está aplicado (dashboard web + app Android, temas dark y light). Esta pantalla debe reutilizar los tokens y componentes que ya existen; no dupliques estilos ni definas colores nuevos fuera de los archivos de tema.

## Referencias del paquete
- `LOGIN.md` — spec medida por medida (tokens, layout, estados, accesibilidad).
- `S2 Nova Login.dc.html` — mockup de las 4 variantes (web dark/light, Android dark/light). Ábrelo y lee el markup cuando dudes de un valor: los paths SVG, el logo de Google y las medidas exactas están ahí.
- `assets/logo-mark-dark.png`, `assets/logo-mark-light.png` — marca S2 Nova.

## Web
- Crea la ruta `/login` con su pantalla propia, fuera del layout con sidebar.
- Estructura: contenedor flex de dos columnas; panel de marca 452px fijo a la izquierda, formulario centrado de 340px a la derecha. Debe seguir siendo usable por debajo de 900px: abajo de ese ancho oculta el panel de marca y deja el formulario centrado con padding 24px.
- Las gráficas del panel son SVG inline; cópialas del mockup tal cual (área con degradado + donut con leyenda). No uses la librería de charts para esto: es decoración estática.
- Tema dark y light desde el mismo componente, usando el mecanismo de tema ya existente en el proyecto.
- Formulario controlado con validación: email con formato válido, contraseña mínimo 8 caracteres. Errores según el estado de error de LOGIN.md.
- Google sign-in: usa Google Identity Services (`@react-oauth/google` o el script GIS), botón propio (no el renderizado por Google) que dispara el flujo. Al recibir el credential, envíalo al backend y navega al dashboard. Deja el endpoint detrás de una función `signInWithGoogle(credential)` en la capa de auth existente; si aún no hay backend, deja un TODO claro y un mock.

## Android
- `LoginScreen.kt` en `ui/screens/`, más los composables que necesites en `ui/components/` (por ejemplo `NovaTextField`, `NovaPrimaryButton`, `GoogleSignInButton`) — si ya existen equivalentes, reutilízalos.
- Todos los colores vienen de `Color.kt` / `NovaColors.current`; añade allí los tokens que falten de LOGIN.md en vez de escribir hex en la pantalla.
- `LoginViewModel` con `LoginUiState` (email, password, passwordVisible, isLoading, error) y eventos para submit, toggle de visibilidad y Google.
- Google sign-in con **Credential Manager** (`androidx.credentials` + `googleid`, `GetGoogleIdOption`); no uses la API deprecada de GoogleSignInClient. Añade las dependencias y el `serverClientId` como placeholder en `local.properties`/`BuildConfig`.
- La pantalla es el destino inicial del NavHost cuando no hay sesión; al autenticarse navega a Home limpiando el back stack.

## Reglas
- Respeta los textos del mockup en español, verbatim.
- No cambies ninguna otra pantalla.
- No hace falta compilar, emular ni verificar: escribe el código completo y correcto en una sola pasada.
- Al terminar, lista los archivos creados o modificados.
