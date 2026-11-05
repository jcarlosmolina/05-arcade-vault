# SPEC 05 — Juego real de asteroides en el Reproductor

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-11-05
> **Objective:** Portar a TypeScript el juego de asteroides de `references/started-games/02-asteroids/` y ejecutarlo como un juego real dentro del Reproductor (`/juegos/asteroides/jugar`), conectado al HUD y al modal de fin de partida existentes, como nueva entrada `asteroides` del catálogo.

---

## Scope

**In:**

- Nueva entrada en `GAMES` (`app/data/games.ts`), colocada justo después de `rocas`:
  - `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-asteroides"`, `color: "yellow"`.
  - `short` y `long` redactados según el juego real (rotar, propulsar, disparar, asteroides que se parten, power-up de disparo triple). Sin mencionar OVNIs.
  - `best` y `plays` con valores ficticios, igual que el resto del catálogo.
- Nueva clase CSS `.cover-asteroides` (con sus `::before`/`::after`) en `app/globals.css`, basada en el estilo de `.cover-rocas` pero visualmente distinguible. `.cover-rocas` se mantiene sin cambios.
- `rocas` sigue en el catálogo y sigue usando la simulación CSS del Reproductor. Los otros 6 juegos tampoco cambian.
- Port a TypeScript modular del juego en `app/games/asteroides/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `RADII`, `SPEEDS`, `POINTS`, constantes de power-up y la paleta `COLORS`.
  - `entities.ts`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, con `update(dt)` y `draw(ctx)` (el contexto se pasa por parámetro, sin globals).
  - `engine.ts`: `createAsteroidsGame(canvas, callbacks)` con el loop `requestAnimationFrame`, `dt` limitado a 50 ms, manejo de input, colisiones, niveles y vidas.
- Mecánicas portadas 1:1: física y envolvimiento toroidal, puntos 20/50/100 (grande/mediano/pequeño), 3 vidas, invencibilidad con parpadeo al reaparecer, avance de nivel con `3 + level` asteroides, power-up "3x" (probabilidad de drop, duración y TTL iguales al original), partículas de explosión.
- Restyle neón del canvas usando la paleta del proyecto (valores hex de las variables de `app/globals.css`), con brillo vía `shadowBlur`:
  - Nave: `--cyan` (`#00f5ff`).
  - Asteroides y sus partículas: `--magenta` (`#ff006e`).
  - Balas: `--yellow` (`#f5ff00`).
  - Llama de propulsión: `--yellow`.
  - Power-up "3x": `--green` (`#00ff88`).
- El HUD dibujado en el canvas (SCORE, NIVEL, vidas) se elimina: puntuación, vidas y nivel se muestran en el HUD React existente de `components/GamePlayer.tsx`.
- El indicador del temporizador del power-up ("3x N.Ns") se mantiene dibujado dentro del canvas, porque el HUD React no tiene un hueco para él.
- El overlay de canvas "GAME OVER — ESPACIO PARA REINICIAR" se elimina: el fin de partida abre el modal "FIN DEL JUEGO" existente.
- Registro de motores `app/games/registry.ts` que mapea `id` de juego → fábrica de motor. Solo contiene `asteroides`.
- Cambios en `components/GamePlayer.tsx`:
  - Si `game.id` está en el registro, renderiza un `<canvas width={800} height={600}>` dentro de `.crt-screen` (en lugar de `.game-arena`), escalado por CSS al 100% del contenedor (ya es 4:3).
  - Si no está en el registro, mantiene exactamente la simulación actual (incremento automático de puntuación, animación CSS).
  - Para juegos reales, `score`, `lives` y `level` del HUD vienen del motor vía `onStats`.
  - Botón PAUSA / REANUDAR → `pause()` / `resume()` del motor. Las teclas `P` y `Escape` también alternan la pausa. El overlay "EN PAUSA" existente se muestra igual.
  - Botón FIN → `end()` del motor, que dispara `onGameOver` con la puntuación actual.
  - Perder la última vida → `onGameOver` → se abre el modal existente con la puntuación real.
  - GUARDAR PUNTUACIÓN usa el `saveScore` existente (`localStorage`, clave `av_scores`), sin cambios.
  - JUGAR DE NUEVO → `restart()` del motor (puntuación 0, 3 vidas, nivel 1).
  - Al desmontar el componente (SALIR, VOLVER AL VAULT, navegación) → `destroy()`: cancela el `requestAnimationFrame` y quita los listeners de teclado.
- Las teclas de juego (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) hacen `preventDefault` para no desplazar la página, **excepto** cuando el foco está en un `input`/`textarea` (el campo de iniciales del modal debe aceptar espacios y flechas).
- Mientras el modal de fin de partida está abierto, el motor no procesa input de juego.

**Out of scope (queda fuera explícitamente):**

