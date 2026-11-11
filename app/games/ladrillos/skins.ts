// Paletas de skin de LADRILLOS. Único archivo del juego con colores.
// clasico = spritesheet PNG actual (sin cambios). neon/retro = dibujo vectorial.
// Ratios WCAG calculados vs `bg` de cada skin.

import type { SkinId } from '../skins';
import type { BlockColor } from './sprites';

/** sprites = spritesheet raster; neon = bordes luminosos + glow; pixel = 8-bit sin glow. */
export type RenderMode = 'sprites' | 'neon' | 'pixel';

/** Relleno del bloque (retro: distinción por forma además de por tono). */
export type BlockFill = 'solid' | 'hollow' | 'dither';

export interface BlockStyle {
  color: string;
  fill: BlockFill;
}

export interface VectorPalette {
  blocks: Record<BlockColor, BlockStyle>;
  /** Alpha del relleno interior del bloque (neon: tinte oscuro; pixel: 1). */
  blockFillAlpha: number;
  /** Grosor del borde del bloque. */
  lineWidth: number;
  /** Radio de esquinas (0 = pixelado). */
  radius: number;
  /** shadowBlur del brillo; 0 = sin glow. */
  glow: number;
  /** Bisel claro superior (null = sin bisel). */
  highlight: string | null;
  /** Bisel oscuro inferior (null = sin bisel). */
  edge: string | null;
  paddle: string;
  paddleGlow: string;
  ball: string;
  ballGlow: string;
}

export interface LadrillosPalette {
  bg: string;
  render: RenderMode;
  /** Estilo vectorial; null en clasico (usa el spritesheet). */
  vector: VectorPalette | null;
  /** Color de las scanlines pintadas sobre el canvas; null = sin scanlines. */
  scanlines: string | null;
}

export const SKINS: Record<SkinId, LadrillosPalette> = {
  // Spritesheet actual sobre #000 (tono dominante vs #000): red 3.64,
  // yellow 11.33, cyan 10.17, magenta 3.24, hotpink 8.09, green 8.29,
  // gray textura #646373 3.57 / #9998ab 7.43 (sombreado #323142 1.65);
  // pala/bola #babac5 10.92.
  clasico: {
    bg: '#000000',
    render: 'sprites',
    vector: null,
    scanlines: null,
  },
  // Saturados + glow + bordes luminosos (vs #05060f): red 5.80, yellow 16.22,
  // cyan 14.92, magenta 5.69, hotpink 7.08, green 15.27, gray 9.76;
  // pala #00f5ff 14.92, bola #ffffff 20.20.
  neon: {
    bg: '#05060f',
    render: 'neon',
    vector: {
      blocks: {
        red: { color: '#ff3b5c', fill: 'solid' },
        yellow: { color: '#ffe83a', fill: 'solid' },
        cyan: { color: '#00f5ff', fill: 'solid' },
        magenta: { color: '#b45cff', fill: 'solid' },
        hotpink: { color: '#ff4fd8', fill: 'solid' },
        green: { color: '#3dff8b', fill: 'solid' },
        gray: { color: '#aab4d0', fill: 'solid' },
      },
      blockFillAlpha: 0.28,
      lineWidth: 2,
      radius: 4,
      glow: 10,
      highlight: 'rgba(255,255,255,0.35)',
      edge: null,
      paddle: '#00f5ff',
      paddleGlow: '#00f5ff',
      ball: '#ffffff',
      ballGlow: '#00f5ff',
    },
    scanlines: null,
  },
  // Fósforo CRT con 4 tonos (vs #020a04): verde 15.32, verde medio 8.31,
  // ámbar 11.30, blanco fósforo 19.08. Formas: sólida / hueca / tramada.
  retro: {
    bg: '#020a04',
    render: 'pixel',
    vector: {
      blocks: {
        red: { color: '#ffb43a', fill: 'solid' },
        yellow: { color: '#e8fff0', fill: 'solid' },
        cyan: { color: '#5dff7a', fill: 'solid' },
        magenta: { color: '#2fbf55', fill: 'solid' },
        hotpink: { color: '#ffb43a', fill: 'hollow' },
        green: { color: '#5dff7a', fill: 'hollow' },
        gray: { color: '#2fbf55', fill: 'dither' },
      },
      blockFillAlpha: 1,
      lineWidth: 4,
      radius: 0,
      glow: 0,
      highlight: 'rgba(255,255,255,0.35)',
      edge: 'rgba(0,0,0,0.4)',
      paddle: '#5dff7a',
      paddleGlow: '#5dff7a',
      ball: '#e8fff0',
      ballGlow: '#e8fff0',
    },
    scanlines: 'rgba(0,0,0,0.3)',
  },
};
