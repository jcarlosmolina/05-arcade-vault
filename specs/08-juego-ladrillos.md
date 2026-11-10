# SPEC 08 — Juego real de ladrillos en el Reproductor

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-10
> **Objective:** Portar a TypeScript el juego de `references/started-games/04-arkanoid/` y ejecutarlo como juego real en `/juegos/ladrillos/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.

---

## Scope

**In:**

- Port a TypeScript modular en `app/games/ladrillos/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), `PADDLE_SPEED = 400`, `PADDLE = { y: 560, w: 81, h: 14 }`, `BALL_SIZE = 16`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = 80`, `BLOCKS_ORIGIN_Y = 80`, `POINTS_PER_BLOCK = 10`, `INITIAL_LIVES = 3`, `EXPLOSION_DURATION = 0.15` s, `LEVEL_SPEEDS = [1.00, 1.10, 1.21, 1.33, 1.46]`, `SPEED_GROWTH = 1.1`, `MAX_SPEED_MULT = 2.0`, `MAX_SCORE = 1_000_000` y `MAX_DT = 0.05`.
  - `sprites.ts`: port de `assets/spritesheet.js`: `SPRITES` (pala 162×14, bola 16×16, 7 bloques 32×16), `EXPLOSION_FRAMES` (4 frames de 32×16 por color; `gray` reutiliza los de `red`, como la referencia), `loadSpritesheet(): Promise<void>` (carga `/games/ladrillos/spritesheet-breakout.png`, la copia a un canvas offscreen), `drawSprite(ctx, name, x, y, w, h)` y `drawFrame(ctx, frame, x, y, w, h)`; la imagen se guarda en el closure/módulo sin globals de `window`.
  - `levels.ts`: `LEVELS` con los 5 diseños de la referencia (`col`, `row`, `color` por bloque), generados con la misma lógica que `levels.js`, y `levelSpeed(level)`.
  - `entities.ts`: tipos/funciones `Block`, `Paddle`, `Ball`, `Explosion` (animación por frames) con `draw(ctx)` recibiendo el contexto por parámetro (sin globals).
  - `engine.ts`: `createLadrillosGame(canvas, callbacks)` (`GameFactory`) con carga del spritesheet antes de arrancar el loop, loop `requestAnimationFrame`, `dt` limitado a 50 ms, input de teclado y ratón, colisiones, niveles, vidas, sonidos y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
- Mecánicas portadas 1:1 desde `game.js` y `levels.js`:
  - Pala 81×14 en `y = 560`, centrada al iniciar; `←`/`→` la mueven a 400 px/s, limitada a `[0, 800 − 81]`.
  - Ratón: `mousemove` sobre el canvas centra la pala en el cursor (limitada a los bordes), con `x = (clientX − rect.left) × canvas.width / rect.width`.
  - Bola 16×16 que nace sobre la pala (`x` centrada en la pala, `y = paddle.y − 16`) con `vx = 200 × speed`, `vy = −300 × speed`; se lanza de inmediato (sin espera).
  - Rebotes en pared izquierda, derecha y techo (`vx`/`vy` toman el signo hacia dentro); la bola se recoloca en el borde.
  - Rebote en pala: solo si `vy > 0`, solape horizontal con la pala y `ball.y + 16` entre `paddle.y` y `paddle.y + 14 + 8`; `vy = −|vy|`. Sin efecto de ángulo según el punto de impacto (como el original).
  - Colisión AABB bola–bloque; el bloque muere, `vy = −vy`, se suman 10 puntos y se procesa **un solo bloque por frame**.
  - Perder la bola (`ball.y > 600`): −1 vida; si quedan vidas, la bola reaparece sobre la pala con la velocidad del nivel actual (la pala no se recentra y los bloques se conservan); con 0 vidas → game over.
  - 3 vidas iniciales.
  - Al destruir el último bloque se carga el siguiente nivel: bloques nuevos, destellos borrados, bola sobre la pala con la velocidad del nuevo nivel.
  - 5 niveles con los diseños de `levels.js`: N1 rejilla completa 10×6 (60 bloques), N2 pirámide invertida (40), N3 tablero de ajedrez (30), N4 rejilla con huecos (39), N5 marco con cruz (39). Velocidades 1.00 / 1.10 / 1.21 / 1.33 / 1.46.
  - **Victoria → bucle de niveles:** no hay pantalla de victoria. Tras el nivel 5 el contador de nivel sigue (6, 7, …); el diseño es `LEVELS[(level − 1) % 5]` y el multiplicador de velocidad es `min(1.1^(level − 1), MAX_SPEED_MULT)`, con los 5 primeros valores de `LEVEL_SPEEDS`. La partida solo termina al perder las 3 vidas o con FIN.
  - Tope de puntuación: toda suma pasa por `score = min(score + puntos, MAX_SCORE)`.
- Layout en 800×600: la referencia ya es 800×600, sin reescalado. Al eliminar el HUD propio queda libre la franja `y < 80` encima de los bloques.
- Estilo visual: sprites originales de la referencia (sin restyle neón), fondo `#000` como la referencia:
  - Assets copiados de `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/ladrillos/spritesheet-breakout.png`, cargados con ruta absoluta `/games/ladrillos/spritesheet-breakout.png`.
  - Pala: sprite `paddle` (162×14) dibujado a 81×14. Bola: sprite `ball` 16×16. Bloques: sprite `block_<color>` (32×16) dibujado a 64×24, con los 7 colores de la referencia (`red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`, `gray`).
  - Explosión por frames: al romper un bloque se añade una `Explosion` en su posición y tamaño; `frameIndex = min(floor(elapsed / 0.15 × 4), 3)` sobre los 4 frames de `EXPLOSION_FRAMES[color]`; dura `EXPLOSION_DURATION = 0.15` s (150 ms de la referencia) y luego se elimina.
