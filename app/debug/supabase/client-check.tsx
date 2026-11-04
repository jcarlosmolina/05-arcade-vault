'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';

type Result =
  | { status: 'loading' }
  | { status: 'OK' }
  | { status: 'ERROR'; message: string };

export default function ClientCheck() {
  const [result, setResult] = useState<Result>({ status: 'loading' });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getClaims()
      .then(({ error }) => {
        setResult(
          error
            ? { status: 'ERROR', message: error.message }
            : { status: 'OK' },
        );
      })
      .catch((e: unknown) => {
        setResult({
          status: 'ERROR',
          message: e instanceof Error ? e.message : String(e),
        });
      });
  }, []);

  return (
    <p>
      Cliente (browser): {result.status}
      {result.status === 'ERROR' && ` — ${result.message}`}
    </p>
  );
}
