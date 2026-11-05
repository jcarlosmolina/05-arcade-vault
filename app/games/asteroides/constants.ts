// Constantes portadas de references/started-games/02-asteroids/game.js

// ── Dimensiones lógicas del canvas ────────────────────────────────────────────
export const W = 800;
export const H = 600;

/** dt máximo por frame, en segundos (50 ms). */
export const MAX_DT = 0.05;

// ── Asteroides (índice = tamaño 1, 2, 3) ──────────────────────────────────────
export const RADII = [0, 16, 30, 50] as const;
/** Velocidad base por tamaño (px/s). */
export const SPEEDS = [0, 85, 55, 32] as const;
/** Puntos por tamaño: pequeño 100, mediano 50, grande 20. */
export const POINTS = [0, 100, 50, 20] as const;
/** Distancia mínima al centro al generar una oleada. */
export const SAFE_DIST = 130;

// ── Power-up "3x" ─────────────────────────────────────────────────────────────
export const POWERUP_DROP_CHANCE = 0.15;
/** Duración del disparo triple (s). */
export const POWERUP_DURATION = 5;
/** Tiempo de vida del power-up en pantalla (s). */
export const POWERUP_TTL = 12;
/** Bajas tras las que el drop está garantizado. */
export const POWERUP_GUARANTEED_KILLS = 5;
export const TRIPLE_SPREAD = 0.18;

// ── Balas ─────────────────────────────────────────────────────────────────────
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;

// ── Nave ──────────────────────────────────────────────────────────────────────
/** Rotación (rad/s). */
export const SHIP_ROT = 3.5;
/** Empuje (px/s²). */
export const SHIP_THRUST = 260;
export const SHIP_DRAG = 0.987;
export const SHIP_RADIUS = 12;
/** Invencibilidad al reaparecer (s). */
export const SHIP_INVINCIBLE = 3;
export const SHOOT_COOLDOWN = 0.2;
/** Distancia del centro a la nariz, origen de las balas. */
export const SHIP_NOSE = 21;

// ── Partida ───────────────────────────────────────────────────────────────────
export const START_LIVES = 3;
/** Espera tras perder una vida antes de reaparecer (s). */
export const RESPAWN_DELAY = 2;

// ── Paleta neón (valores de las variables de app/globals.css) ────────────────
export const COLORS = {
  bg: '#0a0a0f', // --bg
  ship: '#00f5ff', // --cyan
  asteroid: '#ff006e', // --magenta
  bullet: '#f5ff00', // --yellow
  flame: '#f5ff00', // --yellow
  powerUp: '#00ff88', // --green
} as const;

/** Intensidad del brillo neón (shadowBlur). */
export const GLOW = 12;
