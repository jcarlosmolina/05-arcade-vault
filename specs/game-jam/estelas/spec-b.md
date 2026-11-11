# SPEC GJ — Juego real de estelas en el Reproductor (variante B)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 09
> **Date:** 2026-11-11
> **Objective:** Crear el juego de género Estelas (motos de luz en rejilla contra bots IA) con turbo, power-ups y puntuación por roces y cortes, y ejecutarlo como juego real en `/juegos/estelas/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.
> **Game jam:** tema "estelas" — variante B/3: el núcleo de A más turbo con cargas, power-ups (fantasma y borrador) y puntos por rozar estelas y por cortar a los bots.

---

## Scope

**In:**

- Juego de género en TypeScript modular en `app/games/estelas/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `CELL = 20`, `COLS = 40`, `ROWS = 30`, `BASE_TICK = 0.09` s, `TICK_FACTOR = 0.95`, `MIN_TICK = 0.05` s, `ROUND_DELAY = 1.0` s, `INITIAL_LIVES = 3`, `MAX_BOTS = 3`, `TURBO_CHARGES = 3`, `TURBO_TIME = 1.0` s, `POWERUP_EVERY = 8` s, `POWERUP_LIFETIME = 6` s, `POWERUP_SAFE_DIST = 5` celdas, `GHOST_TIME = 2.0` s, `SURVIVE_POINTS = 1`, `GRAZE_POINTS = 5`, `ELIM_POINTS = 100`, `CUT_POINTS = 250`, `ROUND_POINTS = 500`, `TURBO_LEFT_POINTS = 100`, `AI_FLOOD_LIMIT = 200` celdas, `AI_BASE_ERROR = 0.25`, `AI_ERROR_STEP = 0.05`, `AI_MIN_ERROR = 0.02`, `AI_TURN_CHANCE = 0.03`, `AI_POWERUP_RADIUS = 6` celdas, `MAX_SCORE = 1_000_000`, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `board.ts`: rejilla de ocupación `Int8Array(COLS × ROWS)` (`0` libre, `1..4` id del dueño), `cellIndex`, `inBounds`, `isFree`, `clearOwner(id)` (borra todas las estelas de un dueño), `floodFill(start, limit)` y `draw(ctx)`.
  - `entities.ts`: `Bike` (`id`, `col`, `row`, `dir`, `alive`, `isPlayer`, `color`, `ghostTimer`, `subTick`), `PowerUp` (`kind: 'ghost' | 'eraser'`, celda, `ttl`) y sus `draw(ctx)`, recibiendo el contexto por parámetro (sin globals).
  - `ai.ts`: `chooseBotDir(bike, board, bikes, powerUp, level, rng)`.
  - `engine.ts`: `createEstelasGame(canvas, callbacks)` (`GameFactory`) con loop `requestAnimationFrame`, `dt` limitado a 50 ms, acumulador de ticks y subticks de turbo, input con buffer de un giro, movimiento simultáneo, colisiones, power-ups, rondas, vidas, niveles y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
  - Reutilización: acumulador de ticks, buffer de un giro y validación de 180° adaptados de `app/games/serpiente/engine.ts` (copiados, sin importar desde `serpiente`).
