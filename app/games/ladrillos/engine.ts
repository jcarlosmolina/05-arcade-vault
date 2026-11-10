// Motor del juego de ladrillos, portado de references/started-games/04-arkanoid/game.js
// Sin globals: todo el estado vive en el closure de createLadrillosGame.

import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from '../types';
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  H,
  INITIAL_LIVES,
  EXPLOSION_DURATION,
  MAX_DT,
  MAX_SCORE,
  PADDLE,
  PADDLE_SPEED,
  POINTS_PER_BLOCK,
  W,
} from './constants';
import {
  ballHitsBlock,
  createBlocks,
  createExplosion,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
  placeBall,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from './entities';
import { levelSpeed } from './levels';
import { loadSpritesheet } from './sprites';

/** Teclas de juego: se les hace preventDefault para que no desplacen la página. */
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight']);

const BOUNCE_SOUND_URL = '/games/ladrillos/sounds/ball-bounce.mp3';
const BREAK_SOUND_URL = '/games/ladrillos/sounds/break-sound.mp3';

type State = 'playing' | 'gameover';

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

export const createLadrillosGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('Canvas 2D no disponible');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── Sonidos ─────────────────────────────────────────────────────────────────
  const bounceSound =
    typeof Audio !== 'undefined' ? new Audio(BOUNCE_SOUND_URL) : null;
  const breakSound =
    typeof Audio !== 'undefined' ? new Audio(BREAK_SOUND_URL) : null;

  function playSound(sound: HTMLAudioElement | null) {
    if (!sound || destroyed) return;
    const p = (sound.cloneNode() as HTMLAudioElement).play();
    // El navegador puede bloquear el audio: se ignora el rechazo.
    if (p !== undefined) p.catch(() => {});
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0 };
  const ball: Ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let spritesLoaded = false;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = 'playing';
  let paused = false;
  let destroyed = false;
  const keys = { ArrowLeft: false, ArrowRight: false };

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
  function resetBall() {
    placeBall(ball, paddle, BASE_BALL_VX, BASE_BALL_VY, levelSpeed(level));
  }

  function loadLevel(n: number) {
    level = n;
    blocks = createBlocks(n);
    explosions = [];
    resetBall();
  }

  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    state = 'playing';
    paddle.x = (W - PADDLE.w) / 2;
    loadLevel(1);
    lastStats = null;
  }

  function gameOver() {
    state = 'gameover';
    draw();
    emitStats();
    callbacks.onGameOver(score);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (isTextField(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.code in keys) keys[e.code as keyof typeof keys] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code in keys) keys[e.code as keyof typeof keys] = false;
  }

  function onMouseMove(e: MouseEvent) {
    // En pausa o con la partida terminada el motor ignora el input.
    if (destroyed || paused || state === 'gameover') return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = ((e.clientX - rect.left) * canvas.width) / rect.width;
    paddle.x = Math.max(0, Math.min(W - PADDLE.w, mouseX - PADDLE.w / 2));
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    // Pala
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - PADDLE.w, paddle.x + PADDLE_SPEED * dt);

    // Bola
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebotes en paredes y techo
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + BALL_SIZE >= W) {
      ball.x = W - BALL_SIZE;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    // Rebote en la pala
    if (
      ball.vy > 0 &&
      ball.x + BALL_SIZE > paddle.x &&
      ball.x < paddle.x + PADDLE.w &&
      ball.y + BALL_SIZE >= PADDLE.y &&
      ball.y + BALL_SIZE <= PADDLE.y + PADDLE.h + 8
    ) {
      ball.y = PADDLE.y - BALL_SIZE;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }

    // Colisión con bloques (uno por frame)
    for (const block of blocks) {
      if (!block.alive) continue;
      if (ballHitsBlock(ball, block)) {
        block.alive = false;
        explosions.push(createExplosion(block));
        addScore(POINTS_PER_BLOCK);
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) loadLevel(level + 1);
        break;
      }
    }

    // Explosiones
    for (const exp of explosions) exp.elapsed += dt;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Bola perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameOver();
      } else {
        resetBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (const block of blocks) drawBlock(ctx, block);
    for (const exp of explosions) drawExplosion(ctx, exp);
    drawPaddle(ctx, paddle);
    drawBall(ctx, ball);
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

  // ── Arranque: el loop empieza tras cargar el spritesheet ────────────────────
  initGame();
  emitStats();
  draw();

  loadSpritesheet()
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
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
    },
  };
};