- Controles táctiles o soporte jugable en móvil (en móvil el canvas se ve escalado, pero no hay botones en pantalla).
- Guardar puntuaciones en Supabase o cualquier backend; se sigue usando `localStorage` (`av_scores`).
- Reemplazar o eliminar el juego `rocas`; sigue siendo una simulación.
- Lógica real de cualquier otro juego del catálogo.
- Mecánicas nuevas no presentes en el original (OVNIs, hiperespacio, sonido, música).
- Resolución lógica distinta de 800×600, pantalla completa o canvas responsive con re-layout.
- Cambios en Detalle, Salón de la Fama o Biblioteca más allá de que la nueva entrada aparezca automáticamente por estar en `GAMES`.
- Tests automatizados.

---

## Data model

Nueva entrada en el catálogo existente (`app/data/games.ts`), con el tipo `Game` sin cambios:

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "…",
  long: "…",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "yellow",
  best: /* ficticio */,
  plays: /* ficticio */,
}
```

Contrato entre `GamePlayer` y cualquier motor de juego real (`app/games/types.ts`):

```ts
export interface GameStats {
  score: number;
  lives: number;
  level: number;
}

export interface GameCallbacks {
  onStats: (stats: GameStats) => void; // se llama cuando cambia score, lives o level
  onGameOver: (finalScore: number) => void; // vidas agotadas o end()
}

