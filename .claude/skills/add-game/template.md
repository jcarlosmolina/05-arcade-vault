# SPEC <NN> — Juego real de <nombre> en el Reproductor

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** <YYYY-MM-DD>
> **Objective:** <Portar a TypeScript el juego de `references/started-games/<carpeta>/` | Crear el juego original <nombre>> y ejecutarlo como juego real en `/juegos/<id>/jugar`, conectado al HUD y al modal de fin de partida, con su fila en `games` y puntuaciones guardadas en `scores`.

---

## Scope

**In:**

<!-- CONDICIONAL: solo si `lives` aún no es opcional en app/games/types.ts y el juego no tiene vidas -->

- Vidas opcionales en el HUD (cambio de plataforma, una sola vez):
  - `GameStats.lives` pasa a `number | null` en `app/games/types.ts`.
  - `components/GamePlayer.tsx`: estado `lives` admite `null`; la stat "Vidas" del HUD no se renderiza si es `null`. Asteroides sigue enviando un número y no cambia.

<!-- /CONDICIONAL -->

- Port a TypeScript modular en `app/games/<id>/`:
  - `constants.ts`: dimensiones lógicas (`W = 800`, `H = 600`), <constantes portadas: tamaños, velocidades, puntuación, niveles>, `MAX_DT = 0.05` y la paleta `COLORS`.
  - `<entities.ts | board.ts | …>`: <clases/funciones del dominio>, con `draw(ctx)` recibiendo el contexto por parámetro (sin globals).
  - `engine.ts`: `create<Nombre>Game(canvas, callbacks)` (`GameFactory`) con loop `requestAnimationFrame`, `dt` limitado a 50 ms, input, <lógica específica>, y los métodos `pause`/`resume`/`restart`/`end`/`destroy`.
- Mecánicas portadas 1:1: <lista con números concretos: puntuación, vidas, niveles, velocidades, probabilidades>.
- Layout en 800×600: <cómo se dibuja el área de juego y los laterales; solo si la referencia usa otra resolución>.
- Restyle neón con la paleta del proyecto y brillo con `shadowBlur`: <entidad → color (`--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`)>.

<!-- CONDICIONAL: assets -->

- Assets copiados de la referencia a `public/games/<id>/` (<sprites / sonidos>), cargados con rutas absolutas `/games/<id>/…`.

<!-- /CONDICIONAL -->

- Se elimina del canvas: <HUD propio (score/nivel/vidas), overlays de pausa y game over, reinicio por tecla, …>. Se mantiene dentro del canvas: <indicadores sin hueco en el HUD React, o "nada">.
- Registro: `<id>: create<Nombre>Game` en `GAME_ENGINES` (`app/games/registry.ts`).
- Portada: clase `.cover-<id>` (con `::before`/`::after`) en `app/globals.css`: <concepto visual>.
- Catálogo: migración MCP `apply_migration` `seed_game_<id>` que inserta una fila en `public.games` (ver Data model). `scores` no se siembra.
- Conexión con la plataforma existente (sin cambios en `GamePlayer` salvo el bloque condicional):
  - `onStats` solo cuando cambian `score`, `lives` o `level`.
  - Game over (<condición>) y `end()` → `onGameOver(score)` → modal "FIN DEL JUEGO" existente; GUARDAR PUNTUACIÓN inserta en `scores` (ya implementado en SPEC 06).
  - PAUSA/REANUDAR y teclas `P`/`Escape` (gestionadas por `GamePlayer`) → `pause()`/`resume()`; JUGAR DE NUEVO → `restart()`; desmontar → `destroy()`.
  - Teclas de juego (<lista>) con `preventDefault`, excepto con foco en `input`/`textarea`. Con la partida terminada el motor ignora el input.
- El juego aparece automáticamente en Home, Biblioteca, Detalle y como tab en `/salon` al existir su fila en `games`.

**Out of scope:**

- Controles táctiles o jugabilidad en móvil.
- Sonido o música nuevos, mecánicas no presentes en <la referencia | el diseño acordado>.
- Cambios de esquema en `games`, `scores` o `games_with_stats`.
- Puntuaciones seed o cualquier dato ficticio.
- Resolución lógica distinta de 800×600.
- <Funciones de la referencia descartadas>.
- Tests automatizados.

---

## Data model

