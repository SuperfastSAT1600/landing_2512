import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('supabase-sfv2 must only be imported on the server side');
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPERFASTSAT_V2_SUPABASE_URL;
    const key = process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPERFASTSAT_V2_SUPABASE_URL / SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY not configured');
    _client = createClient(url, key);
  }
  return _client;
}

export const supabaseSFv2: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