export interface GameInstance {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

Registro (`app/games/registry.ts`):

```ts
export const GAME_ENGINES: Record<string, GameFactory> = {
  asteroides: createAsteroidsGame,
};
```

Estado interno del motor (privado a `engine.ts`, no exportado): `ship`, `bullets`, `asteroids`, `powerUps`, `particles`, `score`, `lives`, `level`, `state: "playing" | "dead" | "gameover"`, `deadTimer`, `paused`, `keys`, `justPressed`.

Convenciones heredadas del original: origen arriba-izquierda, velocidades en píxeles/segundo, `dt` en segundos limitado a 0.05.

---

## Implementation plan

1. Crear `app/games/types.ts` con `GameStats`, `GameCallbacks`, `GameInstance` y `GameFactory`. Crear `app/games/registry.ts` con `GAME_ENGINES` vacío. `npx tsc --noEmit` pasa.
2. Crear `app/games/asteroides/constants.ts` portando las constantes de `game.js` y añadiendo `COLORS` con la paleta neón. `npx tsc --noEmit` pasa.
3. Crear `app/games/asteroides/entities.ts` portando `Bullet`, `Asteroid`, `PowerUp` y `Particle` a clases TS con `draw(ctx)`, aplicando los colores de `COLORS`. `npx tsc --noEmit` pasa.
4. Añadir `Ship` a `entities.ts` (rotación, propulsión, llama, invencibilidad con parpadeo, disparo simple y triple). `npx tsc --noEmit` pasa.
5. Crear `app/games/asteroides/engine.ts` con `createAsteroidsGame`: loop, input con listeners en `window`, `initGame`, niveles, colisiones, muerte/reaparición, indicador "3x" en canvas, `onStats` y `onGameOver`, y los métodos `pause`/`resume`/`restart`/`end`/`destroy`. Registrar `asteroides` en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
6. Añadir la entrada `asteroides` a `GAMES` y la clase `.cover-asteroides` a `app/globals.css`. Verificación manual: `/biblioteca` muestra la tarjeta ASTEROIDES con su portada; `/juegos/asteroides` muestra el Detalle. El Reproductor de asteroides todavía usa la simulación.
7. Modificar `components/GamePlayer.tsx`: si el id está en `GAME_ENGINES`, montar el canvas en `.crt-screen` y crear la instancia en un `useEffect` (con `destroy()` en el cleanup); conectar `onStats` al HUD y `onGameOver` al modal. Verificación manual: `/juegos/asteroides/jugar` es jugable y el HUD React refleja puntuación, vidas y nivel.
8. Conectar PAUSA/REANUDAR (botón + teclas `P`/`Escape`), FIN y JUGAR DE NUEVO al motor; asegurar `preventDefault` solo fuera de inputs y que el motor ignora input con el modal abierto. Verificación manual: pausar, terminar, guardar con iniciales que contienen espacio y reiniciar funcionan.
9. Verificación de regresión: `/juegos/rocas/jugar` y otro juego simulado siguen funcionando igual que antes; `npm run lint` y `npm run build` pasan.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `/biblioteca` muestra la tarjeta ASTEROIDES con la portada `.cover-asteroides`, y la tarjeta ROCAS sigue mostrando `.cover-rocas`.
- [ ] Filtrar por "SHOOTER" en `/biblioteca` muestra Invasores, Rocas y Asteroides.
- [ ] `/juegos/asteroides` muestra el Detalle con los textos del nuevo juego; "JUGAR AHORA" navega a `/juegos/asteroides/jugar`.
- [ ] En `/juegos/asteroides/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, ocupando todo su ancho, sin la animación CSS `.game-arena`.
- [ ] `←`/`→` rotan la nave, `↑` propulsa y `Espacio` dispara; ninguna de esas teclas desplaza la página.
- [ ] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos respectivamente en el HUD React.
- [ ] Un asteroide grande se parte en medianos y un mediano en pequeños; los pequeños desaparecen.
- [ ] Colisionar con un asteroide resta una vida en el HUD React y la nave reaparece parpadeando.
- [ ] Al destruir todos los asteroides, el nivel del HUD React sube en 1 y aparece una nueva oleada.
- [ ] Recoger un power-up "3x" activa disparo triple y muestra su temporizador dentro del canvas.
- [ ] La nave es cyan, los asteroides magenta, las balas amarillas y el power-up verde, con brillo neón.
- [ ] El canvas no dibuja SCORE, NIVEL ni iconos de vidas.
- [ ] PAUSA congela la partida y muestra "EN PAUSA"; REANUDAR la continúa. `P` y `Escape` hacen lo mismo.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación real; no aparece el texto "ESPACIO PARA REINICIAR".
- [ ] FIN abre el modal con la puntuación actual de la partida.
- [ ] En el modal se puede escribir un nombre con espacios; GUARDAR PUNTUACIÓN añade una entrada `{ game: "asteroides", score, name, at }` a `av_scores` en `localStorage`.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas y nivel 1.
- [ ] Tras pulsar SALIR, presionar `Espacio` o las flechas en otra página no lanza errores de consola ni la desplaza de forma anómala (listeners eliminados).
- [ ] `/juegos/rocas/jugar` sigue mostrando la simulación CSS con puntuación automática, igual que antes.
- [ ] No hay errores en la consola del navegador durante una partida completa de asteroides.

---

## Decisions

- **Sí:** nueva entrada `asteroides` en el catálogo. Decisión explícita del usuario.
- **Sí:** `rocas` se mantiene como simulación. Decisión explícita del usuario — conviven ambos juegos.
- **No:** reutilizar o renombrar `rocas`. Descartado por el usuario.
- **Sí:** nueva clase `.cover-asteroides` basada en `.cover-rocas`, conservando ambas. Decisión explícita del usuario.
- **Sí:** canvas dentro del CRT existente y HUD en React alimentado por callbacks. Decisión explícita del usuario — reutiliza el chrome del Reproductor y evita HUD duplicado.
- **No:** HUD propio en el canvas ni página a pantalla completa. Descartado por el usuario.
- **Sí:** el indicador del power-up "3x" queda dibujado en el canvas. Es feedback de juego sin equivalente en el HUD React.
- **Sí:** port a TypeScript modular con API `createAsteroidsGame(canvas, callbacks)`. Decisión explícita del usuario — sin globals y con limpieza al desmontar.
- **No:** cargar `game.js` tal cual con `<Script>`. Globals, sin cleanup y sin canal para comunicar la puntuación.
- **Sí:** código en `app/games/asteroides/`. Decisión explícita del usuario — junto a `app/data` y `app/lib`; no tiene `page.tsx`, así que no genera rutas.
- **Sí:** registro `id → motor` en `app/games/registry.ts`. Decisión explícita del usuario — escala a futuros juegos sin cambiar el tipo `Game`.
- **No:** campo `playable` en `Game` ni `if (game.id === "asteroides")` en `GamePlayer`. Descartados por el usuario.
- **Sí:** mecánicas 1:1 con restyle neón usando la paleta del proyecto. Decisión explícita del usuario.
- **Sí:** el fin de partida usa el modal existente y `saveScore` en `localStorage`. Decisión explícita del usuario.
- **No:** guardar puntuaciones en Supabase. Requiere esquema, RLS y auth real — su propio spec.
- **Sí:** PAUSA congela el loop, FIN fuerza game over, JUGAR DE NUEVO reinicia el motor; teclas `P`/`Escape` para pausa. Decisión explícita del usuario.
- **No:** reinicio con `Espacio` desde el canvas. Se elimina en favor del modal.
- **Sí:** resolución lógica fija 800×600 escalada por CSS. Decisión explícita del usuario — coincide con el `aspect-ratio: 4 / 3` de `.crt-screen`.
- **No:** controles táctiles. Decisión explícita del usuario — otro spec si llega.

---

## Identified risks

| Riesgo                                                                                    | Mitigación                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode (dev) crea dos loops o listeners duplicados | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; el `useEffect` siempre lo llama en el cleanup. |
| `preventDefault` en `Space` impide escribir espacios en el campo de iniciales del modal   | Ignorar el evento si `event.target` es `input`/`textarea`; el motor no procesa input mientras el modal está abierto.       |
| Callbacks `onStats` en cada frame provocan re-renders excesivos                           | El motor solo llama `onStats` cuando cambia `score`, `lives` o `level`.                                                    |
| `shadowBlur` en muchas partículas degrada el rendimiento                                  | Aplicar el brillo por grupo de entidades (no por partícula individual) si se detecta caída de FPS.                         |
| El escalado CSS del canvas difumina las líneas                                            | Aceptado: la resolución lógica 800×600 es suficiente para el tamaño del CRT; el estilo neón tolera el leve suavizado.      |
| `references/started-games/02-asteroids/game.js` cambia en el futuro                       | El port es una copia; no hay sincronización. La referencia es solo el punto de partida.                                    |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable.
- Puntuaciones en Supabase.
- Cambios al juego `rocas` o lógica real de otros juegos.
- OVNIs, hiperespacio, sonido o música.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
