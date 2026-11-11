// Constantes del juego Serpiente (diseño original de género, SPEC 09)

// ── Dimensiones lógicas del canvas ────────────────────────────────────────────
export const W = 800;
export const H = 600;

// ── Rejilla ───────────────────────────────────────────────────────────────────
export const CELL = 40;
export const COLS = 20; // W / CELL
export const ROWS = 15; // H / CELL

// ── Serpiente ─────────────────────────────────────────────────────────────────
export const INITIAL_LENGTH = 3;
/** Celda inicial de la cabeza. */
export const START_COL = 5;
export const START_ROW = 7;

// ── Vidas, puntuación y niveles ───────────────────────────────────────────────
export const INITIAL_LIVES = 3;
export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;
export const MAX_SCORE = 1_000_000;

// ── Velocidad (intervalo entre ticks, en segundos) ────────────────────────────
export const BASE_TICK = 0.15;
export const TICK_FACTOR = 0.93;
export const MIN_TICK = 0.06;

/** dt máximo por frame, en segundos (50 ms). */
export const MAX_DT = 0.05;

// Paleta: ver ./skins.ts (SKINS por skin).
