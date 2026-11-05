// Motor del juego de asteroides, portado de references/started-games/02-asteroids/game.js
// Sin globals: todo el estado vive en el closure de createAsteroidsGame.

import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from '../types';
import {
  COLORS,
  GLOW,
  H,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  START_LIVES,
  W,
} from './constants';
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from './entities';

/** Teclas de juego: se les hace preventDefault para que no desplacen la página. */
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']);

type State = 'playing' | 'dead' | 'gameover';

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

export const createAsteroidsGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('Canvas 2D no disponible');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── Estado ──────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let powerUps: PowerUp[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let state: State = 'playing';
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let paused = false;
  let destroyed = false;

  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastStats: GameStats | null = null;

  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // Con la partida terminada (modal abierto) el motor no procesa input.
    if (state === 'gameover' || isTextField(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function pressed(code: string): boolean {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function clearInput() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

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

  // ── Lógica de partida ───────────────────────────────────────────────────────
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    state = 'playing';
    deadTimer = 0;
    spawnAsteroids(3 + level);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function gameOver() {
    state = 'gameover';
    clearInput();
    emitStats();
    callbacks.onGameOver(score);
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      state = 'dead';
      deadTimer = RESPAWN_DELAY;
    }
  }

  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  function update(dt: number) {
    if (state === 'gameover') {
      updateParticles(dt);
      return;
    }

    if (state === 'dead') {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = 'playing';
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed('Space')) bullets.push(...ship.tryShoot());

    ship.update(dt, {
      left: !!keys.ArrowLeft,
      right: !!keys.ArrowRight,
      thrust: !!keys.ArrowUp,
    });
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    // Nave vs power-up
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado (killShip() puede haber cambiado state a 'gameover')
    if ((state as State) !== 'gameover' && asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  /** Indicador del power-up activo; el resto del HUD lo pinta React. */
  function drawPowerUpTimer() {
    if (ship.tripleShot <= 0) return;
    ctx.save();
    ctx.fillStyle = COLORS.powerUp;
    ctx.shadowColor = COLORS.powerUp;
    ctx.shadowBlur = GLOW;
    ctx.font = '15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);

    drawPowerUpTimer();
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
    emitStats();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (destroyed || paused || rafId !== null) return;
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
      // Evita disparos acumulados durante la pausa
      for (const k of Object.keys(justPressed)) justPressed[k] = false;
      startLoop();
    },
    restart() {
      if (destroyed) return;
      clearInput();
      initGame();
      emitStats();
      paused = false;
      startLoop();
    },
    end() {
      if (destroyed || state === 'gameover') return;
      gameOver();
      // Si estaba en pausa, el loop vuelve para animar el fondo tras el modal
      paused = false;
      startLoop();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
};