- Mecánicas (diseño de género, game jam):
  - Base idéntica a la variante A: rejilla 40×30 de 20 px; jugador (col 6, fila 15) → derecha; bots en (33, 15) ←, (20, 4) ↓, (20, 25) ↑; bots por nivel `min(1 + floor((level − 1) / 2), 3)`; tick `max(0.09 × 0.95^(level − 1), 0.05)` s; estela sólida; colisiones simultáneas (fuera de rejilla, estela, mismo destino o cruce frontal → muerte); 1 s de espera al empezar cada ronda; IA por `floodFill` con error `max(0.25 − 0.05 × (level − 1), 0.02)`.
  - **Turbo:** `Espacio` gasta una carga (3 por ronda) y durante 1,0 s el jugador avanza 2 celdas por tick (dos subpasos, cada uno con su comprobación de colisión y su celda de estela). Pulsar `Espacio` con turbo activo o sin cargas no tiene efecto. Las cargas se reponen a 3 al empezar cada ronda.
  - **Power-ups:** como mucho uno en la rejilla. Aparece cada 8 s de ronda en una celda libre aleatoria a ≥ 5 celdas (Manhattan) de toda cabeza y desaparece a los 6 s si nadie lo coge. Tipo al 50 %:
    - Fantasma (`--green`): durante 2,0 s la moto atraviesa estelas (las propias y ajenas) sin morir; sigue muriendo al salir de la rejilla o al chocar de frente con otra cabeza. Mientras dura no deja estela.
    - Borrador (`--yellow`): borra al instante todas las estelas propias de la moto que lo coge (no las ajenas).
  - Los bots también recogen power-ups: si uno está a ≤ 6 celdas y la dirección que acerca a él es segura y su `floodFill` ≥ 50 % del mejor, la IA la elige.
  - **Puntuación:**
    - Supervivencia: `+1 × level` por tick vivo.
    - Roce: `+5 × level` por tick en que la cabeza del jugador queda ortogonalmente adyacente a una estela ajena o al borde de la rejilla (máximo una vez por tick).
    - Eliminación: `+100 × level` por bot que muere mientras el jugador vive; si muere al chocar contra una estela del jugador, `+250 × level` en su lugar (corte).
    - Ronda ganada: `+500 × level` más `+100 × level` por cada carga de turbo sin usar.
  - Fin de ronda igual que la variante A: ganar → `level += 1`; perder → −1 vida y repetir; empate → repetir sin coste.
  - 3 vidas iniciales.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`.
- Layout en 800×600: la rejilla ocupa todo el canvas. Fondo `#05060f` con rejilla `rgba(255,0,110,0.06)` cada 20 px.
- Indicadores dentro del canvas (sin hueco en el HUD React, sin texto, como el "3x" de asteroides): tres puntos de 4×4 px sobre la cabeza del jugador con las cargas de turbo restantes (visibles durante la espera de inicio de ronda y 1 s tras gastar una); la moto en modo fantasma parpadea a 10 Hz.
- Estilo visual neón con la paleta del proyecto y `shadowBlur`:
  - Jugador `--magenta #ff006e`; bots `--cyan #00f5ff`, `--yellow #f5ff00`, `--green #00ff88`; estelas en celda 18×18 alfa 0,85; cabezas 20×20 blancas con borde de color y `shadowBlur = 18` (30 con turbo).
  - Power-ups: rombo 16×16 que gira, `--green` (fantasma) o `--yellow` (borrador), parpadea los últimos 1,5 s antes de desaparecer.
  - Roce: chispa blanca de 0,15 s en la celda adyacente rozada.
  - Moto muerta: cabeza gris `#555` y estela a alfa 0,35.
- Assets: ninguno (los de `references/source-assets/snake-assets/` no encajan). No hay assets de audio: el juego no tiene sonido.
- Se omite del canvas: HUD propio, cuenta atrás con texto, textos de ronda, overlays de pausa y game over, reinicio por tecla.
- Mapeo al HUD React: `score` = puntos, `lives` = vidas restantes (número, 3→0), `level` = nivel/ronda actual.
- Registro: `estelas: createEstelasGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-estelas` (con `::before`/`::after`) en `app/globals.css`: `::before` una estela magenta que roza en paralelo a otra cyan sobre rejilla en perspectiva (`repeating-linear-gradient` + `box-shadow`); `::after` un rombo verde de power-up con halo y chispas blancas de roce (`radial-gradient`).
- Catálogo: migración MCP `apply_migration` `seed_game_estelas` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer`; `GameStats.lives` ya es `number | null`):
  - `onStats` solo cuando cambian `score`, `lives` o `level`.
  - Game over (0 vidas) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()` (puntuación 0, 3 vidas, nivel 1, 3 cargas); desmontar → `destroy()`.
  - Teclas de juego (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `Space`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Con la partida terminada o en pausa el motor ignora el input; el turbo y los temporizadores de power-up no avanzan en pausa.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil; control con ratón.
- Multijugador local u online.
- Sonido o música (no hay assets de audio), rejilla fina, personalidades de IA y modo sin vidas (variante C).
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
  'Roza estelas, corta rivales, sé el último en pie.',
  'Moto de luz contra hasta tres bots en una rejilla donde cada estela es un muro. Usa tres turbos por ronda, coge power-ups para atravesar estelas o borrar la tuya y gana puntos rozando muros y haciendo chocar a los rivales contra tu estela. Tres vidas.',
  'VERSUS',
  'cover-estelas',
  'magenta',
  5
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios).

