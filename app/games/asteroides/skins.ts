// Paletas de skin de ASTEROIDES. Único archivo del juego con colores.
// Ratios WCAG calculados vs `bg` de cada skin (llama: compuesta con su alpha).

import type { SkinId } from '../skins';

export interface AsteroidesPalette {
  /** Fondo pintado en el canvas (siempre oscuro). */
  bg: string;
  ship: string;
  asteroid: string;
  bullet: string;
  flame: string;
  flameAlpha: number;
  powerUp: string;
  /** Partículas de explosión (decorativas). */
  particle: string;
  /** Texto del temporizador de power-up. */
  timerText: string;
  /** shadowBlur del brillo; 0 = sin glow. */
  glow: number;
  /** Grosor de trazo de nave y asteroides. */
  lineWidth: number;
  /** Estilo pixelado: balas cuadradas, juntas en inglete, coords enteras. */
  pixel: boolean;
  /** Color de las scanlines pintadas sobre el canvas; null = sin scanlines. */
  scanlines: string | null;
}

export const SKINS: Record<SkinId, AsteroidesPalette> = {
  // Colores actuales exactos (vs #0a0a0f): nave 14.58, asteroide 5.15,
  // bala 18.05, llama 12.95, power-up/texto 14.73.
  clasico: {
    bg: '#0a0a0f',
    ship: '#00f5ff',
    asteroid: '#ff006e',
    bullet: '#f5ff00',
    flame: '#f5ff00',
    flameAlpha: 0.85,
    powerUp: '#00ff88',
    particle: '#ff006e',
    timerText: '#00ff88',
    glow: 12,
    lineWidth: 1.5,
    pixel: false,
    scanlines: null,
  },
  // Saturados + glow fuerte (vs #05030c): nave 16.09, asteroide 6.41,
  // bala 17.79, llama 7.07, power-up/texto 15.38.
  neon: {
    bg: '#05030c',
    ship: '#2efcff',
    asteroid: '#ff2bd6',
    bullet: '#fff35c',
    flame: '#ff9a1f',
    flameAlpha: 0.85,
    powerUp: '#39ff7a',
    particle: '#ff2bd6',
    timerText: '#39ff7a',
    glow: 22,
    lineWidth: 2,
    pixel: false,
    scanlines: null,
  },
  // Fósforo verde + acento ámbar, sin glow, pixelado (vs #020a04):
  // nave 18.04, asteroide 10.48, bala 20.04, llama 8.00, power-up/texto 10.94,
  // partículas 5.53 (decorativas, más oscuras que los asteroides).
  retro: {
    bg: '#020a04',
    ship: '#d4ffc4',
    asteroid: '#3fd65a',
    bullet: '#ffffff',
    flame: '#ffb000',
    flameAlpha: 0.85,
    powerUp: '#ffb000',
    particle: '#2a9a3e',
    timerText: '#ffb000',
    glow: 0,
    lineWidth: 2,
    pixel: true,
    scanlines: 'rgba(0,0,0,0.35)',
  },
};
