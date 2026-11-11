# SPEC GJ — Juego real de estelas en el Reproductor (variante A)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 09
> **Date:** 2026-11-11
> **Objective:** Crear el juego de género Estelas (motos de luz en rejilla contra bots IA) y ejecutarlo como juego real en `/juegos/estelas/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.
> **Game jam:** tema "estelas" — variante A/3: núcleo clásico; rejilla 40×30, 1–3 bots según nivel, estela sólida letal, gana el último en pie, 3 vidas.

---

## Scope

**In:**

- Juego de género en TypeScript modular en `app/games/estelas/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `CELL = 20`, `COLS = 40`, `ROWS = 30`, `BASE_TICK = 0.09` s, `TICK_FACTOR = 0.95`, `MIN_TICK = 0.05` s, `ROUND_DELAY = 1.0` s, `INITIAL_LIVES = 3`, `MAX_BOTS = 3`, `SURVIVE_POINTS = 1`, `ELIM_POINTS = 100`, `ROUND_POINTS = 500`, `AI_FLOOD_LIMIT = 200` celdas, `AI_BASE_ERROR = 0.25`, `AI_ERROR_STEP = 0.05`, `AI_MIN_ERROR = 0.02`, `AI_TURN_CHANCE = 0.03`, `MAX_SCORE = 1_000_000`, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `board.ts`: rejilla de ocupación `Int8Array(COLS × ROWS)` (`0` = libre, `1..4` = id del dueño de la estela), `cellIndex(col, row)`, `inBounds`, `isFree`, `floodFill(start, limit)` (BFS que cuenta celdas libres alcanzables hasta `limit`) y `draw(ctx)` de la rejilla tenue y las estelas.
  - `entities.ts`: tipo `Bike` (`id`, `col`, `row`, `dir`, `nextDir`, `alive`, `isPlayer`, `color`) y `drawBike(ctx, bike)` (cabeza), recibiendo el contexto por parámetro (sin globals).
  - `ai.ts`: `chooseBotDir(bike, board, bikes, level, rng)` (ver Mecánicas), función pura salvo el generador aleatorio.
  - `engine.ts`: `createEstelasGame(canvas, callbacks)` (`GameFactory`) con loop `requestAnimationFrame`, `dt` limitado a 50 ms, acumulador de ticks, input de teclado con buffer de un giro, movimiento simultáneo, colisiones, rondas, vidas, niveles y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
  - Reutilización: el acumulador de ticks, el buffer de un giro por tick y la validación de giro de 180° se adaptan del patrón de `app/games/serpiente/engine.ts` (copiados, sin importar desde `serpiente` para no acoplar motores).
