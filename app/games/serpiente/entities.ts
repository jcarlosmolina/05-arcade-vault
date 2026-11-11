// Entidades del juego Serpiente: rejilla, serpiente y fruta.
// Todas las funciones de dibujo reciben el contexto por parámetro (sin globals).

import {
  CELL,
  COLS,
  H,
  INITIAL_LENGTH,
  ROWS,
  START_COL,
  START_ROW,
  W,
} from './constants';
import type { SerpientePalette } from './skins';
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
// Todos los colores salen de la paleta del skin activo (./skins.ts).

/** Fondo oscuro con rejilla tenue de CELL px. */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  p: SerpientePalette,
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = p.grid;
  ctx.lineWidth = p.gridWidth;
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
export function drawFruitAt(
  ctx: CanvasRenderingContext2D,
  p: SerpientePalette,
  fruit: Fruit,
): void {
  ctx.save();
  if (p.fruitGlow > 0) {
    ctx.shadowColor = p.fruitGlowColor;
    ctx.shadowBlur = p.fruitGlow;
  }
  drawFruit(
    ctx,
    fruit.type,
    fruit.col * CELL + CELL / 2,
    fruit.row * CELL + CELL / 2,
    36,
    p.fruitTint,
  );
  ctx.restore();
}

/** Segmento de la serpiente en (x, y) con la forma y el borde del skin. */
function drawSegment(
  ctx: CanvasRenderingContext2D,
  p: SerpientePalette,
  x: number,
  y: number,
  size: number,
): void {
  if (p.segmentShape === 'round') {
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 8);
    ctx.fill();
    if (p.edge) ctx.stroke();
  } else {
    ctx.fillRect(x, y, size, size);
    if (p.edge) ctx.strokeRect(x, y, size, size);
  }
}

/** Serpiente con el estilo del skin. `dir` orienta los ojos de la cabeza. */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  p: SerpientePalette,
  snake: readonly Cell[],
  dir: Dir,
): void {
  const pad = p.pad;
  const size = CELL - pad * 2;

  ctx.save();
  if (p.glow > 0) {
    ctx.shadowColor = p.glowColor;
    ctx.shadowBlur = p.glow;
  }
  if (p.edge) {
    ctx.strokeStyle = p.edge;
    ctx.lineWidth = p.edgeWidth;
  }

  // Cuerpo (de cola a cabeza), alternancia por paridad del segmento.
  for (let i = snake.length - 1; i >= 1; i--) {
    const s = snake[i];
    const k = i % 2 === 0 ? 0 : 1;
    ctx.fillStyle = p.body[k];
    ctx.globalAlpha = p.bodyAlpha[k];
    drawSegment(ctx, p, s.col * CELL + pad, s.row * CELL + pad, size);
  }
  ctx.globalAlpha = 1;

  // Cabeza
  const head = snake[0];
  const hx = head.col * CELL;
  const hy = head.row * CELL;
  ctx.fillStyle = p.head;
  drawSegment(ctx, p, hx + pad, hy + pad, size);
  ctx.restore();

  // Ojos (sin brillo)
  const v = DIR_VECTORS[dir];
  const cx = hx + CELL / 2 + v.col * 8;
  const cy = hy + CELL / 2 + v.row * 8;
  // Eje perpendicular a la dirección para separar los ojos.
  const px = -v.row * 7;
  const py = v.col * 7;
  ctx.fillStyle = p.eye;
  for (const sign of [-1, 1]) {
    const ex = cx + px * sign;
    const ey = cy + py * sign;
    if (p.eyeShape === 'square') {
      ctx.fillRect(Math.round(ex) - 3, Math.round(ey) - 3, 6, 6);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Scanlines tipo CRT sobre todo el canvas (solo si el skin las define). */
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  p: SerpientePalette,
): void {
  if (!p.scanlines) return;
  ctx.fillStyle = p.scanlines;
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}
