# SPEC 09 — Juego real de serpiente en el Reproductor

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-11
> **Objective:** Crear el juego de género Serpiente (estilo arcade clásico) usando los recursos de `references/source-assets/snake-assets/` y ejecutarlo como juego real en `/juegos/serpiente/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.

---

## Scope

**In:**

- Port a TypeScript modular en `app/games/serpiente/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `CELL = 40`, `COLS = 20`, `ROWS = 15`, `INITIAL_LENGTH = 3`, `INITIAL_LIVES = 3`, `BASE_TICK = 0.15` s, `TICK_FACTOR = 0.93`, `MIN_TICK = 0.06` s, `FRUITS_PER_LEVEL = 5`, `POINTS_PER_FRUIT = 10`, `MAX_SCORE = 1_000_000`, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `sprites.ts`: port de `sprites.js` (`window.SPRITE_ATLAS` → constante exportada `FRUIT_ATLAS` con las 22 frutas `{ x, y, w, h }`), `loadFruits(): Promise<void>` (carga `/games/serpiente/fruits.png`; imagen en el closure/módulo, sin globals de `window`) y `drawFruit(ctx, name, cx, cy, size)` (recorte del atlas, escalado manteniendo proporción dentro de un cuadrado de `size`).
  - `entities.ts` (o `board.ts`): tipos/funciones de `Snake` (segmentos, dirección), `Fruit` (celda + tipo) y la rejilla, con `draw(ctx)` recibiendo el contexto por parámetro (sin globals).
  - `engine.ts`: `createSerpienteGame(canvas, callbacks)` (`GameFactory`) con carga de `fruits.png` antes de arrancar el loop, loop `requestAnimationFrame`, `dt` limitado a 50 ms, acumulador de ticks, input de teclado, colisiones, niveles, vidas y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
- Mecánicas (diseño original de género):
  - Rejilla de 20×15 celdas de 40 px (cubre 800×600 exacto, sin reescalado).
  - Serpiente de longitud inicial 3, cabeza en la celda (col 5, fila 7), dirección inicial derecha, cuerpo detrás.
  - Movimiento discreto: cada tick avanza una celda en la dirección actual. Intervalo de tick = `max(BASE_TICK × TICK_FACTOR^(level − 1), MIN_TICK)` s (nivel 1 = 0.15 s; nivel 2 = 0.1395 s; mínimo 0.06 s). El tiempo se acumula con `dt` (limitado a 50 ms) y se procesan los ticks pendientes.
  - Controles: flechas y `WASD` cambian la dirección. Se ignora el giro de 180° respecto a la dirección del último tick. Buffer de **un** giro por tick: la última dirección válida pulsada entre ticks se aplica en el siguiente.
  - Una fruta a la vez en una celda libre aleatoria (que no ocupe la serpiente), de tipo aleatorio entre las 22 del atlas. Al comerla (la cabeza entra en su celda): la serpiente crece 1 celda (la cola no se retira en ese tick), `score += 10 × level` (nivel vigente antes de comer), el contador de frutas comidas sube 1 y aparece una nueva fruta.
  - Nivel = `floor(frutasComidas / 5) + 1`, sin tope. El contador de frutas persiste al perder una vida.
  - Colisión mortal: la cabeza sale de la rejilla (muro) o entra en una celda del cuerpo propio (la celda de la cola que se libera en ese tick no cuenta como colisión salvo que esté comiendo).
  - 3 vidas iniciales. Al colisionar: −1 vida; si quedan vidas, la serpiente reaparece con longitud 3 en la posición/dirección inicial, se genera una fruta nueva, se conservan `score`, nivel y contador de frutas, y el acumulador de tick se reinicia a 0; con 0 vidas → game over.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`.
- Layout en 800×600: el tablero ocupa todo el canvas (sin laterales). Fondo oscuro con rejilla tenue de 40 px.
- Estilo visual: serpiente neón con la paleta del proyecto y brillo con `shadowBlur`; frutas con los sprites originales:
  - Cabeza `--green #00ff88` con ojos oscuros; cuerpo `--green` con tono más tenue y alternancia sutil por segmento; todo con `shadowBlur`. Fondo `#05060f`, rejilla `rgba(0,245,255,0.06)`.
  - Frutas: sprite de `fruits.png` dibujado centrado en su celda dentro de un cuadrado de 36×36 (proporción conservada); la proporción exacta se verifica visualmente.