- Sonido: se mantienen los 2 efectos de la referencia, copiados a `public/games/ladrillos/sounds/` (`ball-bounce.mp3` en rebotes de pared/techo/pala, `break-sound.mp3` al romper un bloque), cargados con rutas absolutas `/games/ladrillos/sounds/…`. Se reproducen con `cloneNode().play()` capturando el rechazo de la promesa. No se añade sonido nuevo.
- Se elimina del canvas: HUD propio (`Score`, `Nivel`, bolas de vidas), overlays `GAME OVER`, `¡Completaste el juego!` y `PAUSA` (con el selector «Saltar al nivel») y la gestión propia de `P`/`Escape`. No queda ningún indicador dentro del canvas: puntuación, vidas y nivel salen por el HUD React.
- Mapeo al HUD React: `score` = puntos, `lives` = vidas restantes (número, 3→0), `level` = nivel actual (sin tope en 5).
- Registro: `ladrillos: createLadrillosGame` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-ladrillos` (con `::before`/`::after`) en `app/globals.css`: `::after` dibuja filas de ladrillos neón de colores en la parte alta con un hueco abierto; `::before` una bola con halo cyan y una pala cyan en la base con `text-shadow`/`box-shadow` neón.
- Catálogo: migración MCP `apply_migration` `seed_game_ladrillos` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer`; `GameStats.lives` ya es `number | null`):
  - `onStats` solo cuando cambian `score`, `lives` o `level`.
  - Game over (0 vidas) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()` (puntuación 0, 3 vidas, nivel 1); desmontar → `destroy()`.
  - Teclas de juego (`ArrowLeft`, `ArrowRight`) con `preventDefault`, excepto con foco en `input`/`textarea`/`contentEditable`. Con la partida terminada o en pausa el motor ignora el input de teclado y de ratón.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil.
- Sonido o música nuevos, mecánicas no presentes en la referencia (power-ups, ángulo de rebote según impacto, bloques de varios golpes, lanzamiento manual de la bola).
- Cambios de esquema en `games`, `scores` o `games_with_stats`.
- Puntuaciones seed o cualquier dato ficticio.
- Resolución lógica distinta de 800×600.
- Restyle neón del canvas (los sprites se conservan tal cual).
- Selector de nivel en la pausa y pantalla de victoria «¡Completaste el juego!».
- Tests automatizados.

---

## Data model

Fila nueva en `public.games` (migración `seed_game_ladrillos`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'ladrillos',
  'LADRILLOS',
  'Rebota la bola y no dejes que caiga.',
  'Cinco muros de ladrillos te separan de la gloria. Mueve la pala con el ratón o las flechas, mantén la bola en juego y derriba cada ladrillo. Cada nivel acelera la bola un poco más, y cuando acabas el último, el muro vuelve a empezar más rápido.',
  'ARCADE',
  'cover-ladrillos',
  'cyan',
  3
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios).

Estado interno del motor (privado a `engine.ts`): `paddle` (`x`), `ball` (`x`, `y`, `vx`, `vy`), `blocks[]` (`x`, `y`, `w`, `h`, `color`, `alive`), `explosions[]` (`x`, `y`, `w`, `h`, `color`, `elapsed`), `spritesLoaded`, `score`, `lives`, `level`, `state: 'playing' | 'gameover'`, `keys`, `lastTime`, `rafId`, `destroyed`, `lastStats`, y los `HTMLAudioElement` de sonido.

---

## Implementation plan

1. Crear `app/games/ladrillos/constants.ts`. `npx tsc --noEmit` pasa.
2. Copiar `spritesheet-breakout.png` a `public/games/ladrillos/` y crear `sprites.ts`, `levels.ts` (5 diseños + `levelSpeed`) y `entities.ts` (pala, bola, bloques y explosiones con `draw(ctx)`). `npx tsc --noEmit` pasa.
3. Crear `engine.ts` con `createLadrillosGame` (carga de sprites, loop, input teclado + ratón, colisiones, vidas, niveles y bucle, tope de score, sonidos, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. Copiar los 2 mp3 a `public/games/ladrillos/sounds/`. `npx tsc --noEmit` pasa.
4. Añadir `.cover-ladrillos` a `app/globals.css`.
5. Aplicar la migración `seed_game_ladrillos`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `ladrillos` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/ladrillos` muestra el Detalle con Top 10 vacío.
6. Verificación de juego: `/juegos/ladrillos/jugar` es jugable con teclado y ratón; HUD React refleja puntuación, vidas y nivel; pausa, FIN y JUGAR DE NUEVO funcionan; romper bloques suma 10; perder la bola resta una vida; completar el nivel 1 pasa al 2 con bola más rápida; tras el nivel 5 el muro vuelve a empezar con nivel 6; los sprites y sonidos cargan sin 404.
7. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=ladrillos` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = 'ladrillos'`).
8. Regresión y cierre: `/juegos/asteroides/jugar` y `/juegos/bloques/jugar` siguen igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `ladrillos` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta LADRILLOS con la portada `.cover-ladrillos`; el filtro "ARCADE" la incluye.
- [ ] `/juegos/ladrillos` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/ladrillos/jugar`.
- [ ] En `/juegos/ladrillos/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] `←`/`→` mueven la pala a 400 px/s sin salir del canvas y ninguna de esas teclas desplaza la página.
- [ ] Mover el ratón sobre el canvas centra la pala bajo el cursor, también con el canvas escalado por CSS, y sin salir de `[0, 719]`.
- [ ] Al iniciar, la bola nace sobre la pala y se mueve de inmediato con `vx = 200`, `vy = −300` (nivel 1).
- [ ] La bola rebota en pared izquierda, derecha, techo y pala; si no llega a la pala, cae y se pierde.
- [ ] Romper un ladrillo suma 10 puntos en el HUD React e invierte la velocidad vertical de la bola.
- [ ] Perder la bola resta una vida en el HUD React (3→2) y la bola reaparece sobre la pala sin tocar los ladrillos restantes.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] Destruir los 60 ladrillos del nivel 1 pone el nivel del HUD en 02, muestra la pirámide invertida de 40 ladrillos y la bola va a `vx = 220`, `vy = −330`.
- [ ] Los niveles 3, 4 y 5 tienen 30, 39 y 39 ladrillos y velocidades ×1.21, ×1.33 y ×1.46.
- [ ] Completar el nivel 5 pone el nivel en 06, vuelve a mostrarse la rejilla completa del nivel 1 y la bola es más rápida que en el nivel 5; no aparece "¡Completaste el juego!".
- [ ] La velocidad de la bola nunca supera el multiplicador 2.0 (`|vy| ≤ 600`).
- [ ] Pala, bola y ladrillos se dibujan con los sprites de `spritesheet-breakout.png` (pala a 81×14, ladrillos a 64×24), sin 404 en `/games/ladrillos/spritesheet-breakout.png`.
- [ ] Cada ladrillo roto muestra una animación de 4 frames de ~150 ms con los frames de su color y desaparece al terminar.
- [ ] Rebotes y rotura de ladrillos reproducen sus sonidos; sin errores de consola si el navegador bloquea el audio; sin 404 en `/games/ladrillos/sounds/*`.
- [ ] El HUD React muestra puntuación, vidas `♥` y nivel; el canvas no dibuja SCORE/NIVEL/vidas ni overlays de pausa/game over/victoria.
- [ ] PAUSA congela la partida (bola y pala quietas, el ratón no mueve la pala) y muestra "EN PAUSA"; REANUDAR la continúa; `P` y `Escape` hacen lo mismo; no hay selector de nivel.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación actual.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'ladrillos'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=ladrillos` al recargar.
- [ ] `/salon` muestra una tab LADRILLOS que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas, nivel 1 y rejilla del nivel 1.
- [ ] La puntuación nunca supera 1.000.000.
- [ ] Tras SALIR, pulsar teclas de juego o mover el ratón en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [ ] `/juegos/asteroides/jugar` y `/juegos/bloques/jugar` siguen funcionando igual que antes.
- [ ] `scores` no contiene filas de prueba de `ladrillos` al terminar.
- [ ] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [ ] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** juego real con motor TS en `app/games/ladrillos/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos escalado por CSS. Convención de la plataforma; coincide con la referencia.
- **Sí:** `id = ladrillos`, título `LADRILLOS`, sin nombre comercial del juego original. Decisión explícita del usuario.
- **Sí:** `cat = ARCADE`, `color = cyan`, `sort_order = 3`. Decisión explícita del usuario.
- **Sí:** textos `short`/`long` según el borrador propuesto. Decisión explícita del usuario.
- **Sí:** conservar el spritesheet original y la animación de explosión por frames (150 ms, 4 frames), copiados a `public/games/ladrillos/`. Decisión explícita del usuario (revisión del Draft; sustituye al restyle neón propuesto antes).
- **No:** restyle neón del canvas. Los sprites se mantienen; la portada `.cover-ladrillos` sí usa la paleta neón del proyecto.
- **Sí:** mantener los 2 sonidos de la referencia en `public/games/ladrillos/sounds/`. Decisión explícita del usuario.
- **Sí:** teclado + ratón. Decisión explícita del usuario.
- **Sí:** tras el nivel 5 los niveles se repiten acelerando (`min(1.1^(n−1), 2.0)`); sin pantalla de victoria. Decisión explícita del usuario.
- **Sí:** tope de velocidad 2.0 y tope de puntuación 1.000.000 en el motor. Evita tunneling con `dt` de 50 ms y que el guardado choque con el `CHECK` de `scores`.
- **Sí:** `lives` numérico (3→0); no se usa `null`.
- **No:** HUD propio en el canvas ni overlays de pausa/game over/victoria. Los pone `GamePlayer`.
- **No:** selector de nivel en la pausa (atajo de depuración) ni clic de ratón en pausa.
- **No:** gestión de `P`/`Escape` en el motor; la hace `GamePlayer`.
- **No:** mecánicas nuevas (power-ups, ángulo de rebote, lanzamiento manual).

