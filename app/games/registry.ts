import { createAsteroidsGame } from './asteroides/engine';
import type { GameFactory } from './types';

/** Mapa id de juego → fábrica de motor real. Los juegos ausentes usan la simulación. */
export const GAME_ENGINES: Record<string, GameFactory> = {
  asteroides: createAsteroidsGame,
};
