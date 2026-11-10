// Port de references/started-games/04-arkanoid/assets/spritesheet.js

export type BlockColor =
  'red' | 'yellow' | 'cyan' | 'magenta' | 'hotpink' | 'green' | 'gray';

export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITESHEET_URL = '/games/ladrillos/spritesheet-breakout.png';

const frames = (sy: number): SpriteFrame[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));

const RED_FRAMES = frames(176);

/** 4 frames de explosión por color. `gray` reutiliza los de `red` (como la referencia). */
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteFrame[]> = {
  red: RED_FRAMES,
  cyan: frames(192),
  green: frames(208),
  magenta: frames(224),
  yellow: frames(240),
  hotpink: frames(256),
  gray: RED_FRAMES,
};

export const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } satisfies Record<BlockColor, SpriteFrame>,
};

export type SpriteName = 'paddle' | 'ball' | `block_${BlockColor}`;

// Imagen en el módulo (sin globals de window).
let sheet: HTMLCanvasElement | null = null;
let loading: Promise<void> | null = null;

/** Carga el spritesheet y lo copia a un canvas offscreen. Idempotente. */
export function loadSpritesheet(): Promise<void> {
  if (sheet) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const oc = document.createElement('canvas');
      oc.width = img.width;
      oc.height = img.height;
      const octx = oc.getContext('2d');
      if (!octx) {
        loading = null;
        reject(new Error('No 2D context for spritesheet'));
        return;
      }
      octx.drawImage(img, 0, 0);
      sheet = oc;
      resolve();
    };
    img.onerror = () => {
      loading = null; // permite reintentar
      reject(new Error(`Failed to load spritesheet: ${SPRITESHEET_URL}`));
    };
    img.src = SPRITESHEET_URL;
  });
  return loading;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!sheet) return;
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!sheet) return;
  const sp = name.startsWith('block_')
    ? SPRITES.blocks[name.slice(6) as BlockColor]
    : SPRITES[name as 'paddle' | 'ball'];
  if (!sp) return;
  ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
