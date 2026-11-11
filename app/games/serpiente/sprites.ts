// Port de references/source-assets/snake-assets/sprites.js
// (window.SPRITE_ATLAS → constante exportada; imagen en el módulo, sin globals).
// Fuente de la imagen: https://www.spriters-resource.com/browser_games/googlesnakegame/

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRUITS_URL = '/games/serpiente/fruits.png';

/** Hoja 3790x442 px, fondo transparente. Fila usada: y=136–295. */
export const FRUIT_ATLAS = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
} as const satisfies Record<string, SpriteRect>;

export type FruitName = keyof typeof FRUIT_ATLAS;

export const FRUIT_NAMES = Object.keys(FRUIT_ATLAS) as FruitName[];

// Imagen en el módulo (sin globals de window).
let img: HTMLImageElement | null = null;
let loading: Promise<void> | null = null;

/** Carga fruits.png. Idempotente; rechaza si falla (y permite reintentar). */
export function loadFruits(): Promise<void> {
  if (img) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      img = image;
      resolve();
    };
    image.onerror = () => {
      loading = null; // permite reintentar
      console.error(`[serpiente] Failed to load ${FRUITS_URL}`);
      reject(new Error(`Failed to load fruits: ${FRUITS_URL}`));
    };
    image.src = FRUITS_URL;
  });
  return loading;
}

/**
 * Dibuja la fruta `name` centrada en (cx, cy), escalada para caber en un
 * cuadrado de `size` px conservando la proporción.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  cx: number,
  cy: number,
  size: number,
): void {
  if (!img) return;
  const r = FRUIT_ATLAS[name];
  const scale = Math.min(size / r.w, size / r.h);
  const dw = r.w * scale;
  const dh = r.h * scale;
  ctx.drawImage(img, r.x, r.y, r.w, r.h, cx - dw / 2, cy - dh / 2, dw, dh);
}
