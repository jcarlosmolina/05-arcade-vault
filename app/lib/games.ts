import { createClient } from '@/app/lib/supabase/server';
import type { Game, GameCategory, ScoreRow } from '@/app/data/games';
import type { Database } from '@/app/lib/supabase/database.types';

type GameStatsRow = Database['public']['Views']['games_with_stats']['Row'];

function toGame(row: GameStatsRow): Game {
  return {
    id: row.id!,
    title: row.title!,
    short: row.short!,
    long: row.long!,
    cat: row.cat as GameCategory,
    cover: row.cover!,
    color: row.color as Game['color'],
    best: row.best ?? 0,
    plays: row.plays ?? 0,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('games_with_stats')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getGames: ${error.message}`);
  return (data ?? []).map(toGame);
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('games_with_stats')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getGame: ${error.message}`);
  return data ? toGame(data) : null;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, created_at')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getTopScores: ${error.message}`);
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  }));
}