- Mecánicas (diseño de género, game jam):
  - Rejilla de 40×30 celdas de 20 px (cubre 800×600 exacto).
  - Motos y posiciones iniciales de cada ronda: jugador (id 1) en (col 6, fila 15) hacia la derecha; bot 1 en (col 33, fila 15) hacia la izquierda; bot 2 en (col 20, fila 4) hacia abajo; bot 3 en (col 20, fila 25) hacia arriba. Cada moto marca su celda inicial como estela propia.
  - Bots por nivel: `min(1 + floor((level − 1) / 2), 3)` (niveles 1–2: 1; 3–4: 2; 5+: 3).
  - Movimiento discreto y simultáneo: cada tick todas las motos vivas avanzan una celda. Intervalo de tick = `max(0.09 × 0.95^(level − 1), 0.05)` s (nivel 1 = 0,09 s; nivel 2 = 0,0855 s).
  - Controles: flechas y `WASD` cambian la dirección del jugador; se ignora el giro de 180° respecto a la dirección del último tick; buffer de un giro por tick (el último válido pulsado entre ticks).
  - Estela: la celda que abandona cada moto queda ocupada por su estela (muro sólido) hasta el final de la ronda.
  - Colisiones (resueltas en el mismo tick para todas las motos, tras calcular todos los destinos): muere la moto cuyo destino está fuera de la rejilla, ocupado por cualquier estela, o coincide con el destino de otra moto (mueren ambas); un cruce frontal (dos motos intercambian celdas) mata a ambas. Las estelas de una moto muerta permanecen.
  - Inicio de ronda: tras colocar las motos, `ROUND_DELAY = 1.0` s de espera sin movimiento (las cabezas laten); el jugador ya puede pulsar su primer giro.
  - IA (`ai.ts`), por tick y por bot: considera las 3 direcciones que no son marcha atrás; descarta las mortales (fuera de rejilla, estela o cabeza ajena); para cada segura calcula `floodFill` desde la celda destino (tope 200) y elige la de mayor valor, prefiriendo seguir recto en empate y girando al azar entre empates con probabilidad 0,03. Con probabilidad de error `max(0.25 − 0.05 × (level − 1), 0.02)` elige al azar entre las seguras. Si no hay ninguna segura, sigue recto (y muere).
  - Fin de ronda:
    - Jugador vivo y todos los bots muertos → ronda ganada: `score += 500 × level`, `level += 1`, nueva ronda con rejilla vacía.
    - Jugador muerto con algún bot vivo → ronda perdida: −1 vida; si quedan vidas, se repite la ronda del mismo nivel con rejilla vacía; con 0 vidas → game over.
    - Jugador y último bot mueren en el mismo tick → empate: se repite la ronda sin perder vida ni subir nivel.
  - Puntuación: `+1 × level` por cada tick que el jugador sobrevive; `+100 × level` por cada bot eliminado (cualquier causa) mientras el jugador sigue vivo; `+500 × level` al ganar la ronda.
  - 3 vidas iniciales.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`.
- Layout en 800×600: la rejilla ocupa todo el canvas, sin laterales. Fondo `#05060f` con líneas de rejilla `rgba(255,0,110,0.06)` cada 20 px.
- Estilo visual neón con la paleta del proyecto y `shadowBlur`:
  - Jugador: estela `--magenta #ff006e` (celda de 18×18 centrada, alfa 0,85) y cabeza 20×20 blanca con borde `--magenta`, `shadowBlur = 18`.
  - Bots: bot 1 `--cyan #00f5ff`, bot 2 `--yellow #f5ff00`, bot 3 `--green #00ff88`, mismo estilo.
  - Moto muerta: cabeza en gris `#555` y su estela atenuada a alfa 0,35.
- Assets: ninguno (`references/source-assets/snake-assets/` contiene frutas, que no encajan). No hay assets de audio: el juego no tiene sonido.
- Se omite del canvas: HUD propio, contador de cuenta atrás, textos de ronda ganada/perdida, overlays de pausa y game over, reinicio por tecla. No queda ningún indicador de texto dentro del canvas.
- Mapeo al HUD React: `score` = puntos, `lives` = vidas restantes (número, 3→0), `level` = nivel/ronda actual.
- Registro: `estelas: createEstelasGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-estelas` (con `::before`/`::after`) en `app/globals.css`: `::before` dibuja una estela magenta en ángulo recto (dos barras con `box-shadow` neón) sobre una rejilla en perspectiva (`repeating-linear-gradient`); `::after` una estela cyan rival que se corta contra la magenta, con un destello en el punto de choque (`radial-gradient`).
- Catálogo: migración MCP `apply_migration` `seed_game_estelas` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer`; `GameStats.lives` ya es `number | null` y aquí se usa numérico):
  - `onStats` solo cuando cambian `score`, `lives` o `level`.
  - Game over (0 vidas) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()` (puntuación 0, 3 vidas, nivel 1, 1 bot); desmontar → `destroy()`.
  - Teclas de juego (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Con la partida terminada o en pausa el motor ignora el input.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil; control con ratón.
- Multijugador local u online (los rivales son siempre bots IA).
- Sonido o música (no hay assets de audio), turbo, power-ups, rejilla fina, personalidades de IA (variantes B y C).
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
  'Tu estela es un muro: sé el último en pie.',
  'Conduce una moto de luz por la rejilla contra hasta tres rivales. Cada moto deja una estela sólida y chocar con cualquiera es el final. Encierra a los bots, sobrevive y gana la ronda para subir de nivel. Tienes tres vidas.',
  'VERSUS',
  'cover-estelas',
  'magenta',
  5
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios).

