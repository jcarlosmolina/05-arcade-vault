// Motor del juego Serpiente (diseño original de género, SPEC 09).
// Sin globals: todo el estado vive en el closure de createSerpienteGame.

import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameOptions,
  GameStats,
} from '../types';
import {
  BASE_TICK,
  COLS,
  FRUITS_PER_LEVEL,
  INITIAL_LIVES,
  MAX_DT,
  MAX_SCORE,
  MIN_TICK,
  POINTS_PER_FRUIT,
  ROWS,
  TICK_FACTOR,
} from './constants';
import {
  createSnake,
  DIR_VECTORS,
  drawBoard,
  drawFruitAt,
  drawScanlines,
  drawSnake,
  OPPOSITE,
  spawnFruit,
  type Cell,
  type Dir,
  type Fruit,
} from './entities';
import { DEFAULT_SKIN, isSkinId } from '../skins';
import { SKINS, type SerpientePalette } from './skins';
import { loadFruits } from './sprites';

/** Teclas de juego → dirección. Se les hace preventDefault. */
const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

type State = 'playing' | 'gameover';

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

/** Intervalo de tick (s) para un nivel: max(BASE × FACTOR^(level−1), MIN). */
function tickInterval(level: number): number {
  return Math.max(BASE_TICK * Math.pow(TICK_FACTOR, level - 1), MIN_TICK);
}

export const createSerpienteGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('Canvas 2D no disponible');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── Estado ──────────────────────────────────────────────────────────────────
  let snake: Cell[] = createSnake();
  /** Dirección aplicada en el último tick. */
  let dir: Dir = 'right';
  /** Buffer de un giro: la última dirección válida pulsada entre ticks. */
  let nextDir: Dir = 'right';
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let tickAcc = 0;
  let spritesLoaded = false;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = 'playing';
  let paused = false;
  let destroyed = false;
  let palette: SerpientePalette =
    SKINS[isSkinId(options?.skin) ? options.skin : DEFAULT_SKIN];

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastStats: GameStats | null = null;

  // ── Stats ───────────────────────────────────────────────────────────────────
  /** Notifica a React solo cuando cambia score, lives o level. */
  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  function addScore(points: number) {
    score = Math.min(score + points, MAX_SCORE);
  }

  // ── Lógica de partida ───────────────────────────────────────────────────────
  function resetSnake() {
    snake = createSnake();
    dir = 'right';
    nextDir = 'right';
    tickAcc = 0;
    // La fruta se genera después de colocar la serpiente, en celda libre.
    fruit = spawnFruit(snake);
  }

  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    fruitsEaten = 0;
    state = 'playing';
    resetSnake();
    lastStats = null;
  }

  function gameOver() {
    state = 'gameover';
    draw();
    emitStats();
    callbacks.onGameOver(score);
  }

  /** Colisión mortal: −1 vida; reaparece o game over. */
  function loseLife() {
    lives--;
    if (lives <= 0) {
      lives = 0;
      gameOver();
    } else {
      resetSnake();
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (isTextField(e.target)) return;
    const wanted = KEY_DIRS[e.code];
    if (!wanted) return;
    e.preventDefault();
    // En pausa o con la partida terminada el motor ignora el input.
    if (destroyed || paused || state === 'gameover') return;
    // Se valida contra la dirección del último tick, no contra la pulsada.
    if (wanted === OPPOSITE[dir]) return;
    nextDir = wanted;
  }

  window.addEventListener('keydown', onKeyDown);

  // ── Tick ────────────────────────────────────────────────────────────────────
  function tick() {
    dir = nextDir;
    const v = DIR_VECTORS[dir];
    const head = snake[0];
    const next: Cell = { col: head.col + v.col, row: head.row + v.row };

    // Muro
    if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
      loseLife();
      return;
    }

    const eating =
      fruit !== null && fruit.col === next.col && fruit.row === next.row;

    // Cuerpo propio: la cola que se libera no cuenta salvo que se esté comiendo.
    const bodyLen = eating ? snake.length : snake.length - 1;
    for (let i = 0; i < bodyLen; i++) {
      if (snake[i].col === next.col && snake[i].row === next.row) {
        loseLife();
        return;
      }
    }

    snake.unshift(next);
    if (!eating) {
      snake.pop();
      return;
    }

    // Comer: puntos con el nivel vigente antes de comer.
    addScore(POINTS_PER_FRUIT * level);
    fruitsEaten++;
    level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
    fruit = spawnFruit(snake);
    // Sin celdas libres: tablero lleno → game over.
    if (fruit === null) gameOver();
  }

  function update(dt: number) {
    tickAcc += dt;
    // Procesa los ticks pendientes; el intervalo se recalcula por si sube el nivel.
    while (state === 'playing' && !destroyed) {
      const interval = tickInterval(level);
      if (tickAcc < interval) break;
      tickAcc -= interval;
      const livesBefore = lives;
      tick();
      // Tras perder una vida el acumulador ya se reinició a 0.
      if (lives !== livesBefore) break;
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    drawBoard(ctx, palette);
    if (fruit) drawFruitAt(ctx, palette, fruit);
    drawSnake(ctx, palette, snake, dir);
    drawScanlines(ctx, palette);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed || paused) {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    if (destroyed) return; // onGameOver puede desmontar el componente
    if (state === 'gameover') {
      rafId = null; // el último frame ya está dibujado
      return;
    }
    emitStats();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (
      destroyed ||
      paused ||
      !spritesLoaded ||
      state === 'gameover' ||
      rafId !== null
    )
      return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── Arranque: el loop empieza tras cargar fruits.png ────────────────────────
  initGame();
  emitStats();
  draw();

  loadFruits()
    .then(() => {
      if (destroyed) return;
      spritesLoaded = true;
      draw();
      startLoop();
    })
    .catch((err) => {
      console.error(err);
    });

  // ── API pública ─────────────────────────────────────────────────────────────
  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      startLoop();
    },
    restart() {
      if (destroyed) return;
      stopLoop();
      initGame();
      emitStats();
      draw();
      paused = false;
      startLoop();
    },
    end() {
      if (destroyed || state === 'gameover') return;
      stopLoop();
      gameOver();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      window.removeEventListener('keydown', onKeyDown);
    },
    setSkin(skin) {
      if (destroyed || !isSkinId(skin)) return;
      palette = SKINS[skin];
      // Redibuja ya (también en pausa o game over); no toca el estado de juego.
      draw();
    },
  };
};
