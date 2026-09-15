# SPEC 01 — MVP visual de las pantallas de Arcade Vault

> **Status:** Implemented
> **Depends on:** ninguna
> **Date:** 2026-09-14
> **Objective:** Portar las 5 pantallas del prototipo estático en `references/templates/` (Biblioteca, Detalle, Reproductor, Salón de la Fama, Auth) a rutas reales de Next.js App Router, en TypeScript/React, con datos ficticios y sin implementar lógica de ningún juego real.

---

## Scope

**In:**

- Ruta `/` — **Biblioteca**: hero, buscador, chips de categoría y grid de tarjetas de juego (`GameCard`), tal como en `references/templates/biblioteca.jsx`.
- Ruta `/juegos/[id]` — **Detalle**: portada, tags, descripción, stats, botones "JUGAR AHORA" / "VOLVER AL VAULT" y tabla de mejores puntuaciones, tal como en `references/templates/detalle.jsx`.
- Ruta `/juegos/[id]/jugar` — **Reproductor**: HUD (jugador, puntuación, vidas, nivel), pantalla CRT con la animación CSS de nave/enemigos y el incremento automático de puntuación cada 220ms (misma simulación visual del template, no es un juego jugable), modal de fin de partida con guardado de puntuación, tal como en `references/templates/reproductor.jsx`.
- Ruta `/salon` — **Salón de la Fama**: tabs por juego, podio (oro/plata/bronce) y tabla de ranking, incluyendo la fila "tu mejor marca" cuando hay sesión iniciada, tal como en `references/templates/salon.jsx`.
- Ruta `/auth` — **Auth**: tabs "Iniciar sesión" / "Crear cuenta", formulario, botón "Jugar como invitado" y botones sociales decorativos (sin integración real), tal como en `references/templates/auth.jsx`.
- Navegación (`Nav`) persistente en el layout raíz, con estado activo por ruta, contador de créditos decorativo, botón de sesión/cerrar sesión y menú móvil (hamburguesa), tal como en `references/templates/nav.jsx`.
- Persistencia mock en `localStorage` para sesión de usuario (`av_user`) y puntuaciones guardadas (`av_scores`), replicando el comportamiento de `app.jsx` del template.
- Datos ficticios (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados a `app/data/games.ts`, con un comentario indicando que a futuro vendrán de una base de datos.
- Estilos ya portados en `app/globals.css` y fuentes ya configuradas en `app/layout.tsx` (heredados de specs previos de este mismo repo) — se reutilizan tal cual, sin duplicar CSS.
- Responsive tal como está definido en `app/globals.css` (media queries ya existentes para navbar y grids).

**Out of scope (for future specs):**

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, etc.). El reproductor sigue siendo una simulación puramente visual.
- Autenticación real (backend, OAuth con Google/GitHub, validación de credenciales). Los botones sociales y el formulario son decorativos; "iniciar sesión" solo guarda un nombre en `localStorage`.
- Persistencia en base de datos o API real. Todo sigue siendo mock en el navegador.
- Cualquier lógica de créditos/monedas real (el contador "CRÉDITOS · 03" es decorativo, igual que en el template).
- Tests automatizados (no hay test runner configurado en el repo).
- Internacionalización (la UI queda en español, igual que el template).

---

## Data model

Se porta `references/templates/data.jsx` a `app/data/games.ts`, con tipos TypeScript:

```ts
// app/data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS ya definida en globals.css (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[] = [ /* mismos 8 juegos del template */ ];
export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export function seededScores(seed: number, count?: number): ScoreRow[] { /* mismo algoritmo pseudoaleatorio del template */ }
```

Sesión de usuario y puntuaciones guardadas (mock en `localStorage`, sin cambios de forma respecto al template):

```ts
// forma de av_user
{ name: string }

// forma de cada entrada en av_scores
{ game: string; score: number; name: string; at: number }
```

Esto reemplaza el estado `route`/`user` que en el template vivía en `app.jsx`: en la versión Next.js, la sesión se maneja con un `SessionProvider` de cliente (`components/SessionProvider.tsx`) que expone `user`, `login`, `logout` y `saveScore` vía contexto de React, leyendo/escribiendo las mismas claves de `localStorage`.

---

## Implementation plan

1. Crear `app/data/games.ts` con los tipos, `GAMES`, `CATS` y `seededScores`, portados desde `references/templates/data.jsx`. El proyecto sigue compilando (`npm run dev` arranca sin errores) aunque nada lo use todavía.
2. Crear `components/SessionProvider.tsx` (client component) con contexto de sesión (`user`, `login`, `logout`, `saveScore`) leyendo/escribiendo `av_user` y `av_scores` en `localStorage`, y envolver `{children}` con él en `app/layout.tsx`.
3. Crear `components/Nav.tsx` (client component) portado de `nav.jsx`, usando `usePathname` de `next/navigation` para el estado activo y `next/link` para navegar a `/`, `/salon` y `/auth`; usa el contexto de sesión para mostrar "Iniciar Sesión" o el nombre del usuario. Insertarlo en `app/layout.tsx` antes de `{children}`, dentro del `<main className="av-main">`.
4. Crear `components/GameCard.tsx` portado de la función `GameCard` en `biblioteca.jsx` (incluye el efecto de tilt con `onMouseMove`/`onMouseLeave`).
5. Implementar `app/page.tsx` (Biblioteca) usando `GameCard`, el buscador y los chips de categoría, con estado local de `q` y `cat`; los clics navegan con `next/link` o `useRouter().push` a `/juegos/[id]`. Verificación manual: cargar `/`, buscar por texto, filtrar por categoría, ver "NO HAY RESULTADOS" cuando no hay coincidencias.
6. Implementar `app/juegos/[id]/page.tsx` (Detalle) portado de `detalle.jsx`, resolviendo el juego con `GAMES.find` y las puntuaciones con `seededScores`; si el `id` no existe, usar `notFound()` de `next/navigation`. Verificación manual: navegar desde una tarjeta y ver portada, tags, stats y leaderboard.
7. Implementar `app/juegos/[id]/jugar/page.tsx` (Reproductor) portado de `reproductor.jsx` como client component, usando el contexto de sesión para el nombre del jugador y `saveScore`. Verificación manual: la puntuación sube sola, pausa/reanuda funciona, "FIN" abre el modal, guardar puntuación funciona y navega de vuelta.
8. Implementar `app/salon/page.tsx` (Salón de la Fama) portado de `salon.jsx`, con tabs por juego y podio; usa el contexto de sesión para mostrar la fila "tu mejor marca". Verificación manual: cambiar de tab actualiza podio y tabla con animación de entrada.
9. Implementar `app/auth/page.tsx` (Auth) portado de `auth.jsx`, usando el contexto de sesión (`login`) y `useRouter().push("/")` al enviar el formulario o al pulsar "Jugar como invitado". Verificación manual: iniciar sesión como invitado y logueado, ver que el `Nav` refleja el cambio y que persiste tras recargar la página.
10. Revisión final de extremo a extremo en el navegador: recorrer Biblioteca → Detalle → Reproductor → Salón → Auth → Biblioteca, confirmando que no hay errores en consola y que el diseño responsive se mantiene en ancho móvil (~400px).

