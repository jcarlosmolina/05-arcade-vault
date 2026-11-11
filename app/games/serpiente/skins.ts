// Paletas de skin de SERPIENTE. Único archivo del juego con colores.
// Ratios WCAG calculados vs `bg` de cada skin (rgba compuesto sobre bg).

import type { SkinId } from '../skins';

export type SegmentShape = 'square' | 'round';
export type EyeShape = 'round' | 'square';

export interface SerpientePalette {
  bg: string;
  grid: string;
  gridWidth: number;
  head: string;
  /** Color del cuerpo por paridad del índice del segmento: [par, impar]. */
  body: readonly [string, string];
  bodyAlpha: readonly [number, number];
  /** Margen interior de cada segmento dentro de la celda (px). */
  pad: number;
  segmentShape: SegmentShape;
  /** shadowBlur del brillo de la serpiente; 0 = sin glow. */
  glow: number;
  glowColor: string;
  /** Borde luminoso de los segmentos; null = sin borde. */
  edge: string | null;
  edgeWidth: number;
  eye: string;
  eyeShape: EyeShape;
  /** Tinte plano de la fruta (silueta monocroma); null = sprite original. */
  fruitTint: string | null;
  /** shadowBlur de la fruta; 0 = sin glow. */
  fruitGlow: number;
  fruitGlowColor: string;
  /** Color de las scanlines pintadas sobre el canvas; null = sin scanlines. */
  scanlines: string | null;
}

export const SKINS: Record<SkinId, SerpientePalette> = {
  // Colores actuales exactos (vs #05060f): cabeza 15.07, cuerpo impar
  // (#00ff88 @0.7) 7.42, cuerpo par (#00cc6e @0.85) 6.95. Rejilla 1.08 (decorativa).
  // Ojo #05060f vs cabeza 15.07. Fruta: sprite raster original.
  clasico: {
    bg: '#05060f',
    grid: 'rgba(0,245,255,0.06)',
    gridWidth: 1,
    head: '#00ff88',
    body: ['#00cc6e', '#00ff88'],
    bodyAlpha: [0.85, 0.7],
    pad: 2,
    segmentShape: 'square',
    glow: 12,
    glowColor: '#00ff88',
    edge: null,
    edgeWidth: 0,
    eye: '#05060f',
    eyeShape: 'round',
    fruitTint: null,
    fruitGlow: 0,
    fruitGlowColor: '#05060f',
    scanlines: null,
  },
  // Saturados + glow fuerte + borde luminoso (vs #0a0418): cabeza 16.17,
  // cuerpo menta (@0.9) 12.22, cuerpo cian (@0.9) 9.64, halo fruta 6.88.
  // Rejilla magenta 1.13 (decorativa). Ojo #0a0418 vs cabeza 16.17.
  neon: {
    bg: '#0a0418',
    grid: 'rgba(255,61,240,0.12)',
    gridWidth: 1,
    head: '#7dffb8',
    body: ['#00ffa3', '#00d9ff'],
    bodyAlpha: [0.9, 0.9],
    pad: 3,
    segmentShape: 'round',
    glow: 20,
    glowColor: '#00ffa3',
    edge: 'rgba(255,255,255,0.55)',
    edgeWidth: 1.5,
    eye: '#0a0418',
    eyeShape: 'round',
    fruitTint: null,
    fruitGlow: 14,
    fruitGlowColor: '#ff3df0',
    scanlines: null,
  },
  // Fósforo verde monocromo + ámbar para la fruta (vs #020802): cabeza 17.02,
  // cuerpo 14.92 / 6.87, fruta ámbar 14.01. Rejilla 1.24 (decorativa).
  // Sin glow; segmentos y ojos cuadrados; scanlines.
  retro: {
    bg: '#020802',
    grid: 'rgba(51,255,51,0.12)',
    gridWidth: 1,
    head: '#b6ff8c',
    body: ['#1fae1f', '#33ff33'],
    bodyAlpha: [1, 1],
    pad: 4,
    segmentShape: 'square',
    glow: 0,
    glowColor: '#020802',
    edge: null,
    edgeWidth: 0,
    eye: '#020802',
    eyeShape: 'square',
    fruitTint: '#ffd23f',
    fruitGlow: 0,
    fruitGlowColor: '#020802',
    scanlines: 'rgba(0,0,0,0.35)',
  },
};
