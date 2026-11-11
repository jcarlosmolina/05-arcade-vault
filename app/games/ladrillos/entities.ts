// Entidades del juego: pala, bola, bloques y explosiones.
// `draw*` recibe el contexto y la paleta del skin activo por parámetro (sin globals).

import {
  BALL_SIZE,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  PADDLE,
} from './constants';
import { levelBlocks } from './levels';
import type { LadrillosPalette, VectorPalette } from './skins';
import {
  drawFrame,
  drawSprite,
  EXPLOSION_FRAMES,
  type BlockColor,
} from './sprites';

export interface Paddle {
  x: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  /** Tiempo transcurrido, en segundos. */
  elapsed: number;
}

export function createBlocks(level: number): Block[] {
  return levelBlocks(level).map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

export function createExplosion(block: Block): Explosion {
  return {
    x: block.x,
    y: block.y,
    w: block.w,
    h: block.h,
    color: block.color,
    elapsed: 0,
  };
}

/** Bola sobre la pala con la velocidad del multiplicador dado. */
export function placeBall(
  ball: Ball,
  paddle: Paddle,
  baseVx: number,
  baseVy: number,
  speed: number,
): void {
  ball.x = paddle.x + (PADDLE.w - BALL_SIZE) / 2;
  ball.y = PADDLE.y - BALL_SIZE;
  ball.vx = baseVx * speed;
  ball.vy = baseVy * speed;
}

/** AABB bola–bloque. */
export function ballHitsBlock(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + BALL_SIZE > block.x &&
    ball.y < block.y + block.h &&
    ball.y + BALL_SIZE > block.y
  );
}

// ── Dibujo (clasico: spritesheet; neon/retro: vectorial desde la paleta) ─────

/** Bloques pre-renderizados por paleta vectorial (con margen para el glow). */
const blockCache = new WeakMap<
  VectorPalette,
  Partial<Record<BlockColor, HTMLCanvasElement>>
>();

function blockPad(v: VectorPalette): number {
  return Math.ceil(v.glow * 2);
}

function renderVectorBlock(
  v: VectorPalette,
  color: BlockColor,
): HTMLCanvasElement {
  const pad = blockPad(v);
  const oc = document.createElement('canvas');
  oc.width = BLOCK_W + pad * 2;
  oc.height = BLOCK_H + pad * 2;
  const c = oc.getContext('2d');
  if (!c) return oc;
  const { color: col, fill } = v.blocks[color];
  // 1 px de separación por cada lado entre bloques.
  const x = pad + 1;
  const y = pad + 1;
  const w = BLOCK_W - 2;
  const h = BLOCK_H - 2;
  const lw = v.lineWidth;

  c.shadowBlur = v.glow;
  c.shadowColor = col;

  if (fill === 'solid') {
    c.globalAlpha = v.blockFillAlpha;
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(x, y, w, h, v.radius);
    c.fill();
    c.globalAlpha = 1;
  } else if (fill === 'dither') {
    // Trama de tablero de 4 px (8-bit).
    c.fillStyle = col;
    for (let py = 0; py < h; py += 4)
      for (let px = (py / 4) % 2 === 0 ? 0 : 4; px < w; px += 8)
        c.fillRect(x + px, y + py, Math.min(4, w - px), Math.min(4, h - py));
  }

  // Borde: luminoso en neon; marco pixelado en huecos/tramados retro.
  if (v.blockFillAlpha < 1 || fill !== 'solid') {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, v.radius);
    c.stroke();
  }
  c.shadowBlur = 0;

  // Biseles (solo bloques sólidos): claro arriba, oscuro abajo.
  if (fill === 'solid') {
    if (v.highlight) {
      c.fillStyle = v.highlight;
      c.fillRect(x + lw, y + lw, w - lw * 2, 2);
    }
    if (v.edge) {
      c.fillStyle = v.edge;
      c.fillRect(x, y + h - 3, w, 3);
    }
  }
  return oc;
}

