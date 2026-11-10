# SPEC 07 — Juego real de bloques en el Reproductor

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-10
> **Objective:** Portar a TypeScript el juego de `references/started-games/03-tetris/` y ejecutarlo como juego real en `/juegos/bloques/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.

---

## Scope

**In:**

- Vidas opcionales en el HUD (cambio de plataforma, una sola vez):
  - `GameStats.lives` pasa a `number | null` en `app/games/types.ts`.
  - `components/GamePlayer.tsx`: estado `lives` admite `null`; la stat "Vidas" del HUD no se renderiza si es `null`. Asteroides sigue enviando un número y no cambia.
- Port a TypeScript modular en `app/games/bloques/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `COLS = 10`, `ROWS = 20`, `CELL = 28`, origen del tablero (`BOARD_X = 260`, `BOARD_Y = 20`), `PIECES` (7 matrices), `LINE_SCORES = [0, 100, 300, 500, 800]`, `SOFT_DROP_POINTS = 1`, `HARD_DROP_POINTS = 2`, `LINES_PER_LEVEL = 10`, `BASE_DROP = 1.0` s, `DROP_STEP = 0.09` s, `MIN_DROP = 0.1` s, `MAX_SCORE = 1_000_000`, `KICKS = [0, -1, 1, -2, 2]`, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `board.ts`: funciones puras del dominio — `createBoard()`, `randomPiece()`, `collide(board, shape, x, y)`, `rotateCW(shape)`, `merge(board, piece)`, `clearLines(board): number`, `ghostY(board, piece)` — y funciones de dibujo `drawBoard(ctx, …)`, `drawPiece(ctx, …)`, `drawGhost(ctx, …)`, `drawNext(ctx, …)`, `drawSidePanels(ctx, lines, next)`, recibiendo el contexto por parámetro (sin globals).
  - `engine.ts`: `createBloquesGame(canvas, callbacks)` (`GameFactory`) con loop `requestAnimationFrame`, `dt` limitado a 50 ms, gravedad por acumulador, input, bloqueo de pieza, limpieza de líneas, niveles, y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
- Mecánicas portadas 1:1 desde `game.js`:
  - Tablero 10×20; celda `0` = vacía, `1–7` = índice de color de la pieza.
  - 7 piezas (I, O, T, S, Z, J, L) con las matrices de la referencia; elección uniforme `floor(random × 7) + 1` (sin bolsa). Aparición en `x = floor(COLS/2) − floor(ancho/2)`, `y = 0`.
  - Rotación horaria = transpuesta + inversión (`rotateCW`), con wall kicks `[0, −1, +1, −2, +2]` en ese orden; si ninguno cabe, no rota.
  - Gravedad: acumulador en segundos; al superar `dropInterval` se pone a 0 y la pieza baja una fila o, si no puede, se bloquea.
  - `dropInterval = max(0.1, 1.0 − (level − 1) × 0.09)` s (equivale a `max(100, 1000 − (level−1)×90)` ms del original).
  - Bloquear = `merge` + `clearLines` + `spawn`. Si la pieza recién generada colisiona → game over.
  - Puntuación por líneas: `LINE_SCORES[n] × level`, usando el nivel **anterior** a recalcularlo (1 línea 100, 2 → 300, 3 → 500, 4 → 800, × nivel).
  - Tras limpiar: `lines += n`, `level = floor(lines / 10) + 1`, se recalcula `dropInterval`.
  - Soft drop (`↓`): baja una fila y suma 1 punto; si no puede bajar, bloquea la pieza (como el original).
  - Hard drop (`Espacio`): suma `2 × filas recorridas`, coloca la pieza en `ghostY` y la bloquea.
  - Pieza fantasma en `ghostY` con `globalAlpha = 0.2`.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`; la partida sigue al alcanzarlo.
- Layout en 800×600:
  - Tablero de 280×560 (10×20 celdas de 28 px) centrado en `x = 260…540`, `y = 20…580`, con marco neón y rejilla tenue.
  - Lateral izquierdo: etiqueta "LÍNEAS" y contador de líneas.
  - Lateral derecho: etiqueta "SIGUIENTE" y preview 4×4 de la siguiente pieza, centrada como en `drawNext()` del original.
  - Todo en el mismo canvas (el `#next-canvas` de la referencia desaparece).
- Restyle neón con la paleta del proyecto y brillo con `shadowBlur`, paleta ampliada para las 7 piezas:
  - I → `--cyan #00f5ff`, O → `--yellow #f5ff00`, S → `--green #00ff88`, Z → `--magenta #ff006e`, T → violeta `#aa00ff`, L → naranja `#ff7700`, J → azul `#3a7bff`.
  - Marco del tablero y textos de los laterales en `--magenta`/`--cyan`; rejilla con baja opacidad.
