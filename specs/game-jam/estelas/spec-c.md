# SPEC GJ — Juego real de estelas en el Reproductor (variante C)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 09
> **Date:** 2026-11-11
> **Objective:** Crear el juego de género Estelas (motos de luz en rejilla contra bots IA) en rejilla fina, siempre contra 3 bots con personalidades que se endurecen por nivel y en muerte súbita (sin vidas), y ejecutarlo como juego real en `/juegos/estelas/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.
> **Game jam:** tema "estelas" — variante C/3: rejilla 80×60, 3 bots desde el nivel 1 con personalidades (errante, territorial, cazador), sin vidas: perder una ronda termina la partida.

---

## Scope

**In:**

- Juego de género en TypeScript modular en `app/games/estelas/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `CELL = 10`, `COLS = 80`, `ROWS = 60`, `BASE_TICK = 0.06` s, `TICK_FACTOR = 0.96`, `MIN_TICK = 0.03` s, `ROUND_DELAY = 1.0` s, `BOTS = 3`, `SURVIVE_POINTS = 1`, `OUTLAST_POINTS = 150`, `CUT_POINTS = 300`, `ROUND_POINTS = 1000`, `AI_FLOOD_LIMIT = 400` celdas, `AI_BASE_ERROR = 0.2`, `AI_ERROR_STEP = 0.04`, `AI_MIN_ERROR = 0.01`, `HUNTER_AHEAD = 6` celdas, `WANDER_TURN = 0.08`, `MAX_SCORE = 1_000_000`, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `board.ts`: rejilla de ocupación `Int8Array(COLS × ROWS)` (`0` libre, `1..4` id del dueño), `cellIndex`, `inBounds`, `isFree`, `floodFill(start, limit)` y `draw(ctx)` (estelas en una sola pasada por color con `fillRect` por celda).
  - `entities.ts`: `Bike` (`id`, `col`, `row`, `dir`, `alive`, `isPlayer`, `color`, `personality: 'wanderer' | 'territorial' | 'hunter' | null`) y `drawBike(ctx, bike)`, recibiendo el contexto por parámetro (sin globals).
  - `ai.ts`: `chooseBotDir(bike, board, bikes, level, rng)` con una estrategia por personalidad y `personalitiesFor(level)`.
  - `engine.ts`: `createEstelasGame(canvas, callbacks)` (`GameFactory`) con loop `requestAnimationFrame`, `dt` limitado a 50 ms, acumulador de ticks, input con buffer de un giro, movimiento simultáneo, colisiones, rondas, niveles, muerte súbita y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
  - Reutilización: acumulador de ticks, buffer de un giro y validación de 180° adaptados de `app/games/serpiente/engine.ts` (copiados, sin importar desde `serpiente`).
