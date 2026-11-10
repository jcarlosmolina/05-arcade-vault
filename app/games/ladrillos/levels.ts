// Port de references/started-games/04-arkanoid/levels.js

import {
  BLOCK_COLS,
  BLOCK_ROWS,
  LEVEL_SPEEDS,
  MAX_SPEED_MULT,
  SPEED_GROWTH,
} from './constants';
import type { BlockColor } from './sprites';

export interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

const rowColors1: BlockColor[] = [
  'red',
  'yellow',
  'cyan',
  'magenta',
  'hotpink',
  'green',
];
const rowColors2: BlockColor[] = [
  'gray',
  'cyan',
  'hotpink',
  'yellow',
  'magenta',
  'green',
];
const rowColors4: BlockColor[] = [
  'cyan',
  'magenta',
  'green',
  'yellow',
  'hotpink',
  'red',
];

function buildLevels(): LevelBlock[][] {
  // N1: rejilla completa 10×6 (60)
  const l1: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  // N2: pirámide invertida (40)
  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  // N3: tablero de ajedrez (30)
  const l3: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? 'yellow' : 'magenta' });

  // N4: rejilla con huecos (39)
  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  // N5: marco con cruz (39)
  const l5: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? 'hotpink' : 'cyan' });
    }

  return [l1, l2, l3, l4, l5];
}

export const LEVELS: readonly (readonly LevelBlock[])[] = buildLevels();

/** Diseño del nivel (1-indexed); tras el 5 se repiten los diseños. */
export function levelBlocks(level: number): readonly LevelBlock[] {
  return LEVELS[(level - 1) % LEVELS.length];
}

/** Multiplicador de velocidad: tabla para N1–N5, luego min(1.1^(n−1), 2.0). */
export function levelSpeed(level: number): number {
  if (level >= 1 && level <= LEVEL_SPEEDS.length)
    return LEVEL_SPEEDS[level - 1];
  return Math.min(Math.pow(SPEED_GROWTH, level - 1), MAX_SPEED_MULT);
}