- Se elimina del canvas y del juego: HUD DOM (`#score`, `#lines`, `#level`), panel de controles, overlay de PAUSA/GAME OVER, botón "Reiniciar", tecla `P` del motor (la gestiona `GamePlayer`), conmutador de tema claro/oscuro y su `localStorage` (`tetris-theme`), y la pieza 8 "N (tuerca)". Se mantiene dentro del canvas: contador de LÍNEAS y preview SIGUIENTE (sin hueco en el HUD React).
- Registro: `bloques: createBloquesGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase nueva `.cover-bloques` (con `::before`/`::after`) en `app/globals.css`: `::after` dibuja una pila de bloques neón con una línea casi completa en la base; `::before` una pieza T cayendo con `text-shadow` neón. Se elimina la clase huérfana `.cover-tetro` (sin uso desde SPEC 06).
- Catálogo: migración MCP `apply_migration` `seed_game_bloques` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer` salvo vidas opcionales):
  - `onStats` solo cuando cambian `score`, `lives` (siempre `null`) o `level`.
  - Game over (pieza nueva colisiona al aparecer) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()`; desmontar → `destroy()`.
  - Teclas de juego (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `KeyX`, `ArrowDown`, `Space`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Las acciones se aplican en cada `keydown`, incluida la autorrepetición del teclado (como el original). En pausa o con la partida terminada el motor ignora el input.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil.
- Sonido o música nuevos, mecánicas no presentes en la referencia (hold, bolsa de 7, T-spins, combos, lock delay).
- Cambios de esquema en `games`, `scores` o `games_with_stats`.
- Puntuaciones seed o cualquier dato ficticio.
- Resolución lógica distinta de 800×600.
- Pieza "N (tuerca)", conmutador de tema y overlays propios de la referencia.
- Tests automatizados.

---

## Data model

Fila nueva en `public.games` (migración `seed_game_bloques`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'bloques',
  'BLOQUES',
  'Encaja las piezas antes de que el techo te aplaste.',
  'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
  'PUZZLE',
  'cover-bloques',
  'magenta',
  2
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios, salvo `lives: number | null`):

```ts
export interface GameStats {
  score: number;
  lives: number | null; // null = el juego no tiene vidas
  level: number;
}
```

Estado interno del motor (privado a `engine.ts`): `board` (matriz `ROWS×COLS`), `current` y `next` (`{ type, shape, x, y }`), `score`, `lines`, `level`, `dropInterval` (s), `dropAccum` (s), `state: 'playing' | 'gameover'`, `paused`, `lastTime`, `rafId`, `destroyed`, `lastStats`.

---

## Implementation plan

1. `GameStats.lives` opcional (`number | null`) y HUD sin "Vidas" cuando es `null`. Verificación: `npx tsc --noEmit` pasa; `/juegos/asteroides/jugar` sigue mostrando vidas.
2. Crear `app/games/bloques/constants.ts`. `npx tsc --noEmit` pasa.
3. Crear `app/games/bloques/board.ts` con la lógica pura del tablero, su dibujo (tablero, fantasma, pieza, laterales LÍNEAS/SIGUIENTE) y la paleta `COLORS`. `npx tsc --noEmit` pasa.
4. Crear `engine.ts` con `createBloquesGame` (loop, gravedad, input, bloqueo, líneas, niveles, tope de score, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
5. Añadir `.cover-bloques` a `app/globals.css` y eliminar `.cover-tetro`.
6. Aplicar la migración `seed_game_bloques`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `bloques` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/bloques` muestra el Detalle con Top 10 vacío.
7. Verificación de juego: `/juegos/bloques/jugar` es jugable; HUD React refleja puntuación y nivel sin "Vidas"; pausa, FIN y JUGAR DE NUEVO funcionan; rotación con wall kick junto a la pared, soft/hard drop puntúan, limpiar líneas suma según tabla, el nivel sube a las 10 líneas y la caída se acelera; apilar hasta arriba termina la partida.
8. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=bloques` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'bloques'`).
9. Regresión y cierre: `/juegos/asteroides/jugar` sigue igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [X] `games` contiene la fila `bloques` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [X] `/biblioteca` muestra la tarjeta BLOQUES con la portada `.cover-bloques`; el filtro "PUZZLE" la incluye.
- [X] `.cover-tetro` ya no existe en `app/globals.css`.
- [X] `/juegos/bloques` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/bloques/jugar`.
- [X] En `/juegos/bloques/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [X] El tablero 10×20 se dibuja centrado (280×560) con LÍNEAS a la izquierda y SIGUIENTE a la derecha, mostrando la pieza que aparece a continuación.
- [X] `←`/`→` mueven, `↑` y `X` rotan, `↓` hace soft drop y `Espacio` hard drop; ninguna tecla de juego desplaza la página.
- [X] Solo aparecen las 7 piezas estándar, cada una con su color (I cyan, O amarillo, S verde, Z magenta, T violeta, L naranja, J azul) y brillo neón; nunca la pieza "tuerca".
- [X] Rotar una pieza I pegada a la pared aplica wall kick en lugar de bloquear la rotación.
- [X] Cada fila de soft drop suma 1 punto; un hard drop suma 2 × filas recorridas.
- [X] En nivel 1, limpiar 1/2/3/4 líneas suma 100/300/500/800; en nivel 2, limpiar 4 líneas suma 1600.
- [X] Al llegar a 10 líneas el nivel del HUD React pasa a 02 y la caída automática se acelera (910 ms por fila).
- [X] La pieza fantasma se ve a baja opacidad en la posición de aterrizaje.
- [X] La puntuación nunca supera 1.000.000.
- [X] El HUD React muestra puntuación y nivel, sin la stat "Vidas"; el canvas no dibuja SCORE/NIVEL ni overlays de pausa/game over.
- [X] `/juegos/asteroides/jugar` sigue mostrando sus vidas `♥` en el HUD.
- [X] PAUSA congela la partida (la pieza no cae ni responde a teclas) y muestra "EN PAUSA"; REANUDAR la continúa; `P` y `Escape` hacen lo mismo.
- [X] Que una pieza nueva colisione al aparecer, y FIN, abren el modal "FIN DEL JUEGO" con la puntuación real.
- [X] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'bloques'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=bloques` al recargar.
- [X] `/salon` muestra una tab BLOQUES que cambia el parámetro `juego` de la URL.
- [X] JUGAR DE NUEVO reinicia a puntuación 0, 0 líneas, nivel 1 y tablero vacío.
- [X] Tras SALIR, pulsar teclas de juego en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [X] `scores` no contiene filas de prueba de `bloques` al terminar.
- [X] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [X] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** juego real con motor TS en `app/games/bloques/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos escalado por CSS. Convención de la plataforma.
- **Sí:** `id = bloques`, título `BLOQUES`, sin nombre comercial del juego original. Decisión explícita del usuario (descartado recuperar `caida`/CAÍDA del MVP).
- **Sí:** `cat = PUZZLE`, `color = magenta`, `sort_order = 2`. Decisión explícita del usuario.
- **Sí:** textos `short`/`long` recuperados de la entrada CAÍDA del MVP. Decisión explícita del usuario.
- **No:** pieza 8 "N (tuerca)"; solo las 7 piezas estándar con probabilidad 1/7. Decisión explícita del usuario.
- **Sí:** celda de 28 px, tablero 280×560 centrado con laterales LÍNEAS / SIGUIENTE. Decisión explícita del usuario.
- **Sí:** restyle neón con paleta ampliada (4 colores del proyecto + violeta, naranja y azul). Decisión explícita del usuario.
- **Sí:** tope de puntuación en 1.000.000 dentro del motor, sin terminar la partida. Decisión explícita del usuario — el guardado nunca choca con el `CHECK` de `scores`.
- **Sí:** nueva `.cover-bloques` y eliminación de `.cover-tetro`. Decisión explícita del usuario.
- **Sí:** `lives: null` y HUD sin "Vidas". El juego no tiene vidas; cambio de plataforma reutilizable.
- **No:** sonido. La referencia no tiene assets ni sonidos; no se añade sonido nuevo.
- **No:** conmutador de tema claro/oscuro. El tema de la plataforma es único.
- **No:** victoria. El juego no tiene fin por niveles; los niveles se repiten acelerando hasta el mínimo de 100 ms.
- **Sí:** input por `keydown` con autorrepetición, 1:1 con el original, en lugar de `keys`/`justPressed` por frame.

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup. |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`; sin input con la partida terminada.                         |
| `onStats` en cada frame provoca re-renders                                   | Emitir solo cuando cambian `score`, `lives` o `level`.                                                           |
| El escalado CSS difumina el canvas                                           | Aceptado; la paleta neón tolera el suavizado.                                                                    |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | Limitada en el motor con `MAX_SCORE`.                                                                            |
| Cambiar `lives` a `number \| null` rompe asteroides o el HUD                 | Asteroides sigue emitiendo números; verificación explícita de su HUD en paso 1 y en regresión.                   |
| Input por `keydown` actúa mientras el juego está en pausa                    | El handler comprueba `paused` y `state` antes de aplicar cualquier acción.                                       |
| Al reanudar, el acumulador de gravedad salta por el tiempo en pausa          | `lastTime = null` al arrancar el loop y `dt` limitado a 50 ms.                                                   |
| `shadowBlur` en 200 celdas por frame degrada el rendimiento                  | Agrupar el dibujo por color y aplicar el brillo una vez por grupo si se detecta caída de FPS.                    |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Pieza "tuerca", conmutador de tema, hold, bolsa de 7, T-spins, combos o lock delay.
- Sonido o música.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
