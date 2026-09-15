# SPEC 02 — Página Home y su navegación

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-15
> **Objective:** Agregar la pantalla Home (portada) de `references/templates/home-about/home.jsx` como nueva ruta `/`, moviendo la Biblioteca actual a `/biblioteca` y actualizando el `Nav` y los enlaces internos que dependían de la ruta raíz, sin tocar la pantalla About.

---

## Scope

**In:**

- Nueva ruta `/` — **Home**: hero con silueta flotantes y CTAs, sección "¿Por qué Arcade Vault?", rail de juegos destacados, sección de estadísticas, "Actividad en vivo" (últimas puntuaciones + top jugadores del día), sección de precios/FAQ y CTA final, tal como en `references/templates/home-about/home.jsx`.
- La Biblioteca actual (hoy en `/`) se mueve a `/biblioteca` (ruta nueva `app/biblioteca/page.tsx`), sin cambios de contenido ni comportamiento respecto a lo implementado en SPEC 01.
- Actualización de `components/Nav.tsx`: se agrega el link "Inicio" (primero en el orden: Inicio, Biblioteca, Salón de la Fama), el logo navega a `/`, y el estado activo de "Biblioteca" pasa a evaluarse contra `/biblioteca` y `/juegos/*` en vez de `/`.
- Animación de aparición al hacer scroll (`useReveal` + clases `.reveal`/`.reveal.in`) y el `IntersectionObserver` asociado, portados tal cual del template.
- Silueta decorativas flotantes (`FloatingSilhouettes`, 8 SVGs) e iconos de features (`FeatureIcon`), portados tal cual del template.
- Estilos CSS asociados a Home (`.home*`, `.feature-*`, `.mini-*`, `.stats-inner`/`.stat-block`, `.activity-*`, `.tick-*`, `.top-*`, `.pricing-*`/`.price-*`/`.pc-*`/`.faq-*`, `.final-*`, `.reveal`, `@keyframes float`) portados desde `references/templates/home-about/styles.css` y añadidos a `app/globals.css`, sin duplicar clases ya existentes.
- Actualización de los enlaces "volver" existentes que hoy apuntan a `/` esperando la Biblioteca: "VOLVER AL VAULT" en `app/juegos/[id]/page.tsx` y en `components/GamePlayer.tsx`, y el link "volver" en `app/salon/page.tsx` — todos pasan a apuntar a `/biblioteca`.
- El rail "Juegos disponibles ahora" y el botón "VER TODOS LOS JUEGOS" del Home usan los datos ya existentes en `app/data/games.ts` (`GAMES.slice(0, 6)`), navegando a `/juegos/[id]` y `/biblioteca` respectivamente.
- Los datos de "Actividad en vivo" (últimas puntuaciones, top jugadores del día) se portan como arrays fijos embebidos en el componente Home, igual que en el template, sin integrarlos con `seededScores` ni con `av_scores`.

**Out of scope (queda fuera explícitamente):**

- La pantalla **About** (`references/templates/home-about/about.jsx`) y cualquier ruta o link hacia ella. No se agrega ningún link "Acerca de" al `Nav`.
- Cualquier lógica real detrás de "Actividad en vivo" (no se conecta a partidas reales ni a `localStorage`).
- Cambios al login/registro de `/auth`: sigue redirigiendo a `/` al completarse (que ahora es Home en vez de Biblioteca) — no se toca su lógica interna, solo se hereda el nuevo significado de `/`.
- Cambios de contenido, estilos o comportamiento de la Biblioteca en sí, más allá de moverla de ruta.
- Créditos/monedas reales, autenticación real, base de datos, tests automatizados, internacionalización (igual que SPEC 01).

---

## Data model

No se introduce ningún modelo de datos nuevo. Se reutiliza `GAMES` de `app/data/games.ts` (ya existente) para el rail de juegos destacados. Los arrays de "últimas puntuaciones" y "top jugadores" de la sección "Actividad en vivo" son datos ficticios estáticos definidos localmente dentro del componente Home (mismos valores/forma que `home.jsx` del template), sin tipo compartido ni persistencia.

