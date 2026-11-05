"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export interface SessionUser {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser) => void;
  logout: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// La sesión vive en localStorage ("av_user"); React la lee como store externo.
// En el servidor (y durante la hidratación) no hay sesión.
const USER_KEY = "av_user";
const sessionListeners = new Set<() => void>();

function subscribeSession(cb: () => void) {
  sessionListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    sessionListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readSessionRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function writeSessionRaw(raw: string | null) {
  try {
    if (raw === null) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, raw);
  } catch {
    // localStorage no disponible; se ignora en este MVP mock.
  }
  sessionListeners.forEach((cb) => cb());
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribeSession, readSessionRaw, () => null);
  const user = useMemo<SessionUser | null>(() => {
    try {
      return JSON.parse(raw || "null");
    } catch {
      return null;
    }
  }, [raw]);

  const login = (u: SessionUser) => writeSessionRaw(JSON.stringify(u));

  const logout = () => writeSessionRaw(null);

  const saveScore = (entry: Omit<ScoreEntry, "at">) => {
    try {
      const all = JSON.parse(localStorage.getItem("av_scores") || "[]");
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {
      // localStorage no disponible; se ignora en este MVP mock.
    }
  };

  return (
    <SessionContext.Provider value={{ user, login, logout, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