Estado interno del motor (privado a `engine.ts`): `board`, `bikes` (jugador primero), `nextDir` del jugador, `tickAcc`, `roundDelay`, `turboCharges`, `turboTimer`, `powerUp` (`PowerUp | null`), `powerUpTimer`, `grazeFx`, `score`, `lives`, `level`, `state: 'playing' | 'gameover'`, `rng`, `lastTime`, `rafId`, `destroyed`, `lastStats`.

---

## Implementation plan

1. Crear `app/games/estelas/constants.ts`. `npx tsc --noEmit` pasa.
2. Crear `board.ts` (ocupación, `clearOwner`, `floodFill`, dibujo) y `entities.ts` (`Bike`, `PowerUp`, `draw(ctx)`, paleta `COLORS`). `npx tsc --noEmit` pasa.
3. Crear `ai.ts` (`chooseBotDir` con atracción a power-ups) y `engine.ts` con `createEstelasGame` (loop, ticks y subticks de turbo, buffer de giro adaptado de `serpiente`, movimiento simultáneo, colisiones con fantasma, power-ups, roces, cortes, rondas, vidas, niveles, tope de score, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
4. Añadir `.cover-estelas` a `app/globals.css`.
5. Aplicar la migración `seed_game_estelas`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `estelas` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/estelas` muestra el Detalle con Top 10 vacío.
6. Verificación de juego: `/juegos/estelas/jugar` es jugable con flechas, WASD y `Espacio`; HUD React refleja puntuación, vidas y nivel; pausa, FIN y JUGAR DE NUEVO funcionan; el turbo avanza 2 celdas por tick 1 s; el fantasma atraviesa estelas 2 s; el borrador limpia las estelas propias; rozar y cortar suman lo indicado.
7. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=estelas` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'estelas'`).
8. Regresión y cierre: `/juegos/asteroides/jugar`, `/juegos/bloques/jugar`, `/juegos/ladrillos/jugar` y `/juegos/serpiente/jugar` siguen igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `estelas` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta ESTELAS con la portada `.cover-estelas`; el filtro "VERSUS" la incluye.
- [ ] `/juegos/estelas` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/estelas/jugar`.
- [ ] En `/juegos/estelas/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] Al iniciar hay 1 bot, el jugador tiene 3 cargas de turbo (3 puntos sobre la cabeza) y nada se mueve durante 1 s.
- [ ] Flechas y `WASD` giran sin marcha atrás ni doble giro por tick; `Espacio` activa el turbo; ninguna tecla de juego desplaza la página.
- [ ] Con turbo el jugador avanza 2 celdas por tick durante 1,0 s y deja estela en ambas; tras 3 usos en la ronda `Espacio` no hace nada; en la ronda siguiente vuelve a tener 3.
- [ ] Como mucho hay un power-up en la rejilla; aparece a los 8 s de ronda a ≥ 5 celdas de toda cabeza y desaparece a los 6 s si nadie lo coge.
- [ ] Con el fantasma la moto atraviesa estelas 2,0 s sin morir y sin dejar estela, pero sigue muriendo al salir de la rejilla.
- [ ] El borrador elimina todas las estelas propias de quien lo coge y ninguna ajena.
- [ ] En nivel 1, cada tick adyacente a una estela ajena o al borde suma 5 (además del 1 de supervivencia), como mucho una vez por tick.
- [ ] En nivel 1, un bot que muere contra la estela del jugador suma 250; uno que muere por otra causa suma 100.
- [ ] Ganar la ronda de nivel 1 con 2 cargas sin usar suma 700 y el HUD pasa a nivel 02.
- [ ] Morir con un bot vivo resta una vida (3→2) y repite la ronda con rejilla vacía; morir en el mismo tick que el último bot repite sin perder vida.
- [ ] En el nivel 3 hay 2 bots y desde el nivel 5 hay 3.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER" ni textos.
- [ ] La puntuación nunca supera 1.000.000.
- [ ] El HUD React muestra puntuación, vidas `♥` y nivel; el canvas no dibuja su propio HUD ni overlays (solo los puntos de turbo junto a la cabeza).
- [ ] PAUSA congela la partida, el turbo y los power-ups y muestra "EN PAUSA"; REANUDAR la continúa sin saltos; `P` y `Escape` hacen lo mismo.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'estelas'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=estelas` al recargar.
- [ ] `/salon` muestra una tab ESTELAS que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas, nivel 1, 1 bot y 3 cargas.
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
- **Sí:** canvas fijo 800×600 lógicos; rejilla 40×30 de 20 px.
- **Sí:** `id = estelas`, título `ESTELAS`, `cat = VERSUS`, `color = magenta`, `sort_order = 5` (máximo actual 4 + 1).
- **Sí:** lógica de rejilla, ticks y buffer adaptada de `serpiente` (SPEC 09). Decisión del agente (game jam).
- **Sí:** turbo con 3 cargas por ronda (2 celdas/tick, 1 s) para escapar o cerrar a un rival. Decisión del agente (game jam).
- **Sí:** power-ups fantasma (2 s) y borrador, también disponibles para los bots. Decisión del agente (game jam).
- **Sí:** puntuación de riesgo: roce `5 × nivel`/tick y corte `250 × nivel`, para premiar el juego agresivo en el leaderboard. Decisión del agente (game jam).
- **Sí:** bonus por cargas de turbo sin usar (`100 × nivel` cada una). Decisión del agente (game jam).
- **Sí:** puntos de turbo sobre la cabeza dentro del canvas, sin texto: indicador sin hueco en el HUD React (precedente: "3x" de asteroides). Decisión del agente (game jam).
- **Sí:** 3 vidas; `lives` numérico (3→0).
- **Sí:** tope de puntuación 1.000.000 en el motor.
- **No:** sonido (no hay assets de audio ni se inventa).
- **No:** ratón, táctil, multijugador, rejilla fina y personalidades de IA (variante C). Decisión del agente (game jam).
- **No:** HUD propio ni overlays en el canvas. Los pone `GamePlayer`.
- **No:** gestión de `P`/`Escape` en el motor; la hace `GamePlayer`.

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup.  |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`/`contentEditable`; sin input con la partida terminada.        |
| El turbo (2 celdas/tick) se salta colisiones                                 | Dos subpasos por tick con comprobación y marca de estela en cada uno; los bots se resuelven en el primer subpaso. |
| Fantasma termina dentro de una estela y mata al instante                     | Aceptado y documentado: el jugador debe salir antes de 2 s; la moto parpadea como aviso.                          |
| Abuso del roce pegado al borde                                               | Máximo una vez por tick; el borde está a una celda de la muerte; ajustable en `GRAZE_POINTS`.                     |
| Power-up generado sin celda válida                                           | Elegir entre las celdas libres a ≥ 5 de toda cabeza; si no hay, se omite ese ciclo.                               |
| `onStats` cada tick provoca demasiados re-renders                            | ≈ 11–20 cambios/s; se emite solo si cambió algo; aceptable.                                                       |
| Al reanudar, `dt` acumula el tiempo en pausa                                 | `lastTime = null` al arrancar el loop, `dt` limitado a 50 ms; temporizadores con tiempo de juego.                 |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | Limitada en el motor con `MAX_SCORE`.                                                                             |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable; ratón.
- Multijugador local u online.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Sonido o música.
- Rejilla fina, personalidades de IA y modo sin vidas (variante C).
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