---

## Implementation plan

1. Crear `app/biblioteca/page.tsx` moviendo tal cual el contenido actual de `app/page.tsx` (Biblioteca: hero, buscador, chips, grid con `GameCard`). El proyecto sigue compilando y `/biblioteca` muestra exactamente lo que hoy muestra `/`.
2. Añadir a `app/globals.css` las clases CSS de Home portadas desde `references/templates/home-about/styles.css` (`.home`, `.home-hero*`, `.home-title*`, `.home-sub`, `.home-ctas`, `.home-silos*`, `.home-section*`, `.feature-grid`, `.feature-card*`, `.mini-rail`, `.mini-card`, `.mini-cover`, `.mini-meta`, `.mini-title`, `.mini-cat`, `.home-stats*`, `.stats-inner`, `.stat-block`, `.stat-n`, `.stat-u`, `.stat-s`, `.home-final*`, `.final-title`, `.final-cta`, `.final-tag`, `.activity-grid`, `.activity-card`, `.ac-head`, `.ac-title`, `.ticker`, `.tick-row`, `.tk-*`, `.lb-link`, `.top-list`, `.top-row*`, `.tp-*`, `.pricing-grid`, `.price-card`, `.pc-*`, `.pricing-faq`, `.faq-item`, `.faq-q`, `.faq-a`, `.reveal`, `.reveal.in`, `@keyframes float`).
3. Reescribir `app/page.tsx` como la pantalla Home (client component), portando `home.jsx`: `useReveal`, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` y la sección completa (hero, why, games preview con `GAMES.slice(0, 6)`, stats, actividad en vivo con arrays fijos, pricing/FAQ, CTA final), usando `useRouter().push(...)` / `next/link` hacia `/biblioteca`, `/juegos/[id]`, `/salon` y `/auth` según corresponda. Verificación manual: cargar `/`, ver que aparecen las 7 secciones, que el scroll dispara las animaciones `.reveal.in`, y que los CTAs navegan a las rutas correctas.
4. Actualizar `components/Nav.tsx`: agregar el link "Inicio" (primero, apuntando a `/`), cambiar el logo para navegar a `/`, y ajustar `isActive` para que "biblioteca" se marque activo en `/biblioteca` y `/juegos/*`, y "inicio" se marque activo solo en `/`. Aplicar el mismo cambio en el panel móvil. Verificación manual: en cada ruta, el link correcto aparece resaltado.
5. Actualizar los enlaces "volver" existentes para que apunten a `/biblioteca` en vez de `/`: "VOLVER AL VAULT" en `app/juegos/[id]/page.tsx` y en `components/GamePlayer.tsx`, y el link "volver" en `app/salon/page.tsx`. Verificación manual: desde Detalle, Reproductor y Salón, el botón de volver lleva a `/biblioteca` con el grid completo de juegos.
6. Revisión final de extremo a extremo en el navegador: recorrer Home (`/`) → Biblioteca (`/biblioteca`) → Detalle → Reproductor → Salón → Auth → Home, confirmando que no hay errores de consola, que `/auth` redirige a `/` (Home) tras iniciar sesión o entrar como invitado, y que el diseño responsive se mantiene en ancho móvil (~400px) sin scroll horizontal.

---

## Acceptance criteria

- [X] `npm run dev` arranca sin errores de compilación ni de consola en `/`, `/biblioteca` y el resto de rutas existentes.
- [X] `/` muestra la pantalla Home completa: hero con CTAs, sección "¿Por qué Arcade Vault?", rail de 6 juegos destacados, sección de estadísticas, "Actividad en vivo" (últimas puntuaciones y top jugadores), precios/FAQ y CTA final.
- [X] `/biblioteca` muestra exactamente el contenido y comportamiento que antes mostraba `/` (buscador, chips de categoría, grid de juegos, mensaje "NO HAY RESULTADOS").
- [X] En el hero de Home, el botón "EXPLORAR JUEGOS" navega a `/biblioteca` y "CREAR CUENTA" navega a `/auth`.
- [X] En el rail de juegos destacados, hacer clic en una mini-tarjeta navega a `/juegos/<id>` del juego correspondiente; "VER TODOS LOS JUEGOS" navega a `/biblioteca`.
- [X] El botón "VER SALÓN" de la sección de actividad navega a `/salon`; el CTA de precios y el CTA final navegan a `/auth` y `/biblioteca` respectivamente (igual que en el template).
- [X] Al hacer scroll en `/`, las secciones marcadas como `.reveal` aparecen con la transición (clase `.in` se agrega al entrar en viewport).
- [X] El `Nav` muestra "Inicio" como primer link, seguido de "Biblioteca" y "Salón de la Fama"; no aparece ningún link "Acerca de".
- [X] El logo del `Nav` navega a `/` desde cualquier pantalla.
- [X] El link activo del `Nav` es "Inicio" en `/`, "Biblioteca" en `/biblioteca` y en `/juegos/*`, y "Salón de la Fama" en `/salon`.
- [X] "VOLVER AL VAULT" en Detalle y en el Reproductor, y el link "volver" en Salón, navegan a `/biblioteca`.
- [X] Iniciar sesión (o entrar como invitado) en `/auth` sigue redirigiendo a `/`, que ahora muestra Home en vez de Biblioteca.
- [X] En una ventana de ~400px de ancho, `/` no produce scroll horizontal y el menú hamburguesa del `Nav` sigue funcionando.

---

## Decisions

- **Sí:** Home pasa a ocupar `/` y la Biblioteca se mueve a `/biblioteca`. Decisión explícita del usuario — coincide con la separación "Inicio"/"Biblioteca" del `Nav` del template y es la convención estándar (el logo y la portada viven en la raíz).
- **No:** dejar Home en una ruta secundaria (ej. `/inicio`) manteniendo Biblioteca en `/`. Descartado por decisión explícita del usuario.
- **Sí:** omitir el link "Acerca de" del `Nav` por completo, sin placeholder. Decisión explícita del usuario — evita exponer navegación hacia una pantalla que no existe todavía; se agrega en un spec futuro de About.
- **Sí:** portar los arrays fijos de "Actividad en vivo" tal cual del template, sin integrarlos al modelo `seededScores`/`av_scores`. Decisión explícita del usuario — mismo criterio de datos ficticios que SPEC 01, evita inventar una lógica de selección no definida en el template.
- **Sí:** los enlaces "volver" existentes ("VOLVER AL VAULT" en Detalle/Reproductor, "volver" en Salón) pasan a apuntar a `/biblioteca`. Decisión explícita del usuario — conservan su significado original ("volver al listado de juegos").
- **Sí:** el login/registro de `/auth` sigue redirigiendo a `/` sin cambios de lógica. Decisión explícita del usuario — ahora `/` es Home, comportamiento estándar de "el login te lleva a la portada".
- **Sí:** portar fielmente `FloatingSilhouettes` (SVGs decorativos animados) y `useReveal` (animaciones al hacer scroll) tal como están en el template. Decisión explícita del usuario, mismo criterio de fidelidad visual que SPEC 01.
- **No:** cualquier cambio a la pantalla About o a cualquier lógica real de actividad/puntuaciones en vivo. Fuera del alcance de este spec.

---

## What is **not** in this spec

- La pantalla About y su ruta/link en el `Nav`.
- Lógica real de "Actividad en vivo" conectada a partidas reales.
- Cambios de contenido o comportamiento de la Biblioteca, Detalle, Reproductor, Salón o Auth más allá de las actualizaciones de rutas/enlaces descritas arriba.
- Tests automatizados, internacionalización, autenticación real, base de datos.

Cada uno de estos, si se implementa, va en su propio spec.
