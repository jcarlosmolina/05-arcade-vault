'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { createClient } from '@/app/lib/supabase/client';
import type { Game } from '@/app/data/games';
import { GAME_ENGINES } from '@/app/games/registry';
import type { GameInstance } from '@/app/games/types';

export default function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : 'INVITADO');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Juego real si el id tiene motor registrado; si no, simulación.
  const engineFactory = GAME_ENGINES[game.id];
  const isReal = engineFactory !== undefined;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameInstance | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!engineFactory || !canvas) return;
    const instance = engineFactory(canvas, {
      onStats: (stats) => {
        setScore(stats.score);
        setLives(stats.lives);
        setLevel(stats.level);
      },
      onGameOver: (finalScore) => {
        setScore(finalScore);
        setOver(true);
      },
    });
    engineRef.current = instance;
    return () => {
      instance.destroy();
      engineRef.current = null;
    };
  }, [engineFactory]);

  // ── Simulación (juegos sin motor) ──
  // La puntuación simulada vive también en un ref para decidir la subida de
  // nivel en el mismo tick del intervalo (sin setState dentro de un efecto).
  const simScoreRef = useRef(0);
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      const next = simScoreRef.current + Math.floor(10 + Math.random() * 90);
      simScoreRef.current = next;
      setScore(next);
      if (next % 2500 < 100) setLevel((l) => l + 1);
    }, 220);
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  // ── Pausa: el estado React manda y el motor lo sigue ──
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);

  // Teclas P / Escape alternan la pausa (solo juegos reales, sin modal abierto).
  useEffect(() => {
    if (!isReal || over) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyP' && e.code !== 'Escape') return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReal, over]);

  const endGame = () => {
    if (engineRef.current) {
      // El motor llama a onGameOver con la puntuación actual → abre el modal.
      setPaused(false);
      engineRef.current.end();
    } else {
      setOver(true);
    }
  };
  const handleSave = async () => {
    const playerName = name.trim().toUpperCase().slice(0, 10);
    if (!playerName || saveStatus === 'saving') return;
    setSaveStatus('saving');
    const supabase = createClient();
    const { error } = await supabase
      .from('scores')
      .insert({ game_id: game.id, player_name: playerName, score });
    setSaveStatus(error ? 'error' : 'saved');
  };
  const restart = () => {
    simScoreRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaveStatus('idle');
    engineRef.current?.restart();
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(lives).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link className="btn ghost" href={`/juegos/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!isReal ? (
              <div className="toast-saved">▸ MODO DEMO — NO SE GUARDA_</div>
            ) : saveStatus !== 'saved' ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                    disabled={saveStatus === 'saving'}
                  />
                  <button
                    className="btn yellow"
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || !name.trim()}
                  >
                    {saveStatus === 'saving'
                      ? 'GUARDANDO…'
                      : saveStatus === 'error'
                        ? 'REINTENTAR'
                        : 'GUARDAR PUNTUACIÓN'}
                  </button>
                </div>
                {saveStatus === 'error' && (
                  <div
                    className="pixel"
                    style={{ fontSize: 10, color: 'var(--magenta)', marginTop: 10 }}
                  >
                    NO SE PUDO GUARDAR
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link className="btn magenta" href="/biblioteca">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
