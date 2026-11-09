"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";

interface Best {
  score: number;
  rank: number;
  date: string;
}

export default function YourBest({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { user } = useSession();
  const name = user ? user.name.toUpperCase().slice(0, 10) : null;
  const [result, setResult] = useState<{ key: string; best: Best | null } | null>(null);
  const key = name ? `${gameId}:${name}` : null;

  useEffect(() => {
    if (!name || !key) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: top } = await supabase
        .from("scores")
        .select("score, created_at")
        .eq("game_id", gameId)
        .eq("player_name", name)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!top) {
        setResult({ key, best: null });
        return;
      }
      const { count } = await supabase
        .from("scores")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .gt("score", top.score);
      if (cancelled) return;
      setResult({
        key,
        best: {
          score: top.score,
          rank: 1 + (count ?? 0),
          date: new Date(top.created_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, name, key]);

  if (!name || !result || result.key !== key || !result.best) return null;
  const { best } = result;

  return (
    <>
      <div className="tr you-label">▸ TU MEJOR MARCA EN {gameTitle}</div>
      <div className="tr you">
        <div className="rk" style={{ color: "var(--yellow)" }}>
          #{String(best.rank).padStart(2, "0")}
        </div>
        <div className="pl" style={{ color: "var(--yellow)" }}>
          {name}
        </div>
        <div className="sc" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
          {best.score.toLocaleString("es-ES")}
        </div>
        <div className="dt">{best.date}</div>
      </div>
    </>
  );
}