function cachedBlock(v: VectorPalette, color: BlockColor): HTMLCanvasElement {
  let entry = blockCache.get(v);
  if (!entry) {
    entry = {};
    blockCache.set(v, entry);
  }
  let sprite = entry[color];
  if (!sprite) {
    sprite = renderVectorBlock(v, color);
    entry[color] = sprite;
  }
  return sprite;
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  block: Block,
): void {
  if (!block.alive) return;
  if (!pal.vector) {
    drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.w, block.h);
    return;
  }
  const pad = blockPad(pal.vector);
  ctx.drawImage(
    cachedBlock(pal.vector, block.color),
    block.x - pad,
    block.y - pad,
  );
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  exp: Explosion,
): void {
  const frameIndex = Math.min(
    Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
    3,
  );
  const v = pal.vector;
  if (!v) {
    drawFrame(
      ctx,
      EXPLOSION_FRAMES[exp.color][frameIndex],
      exp.x,
      exp.y,
      exp.w,
      exp.h,
    );
    return;
  }
  const col = v.blocks[exp.color].color;
  ctx.save();
  if (pal.render === 'neon') {
    // Contorno que se expande y se desvanece.
    const t = Math.min(exp.elapsed / EXPLOSION_DURATION, 1);
    const grow = t * 10;
    ctx.globalAlpha = 1 - t;
    ctx.shadowBlur = v.glow;
    ctx.shadowColor = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = v.lineWidth;
    ctx.beginPath();
    ctx.roundRect(
      exp.x - grow,
      exp.y - grow,
      exp.w + grow * 2,
      exp.h + grow * 2,
      v.radius,
    );
    ctx.stroke();
  } else {
    // 4 fragmentos que saltan a pasos discretos (sin alpha, estilo 8-bit).
    const step = (frameIndex + 1) * 6;
    const size = 8 - frameIndex * 2;
    const cx = exp.x + exp.w / 2;
    const cy = exp.y + exp.h / 2;
    ctx.fillStyle = col;
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      ctx.fillRect(
        Math.round(cx + dx * (exp.w / 4 + step) - size / 2),
        Math.round(cy + dy * (exp.h / 4 + step / 2) - size / 2),
        size,
        size,
      );
    }
  }
  ctx.restore();
}

export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  paddle: Paddle,
): void {
  const v = pal.vector;
  if (!v) {
    drawSprite(ctx, 'paddle', paddle.x, PADDLE.y, PADDLE.w, PADDLE.h);
    return;
  }
  const x = pal.render === 'pixel' ? Math.round(paddle.x) : paddle.x;
  ctx.save();
  ctx.shadowBlur = v.glow;
  ctx.shadowColor = v.paddleGlow;
  ctx.fillStyle = v.paddle;
  ctx.beginPath();
  ctx.roundRect(x, PADDLE.y, PADDLE.w, PADDLE.h, v.radius * 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (v.highlight) {
    ctx.fillStyle = v.highlight;
    ctx.fillRect(x + 4, PADDLE.y + 2, PADDLE.w - 8, 2);
  }
  if (v.edge) {
    ctx.fillStyle = v.edge;
    ctx.fillRect(x, PADDLE.y + PADDLE.h - 3, PADDLE.w, 3);
  }
  ctx.restore();
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  ball: Ball,
): void {
  const v = pal.vector;
  if (!v) {
    drawSprite(ctx, 'ball', ball.x, ball.y, BALL_SIZE, BALL_SIZE);
    return;
  }
  ctx.save();
  ctx.fillStyle = v.ball;
  if (pal.render === 'neon') {
    ctx.shadowBlur = v.glow * 1.5;
    ctx.shadowColor = v.ballGlow;
    ctx.beginPath();
    ctx.arc(
      ball.x + BALL_SIZE / 2,
      ball.y + BALL_SIZE / 2,
      BALL_SIZE / 2 - 1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else {
    // Círculo pixelado: 3 rectángulos superpuestos.
    const x = Math.round(ball.x);
    const y = Math.round(ball.y);
    const s = BALL_SIZE;
    ctx.fillRect(x + 4, y, s - 8, s);
    ctx.fillRect(x, y + 4, s, s - 8);
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
  }
  ctx.restore();
}

/** Limpia el canvas con el fondo del skin. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  w: number,
  h: number,
): void {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
}

/** Scanlines CRT sobre todo el canvas (solo skins que las definen). */
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  pal: LadrillosPalette,
  w: number,
  h: number,
): void {
  if (!pal.scanlines) return;
  ctx.save();
  ctx.fillStyle = pal.scanlines;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}
