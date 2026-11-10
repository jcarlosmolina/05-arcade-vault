// Lógica pura del tablero + dibujo, portados de references/started-games/03-tetris/game.js
// El contexto 2D se recibe por parámetro: sin globals.

import {
  BOARD_X,
  BOARD_Y,
  CELL,
  COLORS,
  COLS,
  H,
  PIECES,
  PIECE_TYPES,
  ROWS,
  W,
} from './constants';

export type Board = number[][];
export type Shape = number[][];

export interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

/** Intensidad del brillo neón (shadowBlur). */
const GLOW = 12;
const MAGENTA = '#ff006e';
const CYAN = '#00f5ff';
const GRID_LINE = 'rgba(0, 245, 255, 0.08)';
const LABEL_FONT = 'bold 14px monospace';
const VALUE_FONT = 'bold 36px monospace';

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

// ── Dibujo ────────────────────────────────────────────────────────────────────

/** Dibuja una celda en coordenadas de píxel (px, py) con brillo neón. */
function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = GLOW;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(px + 1, py + 1, size - 2, 4);
  ctx.restore();
}

export function drawBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  const bw = COLS * CELL;
  const bh = ROWS * CELL;

  // Rejilla tenue
  ctx.save();
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
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

  // Marco neón
  ctx.save();
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 2;
  ctx.shadowColor = MAGENTA;
  ctx.shadowBlur = GLOW;
  ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, bw + 2, bh + 2);
  ctx.restore();

  // Celdas fijas
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawCell(ctx, BOARD_X + c * CELL, BOARD_Y + r * CELL, board[r][c], CELL);
}

export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  y: number = piece.y,
  alpha = 1,
): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      drawCell(
        ctx,
        BOARD_X + (piece.x + c) * CELL,
        BOARD_Y + (y + r) * CELL,
        piece.shape[r][c],
        CELL,
        alpha,
      );
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  board: Board,
  piece: Piece,
): void {
  drawPiece(ctx, piece, ghostY(board, piece), 0.2);
}

/** Preview 4×4 de la siguiente pieza, centrada como `drawNext()` del original. */
export function drawNext(
  ctx: CanvasRenderingContext2D,
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
        originX + (offX + c) * CELL,
        originY + (offY + r) * CELL,
        shape[r][c],
        CELL,
      );
}

/** Laterales: LÍNEAS (izquierda) y SIGUIENTE (derecha). */
export function drawSidePanels(
  ctx: CanvasRenderingContext2D,
  lines: number,
  next: Piece,
): void {
  const leftCx = BOARD_X / 2; // centro del hueco izquierdo
  const rightCx = (BOARD_X + COLS * CELL + W) / 2; // centro del hueco derecho

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // LÍNEAS
  ctx.font = LABEL_FONT;
  ctx.fillStyle = MAGENTA;
  ctx.shadowColor = MAGENTA;
  ctx.shadowBlur = GLOW;
  ctx.fillText('LÍNEAS', leftCx, BOARD_Y + 20);
  ctx.font = VALUE_FONT;
  ctx.fillStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.fillText(String(lines), leftCx, BOARD_Y + 66);

  // SIGUIENTE
  ctx.font = LABEL_FONT;
  ctx.fillStyle = MAGENTA;
  ctx.shadowColor = MAGENTA;
  ctx.fillText('SIGUIENTE', rightCx, BOARD_Y + 20);

  const box = 4 * CELL;
  const boxX = rightCx - box / 2;
  const boxY = BOARD_Y + 44;
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = GLOW;
  ctx.strokeRect(boxX - 0.5, boxY - 0.5, box + 1, box + 1);
  ctx.restore();

  drawNext(ctx, next, boxX, boxY);
}

/** Limpia el canvas completo (fondo transparente sobre `.crt-screen`). */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, W, H);
}
