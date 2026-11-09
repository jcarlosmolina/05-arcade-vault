import Link from "next/link";
import YourBest from "@/components/YourBest";
import { getGames, getTopScores } from "@/app/lib/games";

export default async function HallOfFamePage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;
  const requested = Array.isArray(juego) ? juego[0] : juego;

  const games = await getGames();
  const game = games.find((g) => g.id === requested) ?? games[0];
  const rows = game ? await getTopScores(game.id, 12) : [];
  const podium = [rows[1], rows[0], rows[2]];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link key={g.id} href={`/salon?juego=${g.id}`} className={"chip" + (game?.id === g.id ? " active" : "")}>
            {g.title}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
          <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
            AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO
          </div>
          {game && (
            <Link className="btn" href={`/juegos/${game.id}/jugar`}>
              ▶ JUGAR {game.title}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="podium">
            {podium.map((r, idx) => {
              if (!r) return null;
              const tier = idx === 1 ? "gold" : idx === 0 ? "silver" : "bronze";
              const num = idx === 1 ? "01" : idx === 0 ? "02" : "03";
              return (
                <div key={tier} className={"podium-slot " + tier}>
                  {idx === 1 && (
                    <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
                      CAMPEÓN
                    </div>
                  )}
                  <div className="rank-num" style={idx === 1 ? { fontSize: 36, marginTop: 4 } : undefined}>
                    {num}
                  </div>
                  <div className="name">{r.name}</div>
                  <div className="score" style={idx === 1 ? { fontSize: 20 } : undefined}>
                    {r.score.toLocaleString("es-ES")}
                  </div>
                  <div className="date">{r.date}</div>
                </div>
              );
            })}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            <YourBest gameId={game.id} gameTitle={game.title} />
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/biblioteca">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
