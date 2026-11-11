// Entidades del juego Serpiente: rejilla, serpiente y fruta.
// Todas las funciones de dibujo reciben el contexto por parámetro (sin globals).

import {
  CELL,
  COLORS,
  COLS,
  H,
  INITIAL_LENGTH,
  ROWS,
  START_COL,
  START_ROW,
  W,
} from './constants';
import { drawFruit, FRUIT_NAMES, type FruitName } from './sprites';

export interface Cell {
  col: number;
  row: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export interface Fruit extends Cell {
  type: FruitName;
}

/** Serpiente inicial: cabeza en (START_COL, START_ROW), cuerpo hacia la izquierda. */
export function createSnake(): Cell[] {
  const segments: Cell[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    segments.push({ col: START_COL - i, row: START_ROW });
  }
  return segments;
}

/**
 * Fruta nueva en una celda libre al azar con tipo aleatorio.
 * Devuelve null si no quedan celdas libres.
 */
export function spawnFruit(snake: readonly Cell[]): Fruit | null {
  const occupied = new Set(snake.map((s) => s.row * COLS + s.col));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  const idx = free[Math.floor(Math.random() * free.length)];
  const type = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
  return { col: idx % COLS, row: Math.floor(idx / COLS), type };
}

// ── Dibujo ────────────────────────────────────────────────────────────────────

/** Fondo oscuro con rejilla tenue de CELL px. */
export function drawBoard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += CELL) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += CELL) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

/** Fruta con su sprite centrado en la celda, dentro de un cuadrado de 36×36. */
export function drawFruitAt(ctx: CanvasRenderingContext2D, fruit: Fruit): void {
  drawFruit(
    ctx,
    fruit.type,
    fruit.col * CELL + CELL / 2,
    fruit.row * CELL + CELL / 2,
    36,
  );
}

/** Serpiente neón con brillo. `dir` orienta los ojos de la cabeza. */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: readonly Cell[],
  dir: Dir,
): void {
  const pad = 2;
  const size = CELL - pad * 2;

  ctx.save();
  ctx.shadowColor = COLORS.green;
  ctx.shadowBlur = 12;

  // Cuerpo (de cola a cabeza), tono más tenue con alternancia sutil.
  for (let i = snake.length - 1; i >= 1; i--) {
    const s = snake[i];
    ctx.fillStyle = i % 2 === 0 ? COLORS.greenDim : COLORS.green;
    ctx.globalAlpha = i % 2 === 0 ? 0.85 : 0.7;
    ctx.fillRect(s.col * CELL + pad, s.row * CELL + pad, size, size);
  }
  ctx.globalAlpha = 1;

  // Cabeza
  const head = snake[0];
  const hx = head.col * CELL;
  const hy = head.row * CELL;
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(hx + pad, hy + pad, size, size);
  ctx.restore();

  // Ojos (sin brillo)
  const v = DIR_VECTORS[dir];
  const cx = hx + CELL / 2 + v.col * 8;
  const cy = hy + CELL / 2 + v.row * 8;
  // Eje perpendicular a la dirección para separar los ojos.
  const px = -v.row * 7;
  const py = v.col * 7;
  ctx.fillStyle = COLORS.eye;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + px * sign, cy + py * sign, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
