// Constantes portadas de references/started-games/03-tetris/game.js

// ── Dimensiones lógicas del canvas ────────────────────────────────────────────
export const W = 800;
export const H = 600;

/** dt máximo por frame, en segundos (50 ms). */
export const MAX_DT = 0.05;

// ── Tablero ───────────────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const CELL = 28;
/** Origen del tablero en el canvas (280×560 centrado). */
export const BOARD_X = 260;
export const BOARD_Y = 20;

// ── Piezas (índice = tipo 1–7; 0 = celda vacía) ───────────────────────────────
// I, O, T, S, Z, J, L
export const PIECES: readonly (readonly (readonly number[])[] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];
/** Número de tipos de pieza (elección uniforme `floor(random × 7) + 1`). */
export const PIECE_TYPES = 7;

/** Wall kicks de rotación, en orden de prueba. */
export const KICKS = [0, -1, 1, -2, 2] as const;

// ── Puntuación ────────────────────────────────────────────────────────────────
/** Puntos por 0–4 líneas, multiplicados por el nivel. */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const MAX_SCORE = 1_000_000;

// ── Niveles y gravedad (segundos) ─────────────────────────────────────────────
export const LINES_PER_LEVEL = 10;
export const BASE_DROP = 1.0;
export const DROP_STEP = 0.09;
export const MIN_DROP = 0.1;

// ── Paleta neón (índice = tipo de pieza) ──────────────────────────────────────
export const COLORS: readonly string[] = [
  '',
  '#00f5ff', // I  → --cyan
  '#f5ff00', // O  → --yellow
  '#aa00ff', // T  → violeta
  '#00ff88', // S  → --green
  '#ff006e', // Z  → --magenta
  '#3a7bff', // J  → azul
  '#ff7700', // L  → naranja
];
