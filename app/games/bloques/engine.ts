// Motor del juego de bloques, portado de references/started-games/03-tetris/game.js
// Sin globals: todo el estado vive en el closure de createBloquesGame.

import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameOptions,
  GameStats,
} from '../types';
import {
  clearCanvas,
  clearLines,
  collide,
  createBoard,
  drawBoard,
  drawGhost,
  drawPiece,
  drawScanlines,
  drawSidePanels,
  ghostY,
  merge,
  randomPiece,
  rotateCW,
  type Board,
  type Piece,
} from './board';
import {
  BASE_DROP,
  DROP_STEP,
  HARD_DROP_POINTS,
  KICKS,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MAX_DT,
  MAX_SCORE,
  MIN_DROP,
  SOFT_DROP_POINTS,
} from './constants';
import { SKINS, type BloquesPalette } from './skins';
import { DEFAULT_SKIN, isSkinId } from '../skins';

/** Teclas de juego: se les hace preventDefault para que no desplacen la página. */
const GAME_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyX',
  'Space',
]);

type State = 'playing' | 'gameover';

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

function dropIntervalFor(level: number): number {
  return Math.max(MIN_DROP, BASE_DROP - (level - 1) * DROP_STEP);
}

export const createBloquesGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('Canvas 2D no disponible');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── Estado ──────────────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = dropIntervalFor(1);
  let dropAccum = 0;
  let state: State = 'playing';
  let paused = false;
  let destroyed = false;
  let palette: BloquesPalette =
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
      lastStats.lives === null &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives: null, level };
    callbacks.onStats(lastStats);
  }

  function addScore(points: number) {
    score = Math.min(score + points, MAX_SCORE);
  }

  // ── Lógica de partida ───────────────────────────────────────────────────────
  function initGame() {
    board = createBoard();
    current = randomPiece();
    next = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = dropIntervalFor(1);
    dropAccum = 0;
    state = 'playing';
    lastStats = null;
  }

  function gameOver() {
    state = 'gameover';
    draw();
    emitStats();
    callbacks.onGameOver(score);
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }

  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      // Puntos con el nivel anterior a recalcularlo
      addScore((LINE_SCORES[cleared] ?? 0) * level);
      lines += cleared;
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = dropIntervalFor(level);
    }
    spawn();
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(SOFT_DROP_POINTS);
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    const gy = ghostY(board, current);
    addScore((gy - current.y) * HARD_DROP_POINTS);
    current.y = gy;
    lockPiece();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (isTextField(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    // En pausa o con la partida terminada el motor ignora el input.
    if (paused || state === 'gameover' || destroyed) return;

    switch (e.code) {
      case 'ArrowLeft':
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case 'ArrowRight':
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case 'ArrowUp':
      case 'KeyX':
        tryRotate();
        break;
      case 'ArrowDown':
        softDrop();
        break;
      case 'Space':
        hardDrop();
        break;
      default:
        return;
    }
    emitStats();
  }

  window.addEventListener('keydown', onKeyDown);

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    clearCanvas(ctx, palette);
    drawBoard(ctx, palette, board);
    drawGhost(ctx, palette, board, current);
    drawPiece(ctx, palette, current);
    drawSidePanels(ctx, palette, lines, next);
    drawScanlines(ctx, palette);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  function update(dt: number) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }

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
      rafId = null; // sin animación tras el fin: el último frame ya está dibujado
      return;
    }
    emitStats();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (destroyed || paused || state === 'gameover' || rafId !== null) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  initGame();
  emitStats();
  draw();
  startLoop();

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
    setSkin(skin) {
      if (destroyed || !isSkinId(skin)) return;
      palette = SKINS[skin];
      // Sin cachés que regenerar: basta redibujar (cubre pausa y fin de partida).
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      window.removeEventListener('keydown', onKeyDown);
    },
  };
};