- Assets: `references/source-assets/snake-assets/fruits.png` copiado a `public/games/serpiente/fruits.png`, cargado con ruta absoluta `/games/serpiente/fruits.png`. No hay assets de audio: el juego no tiene sonido.
- Se elimina/omite del canvas: HUD propio (puntuación, nivel, vidas), overlays de pausa y game over, reinicio por tecla. No queda ningún indicador dentro del canvas: puntuación, vidas y nivel salen por el HUD React.
- Mapeo al HUD React: `score` = puntos, `lives` = vidas restantes (número, 3→0), `level` = nivel actual.
- Registro: `serpiente: createSerpienteGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-serpiente` (con `::before`/`::after`) en `app/globals.css`: `::before` dibuja una serpiente neón verde en forma de S sobre fondo oscuro con `box-shadow`/`text-shadow` de brillo; `::after` una manzana/fruta magenta con halo neón.
- Catálogo: migración MCP `apply_migration` `seed_game_serpiente` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer`; `GameStats.lives` ya es `number | null` y aquí se usa numérico):
  - `onStats` solo cuando cambian `score`, `lives` o `level`.
  - Game over (0 vidas) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()` (puntuación 0, 3 vidas, nivel 1); desmontar → `destroy()`.
  - Teclas de juego (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Con la partida terminada o en pausa el motor ignora el input.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil; control con ratón.
- Sonido o música (no hay assets de audio), mecánicas no acordadas (frutas especiales, obstáculos, power-ups, portales en muros, niveles con mapas distintos).
- Cambios de esquema en `games`, `scores` o `games_with_stats`.
- Puntuaciones seed o cualquier dato ficticio.
- Resolución lógica distinta de 800×600.
- Sprites de serpiente (no existen en los recursos; se dibuja con formas neón).
- Tests automatizados.

---

## Data model

Fila nueva en `public.games` (migración `seed_game_serpiente`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'serpiente',
  'SERPIENTE',
  'Come, crece y no te muerdas la cola.',
  'Guía a la serpiente por la rejilla, devora fruta para crecer y esquiva muros y tu propia cola. Cada cinco frutas el ritmo se acelera. Tienes tres vidas: úsalas con cabeza.',
  'ARCADE',
  'cover-serpiente',
  'green',
  4
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios).

Estado interno del motor (privado a `engine.ts`): `snake` (segmentos `{ col, row }`, cabeza primero), `dir`, `nextDir` (buffer de un giro), `fruit` (`col`, `row`, `type`), `fruitsEaten`, `tickAcc`, `spritesLoaded`, `score`, `lives`, `level`, `state: 'playing' | 'gameover'`, `lastTime`, `rafId`, `destroyed`, `lastStats`.

---

## Implementation plan

1. Crear `app/games/serpiente/constants.ts`. `npx tsc --noEmit` pasa.
2. Copiar `fruits.png` a `public/games/serpiente/` y crear `sprites.ts` (atlas + `loadFruits` + `drawFruit`) y `entities.ts` (serpiente, fruta y rejilla con `draw(ctx)` y la paleta `COLORS`). `npx tsc --noEmit` pasa.
3. Crear `engine.ts` con `createSerpienteGame` (carga de sprites, loop, acumulador de ticks, input con buffer, colisiones, crecimiento, vidas, niveles, tope de score, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
4. Añadir `.cover-serpiente` a `app/globals.css`.
5. Aplicar la migración `seed_game_serpiente`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `serpiente` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/serpiente` muestra el Detalle con Top 10 vacío.
6. Verificación de juego: `/juegos/serpiente/jugar` es jugable con flechas y WASD; HUD React refleja puntuación, vidas y nivel; pausa, FIN y JUGAR DE NUEVO funcionan; comer suma `10 × nivel` y crece; muros y cola restan vida; el nivel sube cada 5 frutas con ticks más rápidos; la fruta carga sin 404.
7. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=serpiente` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'serpiente'`).
8. Regresión y cierre: `/juegos/asteroides/jugar`, `/juegos/bloques/jugar` y `/juegos/ladrillos/jugar` siguen igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `serpiente` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta SERPIENTE con la portada `.cover-serpiente`; el filtro "ARCADE" la incluye.
- [ ] `/juegos/serpiente` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/serpiente/jugar`.
- [ ] En `/juegos/serpiente/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] Al iniciar, la serpiente mide 3 celdas, la cabeza está en (col 5, fila 7) y avanza hacia la derecha una celda por tick de 0.15 s.
- [ ] Flechas y `WASD` cambian la dirección; pulsar la dirección opuesta a la actual no tiene efecto; ninguna tecla de juego desplaza la página.
- [ ] Dos giros pulsados dentro del mismo tick aplican solo el último válido y nunca producen una inversión de 180° en un tick.
- [ ] Siempre hay exactamente una fruta en una celda no ocupada por la serpiente, dibujada con un sprite de `fruits.png`.
- [ ] Comer una fruta en nivel 1 suma 10 puntos, la serpiente crece 1 celda y aparece otra fruta; en nivel 2 suma 20.
- [ ] Comer la 5.ª fruta pone el nivel del HUD en 02 y el intervalo de tick pasa a 0.1395 s; el intervalo nunca baja de 0.06 s.
- [ ] Chocar con un muro resta una vida en el HUD React (3→2) y la serpiente reaparece con longitud 3, conservando puntuación y nivel.
- [ ] Chocar con el propio cuerpo resta una vida igual que el muro.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] La puntuación nunca supera 1.000.000.
- [ ] El HUD React muestra puntuación, vidas `♥` y nivel; el canvas no dibuja su propio HUD ni overlays de pausa/game over.
- [ ] PAUSA congela la partida (la serpiente no avanza) y muestra "EN PAUSA"; REANUDAR la continúa sin saltos; `P` y `Escape` hacen lo mismo.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'serpiente'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=serpiente` al recargar.
- [ ] `/salon` muestra una tab SERPIENTE que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas, nivel 1 y serpiente de longitud 3.
- [ ] La serpiente se dibuja en neón verde con brillo y no hay 404 en `/games/serpiente/fruits.png`.
- [ ] Tras SALIR, pulsar teclas de juego en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [ ] `/juegos/asteroides/jugar`, `/juegos/bloques/jugar` y `/juegos/ladrillos/jugar` siguen funcionando igual que antes.
- [ ] `scores` no contiene filas de prueba de `serpiente` al terminar.
- [ ] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [ ] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** juego real con motor TS en `app/games/serpiente/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos escalado por CSS. Convención de la plataforma; la rejilla 20×15×40 px lo cubre exacto.
- **Sí:** `id = serpiente`, título `SERPIENTE`, `cat = ARCADE`, `color = green`, `sort_order = 4`. Decisión explícita del usuario.
- **Sí:** juego de género desde cero (sin carpeta en `references/started-games/`); recursos gráficos de `references/source-assets/snake-assets/`.
- **Sí:** rejilla 20×15 de 40 px con movimiento discreto por tick. Decisión explícita del usuario.
- **Sí:** 3 vidas; al chocar se pierde una y la serpiente reaparece. Decisión explícita del usuario.
- **Sí:** nivel = `floor(frutas/5)+1`, tick ×0.93 por nivel, mínimo 0.06 s. Decisión explícita del usuario.
- **Sí:** serpiente neón con `shadowBlur` + frutas con sprites de `fruits.png`. Decisión explícita del usuario.
- **Sí:** flechas + WASD, buffer de un giro por tick. Decisión explícita del usuario.
- **Sí:** una fruta a la vez, tipo aleatorio, `+10 × nivel`, crece 1. Decisión explícita del usuario.
- **Sí:** portada y textos `short`/`long` según el borrador propuesto. Decisión explícita del usuario.
- **Sí:** `lives` numérico (3→0); no se usa `null`.
- **Sí:** tope de puntuación 1.000.000 en el motor para no chocar con el `CHECK` de `scores`.
- **No:** sonido (no hay assets de audio ni se añade sonido nuevo).
- **No:** ratón, táctil, frutas especiales, obstáculos, portales en muros.
- **No:** HUD propio en el canvas ni overlays de pausa/game over. Los pone `GamePlayer`.
- **No:** gestión de `P`/`Escape` en el motor; la hace `GamePlayer`.

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup.                                             |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`; sin input con la partida terminada.                                                                     |
| `onStats` en cada frame provoca re-renders                                   | Emitir solo cuando cambian `score`, `lives` o `level`.                                                                                                       |
| El escalado CSS difumina el canvas                                           | Aceptado; la paleta neón tolera el suavizado.                                                                                                                |
| `fruits.png` (3790×442, ~570 KB) 404 por ruta relativa o carga lenta         | Ruta absoluta `/games/serpiente/fruits.png`; el loop arranca tras la carga; si `destroyed`, no se arranca; `onerror` registra el fallo sin romper la página. |
| El atlas tiene recortes con fondo transparente y proporciones distintas      | `drawFruit` conserva proporción dentro de 36×36; verificación visual de las 22 frutas.                                                                       |
| Giro doble rápido provoca marcha atrás y muerte instantánea                  | Buffer de un giro por tick validado contra la dirección del último tick (no contra la pulsada).                                                              |
| Colisión falsa con la cola que se libera en el mismo tick                    | La celda de la cola no cuenta como cuerpo salvo que se esté comiendo (la cola no se retira).                                                                 |
| Generar fruta en celda libre se bloquea si la serpiente llena el tablero     | Elegir al azar entre las celdas libres calculadas; con 300 celdas es inalcanzable, pero sin celdas libres → game over.                                       |
| Reaparición sobre una fruta o cuerpo tras perder una vida                    | La fruta se regenera después de colocar la serpiente inicial, en celda libre.                                                                                |
| Al reanudar, `dt` acumula el tiempo en pausa                                 | `lastTime = null` al arrancar el loop, `dt` limitado a 50 ms y `tickAcc` conservado sin saltos.                                                              |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | Limitada en el motor con `MAX_SCORE`.                                                                                                                        |
| `sprites.js` original usa `window.SPRITE_ATLAS` y rutas `snake-assets/`      | El port es una constante TS exportada y ruta absoluta; no se copia `sprites.js` a `public/`.                                                                 |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable; ratón.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Sonido o música.
- Frutas especiales, obstáculos, portales o mapas por nivel.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