---

## Acceptance criteria

- [X] `npm run dev` arranca sin errores de compilación ni de consola en ninguna de las 5 rutas.
- [X] `/` muestra el grid de 8 juegos; buscar "caída" deja solo ese juego; filtrar por "SHOOTER" muestra solo Invasores y Rocas; una búsqueda sin resultados muestra "NO HAY RESULTADOS".
- [X] Hacer clic en una tarjeta o en su botón "JUGAR" navega a `/juegos/<id>` con la información de ese juego exacto (título, descripción, stats, tabla de puntuaciones).
- [X] En `/juegos/<id>`, pulsar "JUGAR AHORA" navega a `/juegos/<id>/jugar`; pulsar "VOLVER AL VAULT" navega a `/`.
- [X] En `/juegos/<id>/jugar`, la puntuación aumenta automáticamente mientras no está en pausa ni terminado; "PAUSA" detiene el incremento y "REANUDAR" lo retoma; "FIN" abre el modal de fin de partida con la puntuación final.
- [X] Guardar la puntuación en el modal la persiste en `localStorage` (`av_scores`) y muestra el mensaje "PUNTUACIÓN GUARDADA"; "JUGAR DE NUEVO" reinicia el HUD a sus valores iniciales.
- [X] En `/auth`, iniciar sesión (o entrar como invitado) redirige a `/` y el `Nav` muestra el nombre de usuario en vez de "Iniciar Sesión"; recargar la página mantiene la sesión iniciada.
- [X] Cerrar sesión desde el `Nav` vuelve a mostrar el botón "Iniciar Sesión" y borra `av_user` de `localStorage`.
- [X] En `/salon`, cambiar de tab (juego) actualiza el podio y la tabla; si hay sesión iniciada, aparece la fila "TU MEJOR MARCA EN <JUEGO>".
- [X] El enlace activo en el `Nav` refleja la sección actual (Biblioteca se marca activo también en `/juegos/*`).
- [X] En una ventana de ~400px de ancho, el `Nav` muestra el menú hamburguesa y ninguna pantalla produce scroll horizontal.
- [X] Navegar a `/juegos/id-inexistente` muestra la página 404 de Next.js en vez de un error de JavaScript.

---

## Decisions

- **Sí:** rutas dedicadas del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`) en vez de mantener el router por hash del template. Razón: es la forma nativa de Next.js, permite recargar/compartir URLs y usar `next/link`.
- **No:** replicar el hash-router manual (`location.hash` + estado `route`) del template. Habría sido trabajo extra para pelear contra el App Router sin ningún beneficio.
- **Sí:** URLs cortas en inglés/mixto para las rutas nuevas (`/salon`, `/auth`) en vez de `/salon-de-la-fama` o `/iniciar-sesion`. Decisión explícita del usuario.
- **Sí:** mantener persistencia mock en `localStorage` para sesión y puntuaciones, igual que el template. Razón: conserva la interactividad completa del prototipo (login/logout, guardar puntuación) sin necesitar backend.
- **Sí:** compartir esa persistencia mock vía un `SessionProvider` de contexto de React en el layout raíz, en vez de leer `localStorage` de forma independiente en cada página. Razón: evita duplicar lógica y mantiene sincronizado el `Nav` con las páginas de Auth y Reproductor.
- **Sí:** datos ficticios en `app/data/games.ts`. Decisión explícita del usuario, con miras a reemplazarlos por una base de datos real más adelante.
- **Sí:** componentes compartidos en una carpeta `components/` en la raíz (no co-ubicados por ruta). Decisión explícita del usuario.
- **Sí:** replicar exactamente la simulación visual del Reproductor (incremento automático de puntuación, animación CRT), sin lógica de juego real. Decisión explícita del usuario — sigue sin ser un juego jugable, solo un mock visual.
- **No:** cualquier integración real de autenticación social (Google/GitHub) o backend de puntuaciones. Fuera del alcance de este MVP visual.

---

## What is **not** in this spec

- Lógica de juego real para cualquiera de los 8 juegos del catálogo.
- Autenticación real, backend, base de datos o API.
- Créditos/monedas funcionales.
- Tests automatizados.
- Internacionalización o soporte multi-idioma.

Cada uno de estos, si se implementa, va en su propio spec.
