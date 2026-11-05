export interface GameStats {
  score: number;
  lives: number;
  level: number;
}

export interface GameCallbacks {
  /** Se llama cuando cambia score, lives o level. */
  onStats: (stats: GameStats) => void;
  /** Vidas agotadas o end(). */
  onGameOver: (finalScore: number) => void;
}

export interface GameInstance {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
