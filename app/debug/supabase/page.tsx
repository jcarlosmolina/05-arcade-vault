import { createClient } from '@/app/lib/supabase/server';
import ClientCheck from './client-check';

export const dynamic = 'force-dynamic';

export default async function DebugSupabasePage() {
  let status: 'OK' | 'ERROR' = 'OK';
  let message = '';

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getClaims();
    if (error) {
      status = 'ERROR';
      message = error.message;
    }
  } catch (e) {
    status = 'ERROR';
    message = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'monospace' }}>
      <h1>Debug Supabase (temporal)</h1>
      <p>
        Servidor (Server Component): {status}
        {status === 'ERROR' && ` — ${message}`}
      </p>
      <ClientCheck />
    </main>
  );
}
