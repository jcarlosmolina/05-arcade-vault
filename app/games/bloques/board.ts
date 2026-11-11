// Lógica pura del tablero + dibujo, portados de references/started-games/03-tetris/game.js
// El contexto 2D se recibe por parámetro: sin globals.

import {
  BOARD_X,
  BOARD_Y,
  CELL,
  COLS,
  H,
  PIECES,
  PIECE_TYPES,
  ROWS,
  W,
} from './constants';
import type { BloquesPalette } from './skins';

export type Board = number[][];
export type Shape = number[][];

export interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

// ── Dominio (funciones puras) ─────────────────────────────────────────────────

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(
  board: Board,
  shape: Shape,
  x: number,
  y: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

/** Elimina las filas completas (mutando el tablero) y devuelve cuántas. */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

// ── Dibujo (los colores salen de la paleta del skin activo) ───────────────────

/** Dibuja una celda en coordenadas de píxel (px, py) según el estilo del skin. */
function drawCell(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  px: number,
  py: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const color = pal.pieces[colorIndex];
  const x = px + 1;
  const y = py + 1;
  const s = size - 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (pal.glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = pal.glow;
  }
  ctx.fillRect(x, y, s, s);
  ctx.shadowBlur = 0;

  if (pal.cellStyle === 'pixel') {
    const b = pal.highlightH;
    // Bisel 8-bit: claro arriba/izquierda, oscuro abajo/derecha.
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(x, y, s, b);
    ctx.fillRect(x, y, b, s);
    if (pal.edge) {
      ctx.fillStyle = pal.edge;
      ctx.fillRect(x, y + s - b, s, b);
      ctx.fillRect(x + s - b, y, b, s);
    }
    // Piezas huecas: hueco interior con el color de fondo.
    if (pal.hollow[colorIndex]) {
      const inset = b * 2;
      if (pal.bg) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
      } else {
        ctx.clearRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
      }
    }
  } else {
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(x, y, s, pal.highlightH);
    if (pal.cellStyle === 'neon' && pal.edge) {
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5);
    }
  }
  ctx.restore();
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  board: Board,
): void {
  const bw = COLS * CELL;
  const bh = ROWS * CELL;

  // Rejilla tenue
  ctx.save();
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = pal.gridWidth;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + c * CELL, BOARD_Y);
    ctx.lineTo(BOARD_X + c * CELL, BOARD_Y + bh);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + r * CELL);
    ctx.lineTo(BOARD_X + bw, BOARD_Y + r * CELL);
    ctx.stroke();
  }
  ctx.restore();

  // Marco
  ctx.save();
  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = pal.frameWidth;
  if (pal.glow > 0) {
    ctx.shadowColor = pal.frame;
    ctx.shadowBlur = pal.glow;
  }
  const o = pal.frameWidth / 2;
  ctx.strokeRect(BOARD_X - o, BOARD_Y - o, bw + o * 2, bh + o * 2);
  ctx.restore();

  // Celdas fijas
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawCell(
        ctx,
        pal,
        BOARD_X + c * CELL,
        BOARD_Y + r * CELL,
        board[r][c],
        CELL,
      );
}

export function drawPiece(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  piece: Piece,
  y: number = piece.y,
  alpha = 1,
): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      drawCell(
        ctx,
        pal,
        BOARD_X + (piece.x + c) * CELL,
        BOARD_Y + (y + r) * CELL,
        piece.shape[r][c],
        CELL,
        alpha,
      );
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  board: Board,
  piece: Piece,
): void {
  drawPiece(ctx, pal, piece, ghostY(board, piece), pal.ghostAlpha);
}

/** Preview 4×4 de la siguiente pieza, centrada como `drawNext()` del original. */
export function drawNext(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  next: Piece,
  originX: number,
  originY: number,
): void {
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawCell(
        ctx,
        pal,
        originX + (offX + c) * CELL,
        originY + (offY + r) * CELL,
        shape[r][c],
        CELL,
      );
}

/** Laterales: LÍNEAS (izquierda) y SIGUIENTE (derecha). */
export function drawSidePanels(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
  lines: number,
  next: Piece,
): void {
  const leftCx = BOARD_X / 2; // centro del hueco izquierdo
  const rightCx = (BOARD_X + COLS * CELL + W) / 2; // centro del hueco derecho

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = pal.glow;

  // LÍNEAS
  ctx.font = pal.labelFont;
  ctx.fillStyle = pal.label;
  ctx.shadowColor = pal.label;
  ctx.fillText('LÍNEAS', leftCx, BOARD_Y + 20);
  ctx.font = pal.valueFont;
  ctx.fillStyle = pal.value;
  ctx.shadowColor = pal.value;
  ctx.fillText(String(lines), leftCx, BOARD_Y + 66);

  // SIGUIENTE
  ctx.font = pal.labelFont;
  ctx.fillStyle = pal.label;
  ctx.shadowColor = pal.label;
  ctx.fillText('SIGUIENTE', rightCx, BOARD_Y + 20);

  const box = 4 * CELL;
  const boxX = rightCx - box / 2;
  const boxY = BOARD_Y + 44;
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = pal.nextBox;
  ctx.lineWidth = pal.cellStyle === 'pixel' ? 2 : 1.5;
  if (pal.glow > 0) {
    ctx.shadowColor = pal.nextBox;
    ctx.shadowBlur = pal.glow;
  }
  ctx.strokeRect(boxX - 0.5, boxY - 0.5, box + 1, box + 1);
  ctx.restore();

  drawNext(ctx, pal, next, boxX, boxY);
}

/** Limpia el canvas; pinta el fondo del skin si lo tiene (clasico: transparente). */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
): void {
  ctx.clearRect(0, 0, W, H);
  if (pal.bg) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Scanlines CRT sobre todo el canvas (solo skins que las definen). */
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  pal: BloquesPalette,
): void {
  if (!pal.scanlines) return;
  ctx.save();
  ctx.fillStyle = pal.scanlines;
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}