- Mecánicas (diseño de género, game jam):
  - Rejilla fina de 80×60 celdas de 10 px (cubre 800×600 exacto).
  - Siempre 3 bots. Posiciones iniciales: jugador (col 12, fila 30) → derecha; bot 1 (col 67, fila 30) ←; bot 2 (col 40, fila 8) ↓; bot 3 (col 40, fila 51) ↑.
  - Tick `max(0.06 × 0.96^(level − 1), 0.03)` s; todas las motos avanzan una celda por tick.
  - Controles: flechas y `WASD`; sin marcha atrás; buffer de un giro por tick.
  - Estela sólida; colisiones simultáneas: fuera de rejilla, estela (propia o ajena), mismo destino o cruce frontal → muerte. 1 s de espera al empezar cada ronda.
  - **Personalidades** (`ai.ts`), todas descartan primero las direcciones mortales:
    - Errante: sigue recto; con probabilidad 0,08 por tick gira a una dirección segura al azar.
    - Territorial: elige la dirección segura con mayor `floodFill` (tope 400), recto en empate.
    - Cazador: apunta a la celda 6 por delante del jugador en su dirección actual (o a su cabeza si esa celda está fuera de la rejilla); entre las seguras con `floodFill` ≥ 40 % del mejor, elige la que más reduce la distancia Manhattan al objetivo.
    - Todas aplican error `max(0.2 − 0.04 × (level − 1), 0.01)`: con esa probabilidad eligen al azar entre las seguras.
  - `personalitiesFor(level)`: nivel 1 → errante, errante, errante; nivel 2 → errante, errante, territorial; nivel 3 → errante, territorial, cazador; nivel 4 → territorial, territorial, cazador; nivel 5+ → territorial, cazador, cazador.
  - **Muerte súbita (sin vidas):**
    - Jugador vivo y los 3 bots muertos → ronda ganada: `level += 1` y nueva ronda con rejilla vacía.
    - Jugador muerto con algún bot vivo → game over inmediato.
    - Jugador y último bot mueren en el mismo tick → empate: se repite la ronda del mismo nivel.
  - **Puntuación:**
    - Supervivencia: `+1` por tick vivo (sin multiplicar por nivel: los ticks se aceleran).
    - Aguante: `+150 × level` por cada bot que muere mientras el jugador vive.
    - Corte: `+300 × level` adicional si el bot muere al chocar contra una estela del jugador.
    - Ronda ganada: `+1000 × level`.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`.
- Layout en 800×600: la rejilla ocupa todo el canvas. Fondo `#05060f` con líneas de rejilla `rgba(255,0,110,0.05)` cada 40 px (cada 4 celdas, para no saturar).
- Estilo visual neón con la paleta del proyecto y `shadowBlur`:
  - Jugador `--magenta #ff006e`; bots `--cyan #00f5ff`, `--yellow #f5ff00`, `--green #00ff88`; estelas en celda 9×9 alfa 0,85 con `shadowBlur = 8`; cabezas 10×10 blancas con borde de color y `shadowBlur = 16`.
  - Personalidad visible por la forma de la cabeza: errante cuadrada, territorial con marco doble, cazador con punta triangular en su dirección.
  - Moto muerta: cabeza gris `#555` y estela a alfa 0,3.