Estado interno del motor (privado a `engine.ts`): `board` (`Int8Array` de ocupación), `bikes` (`Bike[]`, jugador primero), `nextDir` del jugador (buffer de un giro), `tickAcc`, `roundDelay`, `score`, `lives`, `level`, `state: 'playing' | 'gameover'`, `rng`, `lastTime`, `rafId`, `destroyed`, `lastStats`.

---

## Implementation plan

1. Crear `app/games/estelas/constants.ts`. `npx tsc --noEmit` pasa.
2. Crear `board.ts` (ocupación, `floodFill`, dibujo de rejilla y estelas) y `entities.ts` (`Bike`, `drawBike`, paleta `COLORS`). `npx tsc --noEmit` pasa.
3. Crear `ai.ts` (`chooseBotDir`) y `engine.ts` con `createEstelasGame` (loop, acumulador de ticks y buffer de giro adaptados de `serpiente`, movimiento simultáneo, colisiones, rondas, vidas, niveles, tope de score, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
4. Añadir `.cover-estelas` a `app/globals.css`.
5. Aplicar la migración `seed_game_estelas`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `estelas` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/estelas` muestra el Detalle con Top 10 vacío.
6. Verificación de juego: `/juegos/estelas/jugar` es jugable con flechas y WASD; HUD React refleja puntuación, vidas y nivel; pausa, FIN y JUGAR DE NUEVO funcionan; ganar la ronda suma `500 × nivel` y sube el nivel; morir resta vida y repite la ronda; en el nivel 3 hay 2 bots y en el 5 hay 3.
7. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=estelas` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'estelas'`).
8. Regresión y cierre: `/juegos/asteroides/jugar`, `/juegos/bloques/jugar`, `/juegos/ladrillos/jugar` y `/juegos/serpiente/jugar` siguen igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `estelas` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta ESTELAS con la portada `.cover-estelas`; el filtro "VERSUS" la incluye.
- [ ] `/juegos/estelas` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/estelas/jugar`.
- [ ] En `/juegos/estelas/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] Al iniciar, el jugador está en (col 6, fila 15) hacia la derecha, hay 1 bot cyan en (col 33, fila 15) y nada se mueve durante 1 s.
- [ ] Las motos avanzan una celda por tick de 0,09 s en nivel 1; el intervalo nunca baja de 0,05 s.
- [ ] Flechas y `WASD` cambian la dirección; la dirección opuesta no tiene efecto; dos giros en el mismo tick aplican solo el último válido; ninguna tecla de juego desplaza la página.
- [ ] Cada celda abandonada queda como estela del color de su moto hasta el final de la ronda.
- [ ] Entrar en una estela (propia o ajena) o salir de la rejilla mata a la moto; dos motos que entran en la misma celda o se cruzan de frente mueren ambas.
- [ ] El bot no choca contra un muro si tiene una dirección segura disponible, salvo por su probabilidad de error (máx. 25 % en nivel 1).
- [ ] Sobrevivir suma 1 punto por tick en nivel 1; eliminar un bot con el jugador vivo suma 100; ganar la ronda en nivel 1 suma 500 y el HUD pasa a nivel 02.
- [ ] Morir con un bot vivo resta una vida (3→2) y repite la ronda del mismo nivel con la rejilla vacía, conservando la puntuación.
- [ ] Morir en el mismo tick que el último bot repite la ronda sin perder vida.
- [ ] En el nivel 3 hay 2 bots y desde el nivel 5 hay 3.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER" ni textos de ronda.
- [ ] La puntuación nunca supera 1.000.000.
- [ ] El HUD React muestra puntuación, vidas `♥` y nivel; el canvas no dibuja su propio HUD ni overlays de pausa/game over.
- [ ] PAUSA congela la partida y muestra "EN PAUSA"; REANUDAR la continúa sin saltos; `P` y `Escape` hacen lo mismo.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'estelas'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=estelas` al recargar.
- [ ] `/salon` muestra una tab ESTELAS que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas, nivel 1 y 1 bot.
- [ ] Tras SALIR, pulsar teclas de juego en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [ ] `/juegos/asteroides/jugar`, `/juegos/bloques/jugar`, `/juegos/ladrillos/jugar` y `/juegos/serpiente/jugar` siguen funcionando igual que antes.
- [ ] `scores` no contiene filas de prueba de `estelas` al terminar.
- [ ] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [ ] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** definición autónoma en game jam; revisar antes de aprobar.
- **Sí:** se reutiliza la sugerencia `estelas` de `references/game-suggestions-todo.md` (id, título, cat, color y mecánica) por indicación expresa del coordinador; el tema "estelas" la pide directamente. El registro no se modifica.
- **Sí:** juego real con motor TS en `app/games/estelas/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos; rejilla 40×30 de 20 px lo cubre exacto.
- **Sí:** `id = estelas`, título `ESTELAS` (palabra genérica, sin marca ni referencias a obras concretas), `cat = VERSUS` (categoría aún vacía), `color = magenta`, `sort_order = 5` (máximo actual 4 + 1).
- **Sí:** juego de género (motos de luz) desde cero, sin referencia en `references/started-games/`; lógica de rejilla, ticks y buffer adaptada de `serpiente` (SPEC 09). Decisión del agente (game jam).
- **Sí:** 1–3 bots según nivel, IA por espacio libre (`floodFill`) con error decreciente. Decisión del agente (game jam).
- **Sí:** rondas: ganar sube nivel, perder cuesta vida y repite, empate repite sin coste. Decisión del agente (game jam).
- **Sí:** puntuación por supervivencia (1/tick), eliminaciones (100) y ronda (500), todo × nivel. Decisión del agente (game jam).
- **Sí:** 3 vidas; `lives` numérico (3→0).
- **Sí:** tope de puntuación 1.000.000 en el motor para no chocar con el `CHECK` de `scores`.
- **No:** sonido (no hay assets de audio ni se inventa).
- **No:** ratón, táctil, multijugador, turbo y power-ups. Decisión del agente (game jam).
- **No:** HUD propio, cuenta atrás con texto ni overlays en el canvas. Los pone `GamePlayer` o se omiten.
- **No:** gestión de `P`/`Escape` en el motor; la hace `GamePlayer`.

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup. |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`/`contentEditable`; sin input con la partida terminada.       |
| `onStats` cada tick (supervivencia) provoca demasiados re-renders            | Solo cambia una vez por tick (≈ 11/s); aceptable. Se emite solo si cambió algo.                                  |
| Resolución de colisiones dependiente del orden de las motos                  | Calcular todos los destinos primero y resolver choques después (simultáneo).                                     |
| Coste de `floodFill` (3 bots × 3 direcciones × 200 celdas por tick)          | ≈ 1.800 visitas por tick: despreciable; tope `AI_FLOOD_LIMIT`.                                                   |
| Giro doble rápido provoca marcha atrás y muerte instantánea                  | Buffer de un giro validado contra la dirección del último tick (patrón de `serpiente`).                          |
| IA demasiado fuerte en niveles altos                                         | Error mínimo 2 % y tope de 3 bots; constantes centralizadas para ajustar al jugar.                               |
| Al reanudar, `dt` acumula el tiempo en pausa                                 | `lastTime = null` al arrancar el loop, `dt` limitado a 50 ms y `tickAcc` conservado.                             |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | Limitada en el motor con `MAX_SCORE`.                                                                            |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable; ratón.
- Multijugador local u online.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Sonido o música.
- Turbo, power-ups, rejilla fina y personalidades de IA (variantes B y C).
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