---

## Identified risks

| Riesgo                                                                         | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners       | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup.               |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales   | Ignorar eventos cuyo `target` es `input`/`textarea`; sin input con la partida terminada.                                       |
| `onStats` en cada frame provoca re-renders                                     | Emitir solo cuando cambian `score`, `lives` o `level`.                                                                         |
| El escalado CSS difumina el canvas                                             | Aceptado; la paleta neón tolera el suavizado.                                                                                  |
| Sonidos/sprites 404 por rutas relativas o audio bloqueado sin interacción      | Rutas absolutas `/games/ladrillos/…`, `play()` con `.catch()` y comprobación en la verificación.                               |
| El spritesheet carga de forma asíncrona y el componente se desmonta antes      | El loop arranca tras la carga; si `destroyed`, no se arranca; `onerror` registra el fallo sin romper la página.                |
| Sprites reescalados (32×16→64×24, 162→81) salen borrosos o con artefactos      | Aceptado; mismo reescalado que la referencia. Verificación visual.                                                             |
| Ratón con el canvas escalado por CSS descentra la pala                         | Coordenadas con `getBoundingClientRect()` y factor `canvas.width / rect.width`; listener en el canvas, quitado en `destroy()`. |
| Ratón mueve la pala durante pausa o tras game over                             | El handler comprueba `paused` y `state` antes de actuar.                                                                       |
| Tunneling de la bola a alta velocidad (bola 16 px, ladrillo 24 px, `dt` 50 ms) | `MAX_SPEED_MULT = 2.0` (≤ 30 px por frame de máximo `dt`) y un solo bloque por frame como el original.                         |
| La bola se queda en un bucle horizontal sin bajar (física sin ángulo de pala)  | Aceptado: es el comportamiento de la referencia; `vx` siempre es distinto de 0.                                                |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                          | Limitada en el motor con `MAX_SCORE`.                                                                                          |
| Al reanudar, `dt` acumula el tiempo en pausa                                   | `lastTime = null` al arrancar el loop y `dt` limitado a 50 ms.                                                                 |
| Los `mp3` de la referencia cambian en el futuro                                | El port es una copia; no hay sincronización con `references/`.                                                                 |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable.
- Cambios de esquema en Supabase.
- Datos ficticios.
- Restyle neón del canvas, selector de nivel y pantalla de victoria.
- Power-ups, ángulo de rebote según impacto o lanzamiento manual.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