- Assets: ninguno (los de `references/source-assets/snake-assets/` no encajan). No hay assets de audio: el juego no tiene sonido.
- Se omite del canvas: HUD propio, cuenta atrás con texto, textos de ronda, overlays de pausa y game over, reinicio por tecla. No queda ningún indicador de texto dentro del canvas.
- Mapeo al HUD React: `score` = puntos, `lives` = `null` (sin vidas; `GamePlayer` oculta la stat "Vidas"), `level` = nivel/ronda actual.
- Registro: `estelas: createEstelasGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-estelas` (con `::before`/`::after`) en `app/globals.css`: `::before` cuatro estelas finas (magenta, cyan, amarilla, verde) que se entrecruzan en ángulos rectos sobre rejilla densa (`repeating-linear-gradient` + `box-shadow`); `::after` una cabeza magenta con punta triangular y halo en el centro.
- Catálogo: migración MCP `apply_migration` `seed_game_estelas` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer`; `GameStats.lives` ya es `number | null` y aquí se usa `null`):
  - `onStats` solo cuando cambian `score` o `level` (`lives` siempre `null`).
  - Game over (muerte en una ronda) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()` (puntuación 0, nivel 1, 3 errantes); desmontar → `destroy()`.
  - Teclas de juego (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Con la partida terminada o en pausa el motor ignora el input.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil; control con ratón.
- Multijugador local u online.
- Sonido o música (no hay assets de audio), turbo y power-ups (variante B), vidas.
- Cambios de esquema en `games`, `scores` o `games_with_stats`.
- Puntuaciones seed o cualquier dato ficticio.
- Resolución lógica distinta de 800×600.
- Sprites o imágenes.
- Tests automatizados.

---

## Data model

Fila nueva en `public.games` (migración `seed_game_estelas`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'estelas',
  'ESTELAS',
  'Tres rivales, una rejilla, ninguna segunda oportunidad.',
  'Moto de luz contra tres bots en una rejilla fina donde cada estela es un muro. Los rivales cambian de carácter con cada nivel: errantes, territoriales y cazadores que intentan cerrarte el paso. Sobrevive a todos para pasar de ronda; un solo choque termina la partida.',
  'VERSUS',
  'cover-estelas',
  'magenta',
  5
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios; `lives: null`).

Estado interno del motor (privado a `engine.ts`): `board`, `bikes` (jugador primero, bots con `personality`), `nextDir` del jugador, `tickAcc`, `roundDelay`, `score`, `level`, `state: 'playing' | 'gameover'`, `rng`, `lastTime`, `rafId`, `destroyed`, `lastStats`.

---

## Implementation plan

1. Crear `app/games/estelas/constants.ts`. `npx tsc --noEmit` pasa.
2. Crear `board.ts` (ocupación 80×60, `floodFill`, dibujo por lotes) y `entities.ts` (`Bike` con personalidad, `drawBike`, paleta `COLORS`). `npx tsc --noEmit` pasa.
3. Crear `ai.ts` (3 personalidades + `personalitiesFor`) y `engine.ts` con `createEstelasGame` (loop, ticks y buffer adaptados de `serpiente`, movimiento simultáneo, colisiones, rondas, muerte súbita, tope de score, `onStats` con `lives: null`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
4. Añadir `.cover-estelas` a `app/globals.css`.
5. Aplicar la migración `seed_game_estelas`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `estelas` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/estelas` muestra el Detalle con Top 10 vacío.
6. Verificación de juego: `/juegos/estelas/jugar` es jugable con flechas y WASD; el HUD React muestra puntuación y nivel sin "Vidas"; pausa, FIN y JUGAR DE NUEVO funcionan; hay 3 bots desde el nivel 1; las personalidades cambian según el nivel; morir abre el modal al instante.
7. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=estelas` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'estelas'`).
8. Regresión y cierre: `/juegos/asteroides/jugar`, `/juegos/bloques/jugar`, `/juegos/ladrillos/jugar` y `/juegos/serpiente/jugar` siguen igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `estelas` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta ESTELAS con la portada `.cover-estelas`; el filtro "VERSUS" la incluye.
- [ ] `/juegos/estelas` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/estelas/jugar`.
- [ ] En `/juegos/estelas/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] La rejilla es de 80×60 celdas de 10 px; al iniciar hay 3 bots (cyan, amarillo, verde) y el jugador magenta en (col 12, fila 30), y nada se mueve durante 1 s.
- [ ] En nivel 1 las motos avanzan una celda cada 0,06 s; el intervalo nunca baja de 0,03 s.
- [ ] Flechas y `WASD` giran sin marcha atrás ni doble giro por tick; ninguna tecla de juego desplaza la página.
- [ ] Entrar en una estela o salir de la rejilla mata a la moto; dos motos al mismo destino o en cruce frontal mueren ambas.
- [ ] En nivel 1 los 3 bots son errantes; en nivel 3 hay un errante, un territorial y un cazador; desde el nivel 5, un territorial y dos cazadores; la forma de la cabeza indica la personalidad.
- [ ] Un cazador se dirige hacia la celda 6 por delante del jugador sin elegir direcciones mortales disponibles.
- [ ] En nivel 1, cada bot que muere con el jugador vivo suma 150; si choca contra la estela del jugador suma 450 en total; ganar la ronda suma 1000 y el HUD pasa a nivel 02.
- [ ] Cada tick vivo suma 1 punto en cualquier nivel.
- [ ] El HUD React muestra puntuación y nivel y no muestra la stat "Vidas" (`lives = null`).
- [ ] Morir con algún bot vivo abre al instante el modal "FIN DEL JUEGO" con la puntuación real; morir en el mismo tick que el último bot repite la ronda.
- [ ] La puntuación nunca supera 1.000.000.
- [ ] El canvas no dibuja HUD propio, textos ni overlays de pausa/game over.
- [ ] PAUSA congela la partida y muestra "EN PAUSA"; REANUDAR la continúa sin saltos; `P` y `Escape` hacen lo mismo.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'estelas'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=estelas` al recargar.
- [ ] `/salon` muestra una tab ESTELAS que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, nivel 1 y 3 bots errantes.
- [ ] Una partida mantiene ≥ 55 fps en un portátil medio con la rejilla llena de estelas (sin tirones visibles).
- [ ] Tras SALIR, pulsar teclas de juego en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [ ] `/juegos/asteroides/jugar`, `/juegos/bloques/jugar`, `/juegos/ladrillos/jugar` y `/juegos/serpiente/jugar` siguen funcionando igual que antes.
- [ ] `scores` no contiene filas de prueba de `estelas` al terminar.
- [ ] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [ ] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** definición autónoma en game jam; revisar antes de aprobar.
- **Sí:** se reutiliza la sugerencia `estelas` de `references/game-suggestions-todo.md` (id, título, cat, color y mecánica) por indicación expresa del coordinador; el registro no se modifica.
- **Sí:** juego real con motor TS en `app/games/estelas/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos; rejilla fina 80×60 de 10 px para partidas más largas y tácticas. Decisión del agente (game jam).
- **Sí:** `id = estelas`, título `ESTELAS`, `cat = VERSUS`, `color = magenta`, `sort_order = 5` (máximo actual 4 + 1).
- **Sí:** lógica de rejilla, ticks y buffer adaptada de `serpiente` (SPEC 09). Decisión del agente (game jam).
- **Sí:** siempre 3 bots con personalidades (errante, territorial, cazador) cuya mezcla se endurece por nivel; la dificultad viene del carácter, no del número. Decisión del agente (game jam).
- **Sí:** muerte súbita sin vidas (`lives = null`): una partida = racha de rondas ganadas; muy legible en el leaderboard. Decisión del agente (game jam).
- **Sí:** puntuación por aguante (`150 × nivel`), corte (`+300 × nivel`) y ronda (`1000 × nivel`); supervivencia sin multiplicador. Decisión del agente (game jam).
- **Sí:** tope de puntuación 1.000.000 en el motor.
- **No:** sonido (no hay assets de audio ni se inventa).
- **No:** ratón, táctil, multijugador, turbo y power-ups (variante B). Decisión del agente (game jam).
- **No:** HUD propio ni overlays en el canvas. Los pone `GamePlayer`.
- **No:** gestión de `P`/`Escape` en el motor; la hace `GamePlayer`.

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup.        |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`/`contentEditable`; sin input con la partida terminada.              |
| Dibujar hasta 4.800 celdas con `shadowBlur` por frame baja los fps           | Una pasada por color con un solo `shadowBlur` por lote, o caché de estelas en un canvas offscreen actualizado por tick. |
| `floodFill` con tope 400 × 3 bots × 3 direcciones por tick a 33 ticks/s      | ≈ 120.000 visitas/s: aceptable; `Int32Array` de cola reutilizable sin asignaciones por tick.                            |
| Ticks rápidos (0,03 s) con `dt` de 50 ms procesan varios ticks por frame     | Bucle `while (tickAcc >= tick)` con el buffer de giro aplicado solo al primero; probado a nivel alto.                   |
| Muerte súbita frustra a jugadores nuevos                                     | Nivel 1 con 3 errantes (fáciles) y 1 s de espera inicial; aceptado como seña de la variante.                            |
| El cazador encierra al jugador de forma imparable                            | Error mínimo 1 % y filtro de `floodFill` ≥ 40 %: el cazador puede suicidarse; máximo 2 cazadores.                       |
| `onStats` cada tick provoca demasiados re-renders                            | Se emite solo si cambió algo; ≈ 17–33/s en niveles altos; si molesta, agrupar la supervivencia cada 5 ticks.            |
| Al reanudar, `dt` acumula el tiempo en pausa                                 | `lastTime = null` al arrancar el loop, `dt` limitado a 50 ms y `tickAcc` conservado.                                    |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | Limitada en el motor con `MAX_SCORE`.                                                                                   |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable; ratón.
- Multijugador local u online.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Sonido o música.
- Vidas, turbo y power-ups (variantes A y B).
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
