// Paletas de skin de BLOQUES. Único archivo del juego con colores.
// Ratios WCAG calculados vs `bg` efectivo (clasico: #000 de .crt-screen).

import type { SkinId } from '../skins';

export type CellStyle = 'glow' | 'neon' | 'pixel';

export interface BloquesPalette {
  /** Fondo pintado en el canvas; null = transparente (se ve el #000 de .crt-screen). */
  bg: string | null;
  /** Color por tipo de pieza (índice 1–7; 0 = vacío). */
  pieces: readonly string[];
  /** Tipos de pieza dibujados huecos (retro: distinción por forma, no solo tono). */
  hollow: readonly boolean[];
  cellStyle: CellStyle;
  /** shadowBlur del brillo; 0 = sin glow. */
  glow: number;
  /** Franja/bisel claro superior de la celda. */
  highlight: string;
  highlightH: number;
  /** Borde luminoso (neon) o bisel oscuro inferior (pixel). */
  edge: string | null;
  grid: string;
  gridWidth: number;
  frame: string;
  frameWidth: number;
  label: string;
  value: string;
  nextBox: string;
  labelFont: string;
  valueFont: string;
  ghostAlpha: number;
  /** Color de las scanlines pintadas sobre el canvas; null = sin scanlines. */
  scanlines: string | null;
}

const NO_HOLLOW = [false, false, false, false, false, false, false, false];

export const SKINS: Record<SkinId, BloquesPalette> = {
  // Colores actuales exactos (vs #000): I 15.50, O 19.19, T 4.15, S 15.66,
  // Z 5.48, J 5.46, L 7.89. Texto: magenta 5.48, cyan 15.50.
  clasico: {
    bg: null,
    pieces: [
      '',
      '#00f5ff', // I
      '#f5ff00', // O
      '#aa00ff', // T
      '#00ff88', // S
      '#ff006e', // Z
      '#3a7bff', // J
      '#ff7700', // L
    ],
    hollow: NO_HOLLOW,
    cellStyle: 'glow',
    glow: 12,
    highlight: 'rgba(255,255,255,0.12)',
    highlightH: 4,
    edge: null,
    grid: 'rgba(0, 245, 255, 0.08)',
    gridWidth: 0.5,
    frame: '#ff006e',
    frameWidth: 2,
    label: '#ff006e',
    value: '#00f5ff',
    nextBox: '#00f5ff',
    labelFont: 'bold 14px monospace',
    valueFont: 'bold 36px monospace',
    ghostAlpha: 0.2,
    scanlines: null,
  },
  // Saturados + glow fuerte + borde luminoso (vs #07040f): I 15.60, O 17.43,
  // T 6.07, S 15.36, Z 5.87, J 6.49, L 8.92. Texto: rosa 5.87, cyan 15.60.
  neon: {
    bg: '#07040f',
    pieces: [
      '',
      '#00faff', // I
      '#fff23a', // O
      '#c25cff', // T
      '#3dff8b', // S
      '#ff2d95', // Z
      '#5c8dff', // J
      '#ff8f2e', // L
    ],
    hollow: NO_HOLLOW,
    cellStyle: 'neon',
    glow: 20,
    highlight: 'rgba(255,255,255,0.18)',
    highlightH: 3,
    edge: 'rgba(255,255,255,0.6)',
    grid: 'rgba(0, 250, 255, 0.12)',
    gridWidth: 0.75,
    frame: '#ff2d95',
    frameWidth: 3,
    label: '#ff2d95',
    value: '#00faff',
    nextBox: '#00faff',
    labelFont: 'bold 14px monospace',
    valueFont: 'bold 36px monospace',
    ghostAlpha: 0.25,
    scanlines: null,
  },
  // Paleta limitada tipo CGA (vs #000): cian 17.13, magenta 8.00, blanco 21.00,
  // cian oscuro 7.33. Sin glow; bisel pixelado; S/Z/L huecas.
  retro: {
    bg: '#000000',
    pieces: [
      '',
      '#55ffff', // I  sólida
      '#ffffff', // O  sólida
      '#ff55ff', // T  sólida
      '#55ffff', // S  hueca
      '#ff55ff', // Z  hueca
      '#00aaaa', // J  sólida
      '#ffffff', // L  hueca
    ],
    hollow: [false, false, false, false, true, true, false, true],
    cellStyle: 'pixel',
    glow: 0,
    highlight: 'rgba(255,255,255,0.45)',
    highlightH: 3,
    edge: 'rgba(0,0,0,0.45)',
    grid: 'rgba(85, 255, 255, 0.1)',
    gridWidth: 1,
    frame: '#ff55ff',
    frameWidth: 4,
    label: '#ff55ff',
    value: '#55ffff',
    nextBox: '#55ffff',
    labelFont: 'bold 14px monospace',
    valueFont: 'bold 36px monospace',
    ghostAlpha: 0.3,
    scanlines: 'rgba(0,0,0,0.3)',
  },
};
