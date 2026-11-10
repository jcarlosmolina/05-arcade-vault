// Entidades del juego: pala, bola, bloques y explosiones.
// `draw*` recibe el contexto por parámetro (sin globals).

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

export function drawBlock(ctx: CanvasRenderingContext2D, block: Block): void {
  if (!block.alive) return;
  drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.w, block.h);
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  exp: Explosion,
): void {
  const frameIndex = Math.min(
    Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
    3,
  );
  drawFrame(
    ctx,
    EXPLOSION_FRAMES[exp.color][frameIndex],
    exp.x,
    exp.y,
    exp.w,
    exp.h,
  );
}

export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  paddle: Paddle,
): void {
  drawSprite(ctx, 'paddle', paddle.x, PADDLE.y, PADDLE.w, PADDLE.h);
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  drawSprite(ctx, 'ball', ball.x, ball.y, BALL_SIZE, BALL_SIZE);
}
