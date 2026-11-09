// Tipos y utilidades del catálogo. Los datos viven en Supabase (ver app/lib/games.ts).

export type GameCategory = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS ya definida en globals.css (cover-bricks, cover-tetro, ...)
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  best: number;
  plays: number; // COUNT(*) de scores; se muestra con formatPlays()
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}K`;
}

export const CATS: string[] = [
  'TODOS',
  'ARCADE',
  'PUZZLE',
  'SHOOTER',
  'VERSUS',
];
