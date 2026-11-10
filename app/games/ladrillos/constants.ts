// Constantes portadas de references/started-games/04-arkanoid/

// ── Dimensiones lógicas del canvas ────────────────────────────────────────────
export const W = 800;
export const H = 600;

/** dt máximo por frame, en segundos (50 ms). */
export const MAX_DT = 0.05;

// ── Pala ──────────────────────────────────────────────────────────────────────
export const PADDLE_SPEED = 400;
export const PADDLE = { y: 560, w: 81, h: 14 } as const;

// ── Bola ──────────────────────────────────────────────────────────────────────
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

// ── Bloques ───────────────────────────────────────────────────────────────────
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80;
export const BLOCKS_ORIGIN_Y = 80;

// ── Puntuación y vidas ────────────────────────────────────────────────────────
export const POINTS_PER_BLOCK = 10;
export const INITIAL_LIVES = 3;
export const MAX_SCORE = 1_000_000;

// ── Explosión ─────────────────────────────────────────────────────────────────
/** Duración de la animación de explosión, en segundos (150 ms). */
export const EXPLOSION_DURATION = 0.15;

// ── Niveles y velocidad ───────────────────────────────────────────────────────
/** Multiplicador de velocidad de los 5 primeros niveles. */
export const LEVEL_SPEEDS: readonly number[] = [1.0, 1.1, 1.21, 1.33, 1.46];
/** Crecimiento por nivel a partir del nivel 6: 1.1^(level − 1). */
export const SPEED_GROWTH = 1.1;
/** Tope del multiplicador de velocidad (evita tunneling con dt de 50 ms). */
export const MAX_SPEED_MULT = 2.0;