Fila nueva en `public.games` (migración `seed_game_<id>`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  '<id>',
  '<TITLE>',
  '<short>',
  '<long>',
  '<CAT>',
  'cover-<id>',
  '<color>',
  <sort_order>
);
```

Contrato de motor: `GameFactory` de `app/games/types.ts` (sin cambios<, salvo `lives: number | null`>).

Estado interno del motor (privado a `engine.ts`): <variables de estado: tablero/entidades, score, lives, level, state, paused, keys, …>.

---

## Implementation plan

<!-- CONDICIONAL -->

1. `GameStats.lives` opcional y HUD sin "Vidas" cuando es `null`. Verificación: `npx tsc --noEmit` pasa; `/juegos/asteroides/jugar` sigue mostrando vidas.

<!-- /CONDICIONAL -->

2. Crear `app/games/<id>/constants.ts`. `npx tsc --noEmit` pasa.
3. Crear <entidades/tablero> con su `draw(ctx)` y la paleta `COLORS`. `npx tsc --noEmit` pasa.
4. Crear `engine.ts` con `create<Nombre>Game` (loop, input, lógica, `onStats`/`onGameOver`, API pública) y registrarlo en `GAME_ENGINES`. `npx tsc --noEmit` pasa.
5. Añadir `.cover-<id>` a `app/globals.css`<y copiar assets a `public/games/<id>/`>.
6. Aplicar la migración `seed_game_<id>`. Verificación: `execute_sql` sobre `games_with_stats` devuelve `<id>` con `best = 0` y `plays = 0`; `/biblioteca` muestra la tarjeta con su portada; `/juegos/<id>` muestra el Detalle con Top 10 vacío.
7. Verificación de juego: `/juegos/<id>/jugar` es jugable; HUD React refleja puntuación<, vidas> y nivel; pausa, FIN y JUGAR DE NUEVO funcionan; <mecánicas clave>.
8. Verificación de leaderboard: terminar partida, guardar con un nombre de prueba, verlo en `/salon?juego=<id>` y en el Top 10 del Detalle tras recargar. Después, borrar las filas de prueba de `scores` con `execute_sql` (solo `game_id = '<id>'`).
9. Regresión y cierre: `/juegos/asteroides/jugar` sigue igual; `npm run lint`, `npm run build` y MCP `get_advisors` (seguridad) sin hallazgos nuevos.

---

## Acceptance criteria

- [ ] `games` contiene la fila `<id>` y `games_with_stats` la devuelve con `best = 0` y `plays = 0` sin puntuaciones.
- [ ] `/biblioteca` muestra la tarjeta <TITLE> con la portada `.cover-<id>`; el filtro "<CAT>" la incluye.
- [ ] `/juegos/<id>` muestra el Detalle con sus textos; "JUGAR AHORA" navega a `/juegos/<id>/jugar`.
- [ ] En `/juegos/<id>/jugar` se renderiza un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] <Controles> funcionan y ninguna tecla de juego desplaza la página.
- [ ] <Criterio por cada mecánica clave, con números concretos>.
- [ ] El HUD React muestra puntuación<, vidas> y nivel; el canvas no dibuja su propio HUD ni overlays de pausa/game over.
- [ ] PAUSA congela la partida y muestra "EN PAUSA"; REANUDAR la continúa; `P` y `Escape` hacen lo mismo.
- [ ] <Condición de game over> y FIN abren el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = '<id>'`, nombre en mayúsculas y la puntuación final; aparece en `/salon?juego=<id>` al recargar.
- [ ] `/salon` muestra una tab <TITLE> que cambia el parámetro `juego` de la URL.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0<, vidas iniciales> y nivel 1.
- [ ] Tras SALIR, pulsar teclas de juego en otra página no lanza errores ni desplaza la página (listeners eliminados).
- [ ] `/juegos/asteroides/jugar` sigue funcionando igual que antes.
- [ ] `scores` no contiene filas de prueba de `<id>` al terminar.
- [ ] `npm run lint` y `npm run build` pasan; `get_advisors` sin hallazgos nuevos.
- [ ] No hay errores en la consola durante una partida completa.

---

## Decisions

- **Sí:** juego real con motor TS en `app/games/<id>/` y registro en `GAME_ENGINES`. Patrón de SPEC 05.
- **Sí:** catálogo y puntuaciones en Supabase vía fila en `games` por migración; sin seed de `scores`. Patrón de SPEC 06.
- **Sí:** canvas fijo 800×600 lógicos escalado por CSS. Convención de la plataforma.
- **Sí:** título `<TITLE>`, sin nombre comercial del juego original. <Decisión explícita del usuario>.
- **Sí/No:** <restyle neón vs. sprites originales>.
- **Sí/No:** <sonidos de la referencia>.
- **Sí/No:** <lives null / vidas reales>.
- **No:** <funciones de la referencia descartadas y por qué>.
- <Resto de respuestas de la Fase 2.>

---

## Identified risks

| Riesgo                                                                       | Mitigación                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Doble montaje de efectos en React Strict Mode crea dos loops o listeners     | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; `GamePlayer` lo llama en el cleanup. |
| `preventDefault` en teclas de juego impide escribir en el campo de iniciales | Ignorar eventos cuyo `target` es `input`/`textarea`; sin input con la partida terminada.                         |
| `onStats` en cada frame provoca re-renders                                   | Emitir solo cuando cambian `score`, `lives` o `level`.                                                           |
| El escalado CSS difumina el canvas                                           | Aceptado; la paleta neón tolera el suavizado.                                                                    |
| <Assets 404 por rutas relativas>                                             | <Rutas absolutas `/games/<id>/…` y comprobación en la verificación.>                                             |
| Puntuación superior a 1.000.000 rechazada por `CHECK`                        | <Limitar en el motor / aceptado porque es inalcanzable.>                                                         |
| <Riesgos específicos del juego>                                              | <…>                                                                                                              |

---

## What is **not** in this spec

- Controles táctiles / móvil jugable.
- Cambios de esquema en Supabase.
- Datos ficticios.
- <Funciones descartadas de la referencia>.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
