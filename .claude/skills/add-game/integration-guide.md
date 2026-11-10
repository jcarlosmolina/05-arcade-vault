# Guía de integración — juegos reales en Arcade Vault

Referencia técnica para `/add-game`. Describe lo que ya existe (SPEC 05 + SPEC 06) y las convenciones que todo spec de juego debe respetar. Verifica los archivos citados antes de escribir el spec: si algo cambió, manda el código.

## 1. Contrato de motor — `app/games/types.ts`

```ts
interface GameStats {
  score: number;
  lives: number;
  level: number;
} // lives puede ser number | null tras el primer juego sin vidas
interface GameCallbacks {
  onStats(stats): void;
  onGameOver(finalScore: number): void;
}
interface GameInstance {
  pause();
  resume();
  restart();
  end();
  destroy();
}
type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

Registro en `app/games/registry.ts`: `GAME_ENGINES: Record<string, GameFactory>`. Estar en el registro = juego real (canvas + guardado en `scores`). Fuera del registro = simulación con "MODO DEMO — NO SE GUARDA".

## 2. Patrón de motor — `app/games/asteroides/engine.ts`

Copiar la forma, no el contenido:

- Todo el estado en el closure de `create<Nombre>Game`; nada global.
- `canvas.getContext('2d')` con error si falla.
- Input con listeners en `window` (`keydown`/`keyup`), guardados para quitarlos en `destroy()`:
  - `isTextField(e.target)` → ignorar (input/textarea/contentEditable).
  - `state === 'gameover'` → ignorar.
  - `GAME_KEYS.has(e.code)` → `preventDefault()`.
  - `keys` (mantenidas) + `justPressed` (flanco), limpiados en `clearInput()` y al reanudar.
- `emitStats()` compara con `lastStats` y solo llama a `onStats` si cambió algo.
- `gameOver()`: `state = 'gameover'`, `clearInput()`, `emitStats()`, `onGameOver(score)`.
- Loop: `dt = min((ts - lastTime) / 1000, MAX_DT)`; tras `update(dt)` comprobar `if (destroyed) return` (onGameOver puede desmontar el componente).
- `startLoop()`/`stopLoop()` con `rafId`; `lastTime = null` al arrancar para no saltar tras una pausa.
- API: `pause` (para loop), `resume` (limpia `justPressed` y arranca), `restart` (`initGame()` + `emitStats()` + loop), `end` (→ `gameOver()` si no lo está), `destroy` (`destroyed = true`, `stopLoop()`, quitar listeners).
- Arranque: `initGame(); emitStats(); startLoop();`.

## 3. Consumidor — `components/GamePlayer.tsx`

- Canvas fijo `width={800} height={600}` dentro de `.crt-screen` (aspect-ratio 4:3), escalado al 100% por CSS. **No se cambia por juego.**
- Crea la instancia en `useEffect` y llama `destroy()` en el cleanup.
- Pausa: estado React `paused` → `engine.pause()/resume()`; botón + teclas `P`/`Escape` (ya gestionadas; el motor no debe usarlas).
- FIN → `engine.end()`; JUGAR DE NUEVO → `engine.restart()` y reset de estados React.
- HUD React: Jugador, Puntuación, Vidas (`♥` × lives), Nivel (2 dígitos).
- Guardado: `createClient()` de `app/lib/supabase/client.ts` → `insert` en `scores` `{ game_id, player_name, score }`, estados saving/saved/error.

## 4. Datos — Supabase (SPEC 06)

- `games(id, title, short, long, cat, cover, color, sort_order, created_at)`; `cat ∈ ARCADE|PUZZLE|SHOOTER|VERSUS`, `color ∈ cyan|magenta|yellow|green`. RLS solo lectura → las filas nuevas entran **por migración** (`apply_migration`, nombre `seed_game_<id>`).
- `scores(game_id → games.id, player_name 1–10 chars, score 0–1.000.000)`. Insert público; sin update/delete. Nunca sembrar.
- `games_with_stats` (security_invoker) añade `best` y `plays`.
- `app/lib/games.ts` (`getGames`, `getGame`, `getTopScores`) no necesita cambios: Home, Biblioteca, Detalle y tabs de `/salon` aparecen solos con la fila en `games`.
- Añadir una fila no cambia el esquema → no hace falta regenerar `database.types.ts`.
- Limpieza tras probar: `delete from public.scores where game_id = '<id>'` vía `execute_sql`.

## 5. Portada — `app/globals.css`

Clase `.cover-<id>` con `background` + `::before`/`::after` absolutos (`inset: 0`), como `.cover-asteroides` (gradientes radiales + carácter con `text-shadow` neón). Paleta:

| Variable    | Hex       |
| ----------- | --------- |
| `--cyan`    | `#00f5ff` |
| `--magenta` | `#ff006e` |
| `--yellow`  | `#f5ff00` |
| `--green`   | `#00ff88` |

En el canvas se usan los hex (no hay variables CSS en canvas), en `COLORS` de `constants.ts`, con brillo vía `shadowBlur`.

## 6. Checklist de port desde HTML/JS plano (`references/started-games/*`)

- `document.getElementById(...)` del canvas → parámetro `canvas`. Canvas secundarios (p. ej. preview de pieza siguiente) → se dibujan en el mismo canvas 800×600.
- HUD en DOM (`#score`, `#lines`, `#level`) y HUD dibujado en canvas → se eliminan; los valores salen por `onStats`. Datos extra sin hueco en el HUD (líneas, pieza siguiente, power-up) → dentro del canvas.
- Overlays propios de pausa, game over, victoria y "pulsa X para reiniciar" → se eliminan (los pone `GamePlayer`).
- `document.addEventListener` sin cleanup → listeners en `window` quitados en `destroy()`.
- Unidades: si la referencia trabaja en ms (`dropInterval`, `EXPLOSION_DURATION`), convertir a segundos o documentar la unidad.
- Resolución distinta de 800×600: reescalar o centrar el área de juego; nunca cambiar el canvas de `GamePlayer`.
- Ratón: coordenadas con `getBoundingClientRect()` y factor `canvas.width / rect.width` (el canvas está escalado por CSS). Listeners en el `canvas`, quitados en `destroy()`.
- Imágenes/audio: copiar a `public/games/<id>/` y cargar con rutas absolutas (`/games/<id>/...`). Audio: `cloneNode().play()` puede rechazar la promesa sin interacción previa → capturar el error.
- Estados del original (`'playing' | 'paused' | 'gameover' | 'win'`): la pausa la controla la API; `win` se mapea a lo acordado en el spec (game over con puntuación o bucle de niveles).
- Funciones de depuración o atajos (selector de nivel, teclas de trucos) → fuera, salvo decisión explícita.

## 7. Referencias actuales

| Carpeta        | Notas para el port                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `02-asteroids` | Ya integrado como `asteroides` (SPEC 05). Ejemplo canónico.                                                                                                                                                  |
| `03-tetris`    | Canvas 300×600 + preview 120×120; sin vidas (`lives: null`); `level = floor(lines/10)+1`; `LINE_SCORES × level`, hard drop +2/celda, soft drop +1; HUD DOM con líneas → dentro del canvas. Título sin marca. |
| `04-arkanoid`  | Canvas 800×600; `levels.js` con 5 niveles; spritesheet + sonidos en `assets/`; ratón + teclado; pausa con selector de nivel (candidata a descartar); estado `win` tras el nivel 5. Título sin marca.         |
