'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fade-in" style={{ textAlign: 'center', padding: 80 }}>
      <div
        className="pixel"
        style={{ fontSize: 14, color: 'var(--magenta)', marginBottom: 12 }}
      >
        ERROR DE CONEXIÓN
      </div>
      <div style={{ color: 'var(--ink-faint)', marginBottom: 24 }}>
        No se pudieron cargar los datos. Inténtalo de nuevo.
      </div>
      <button className="btn" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
