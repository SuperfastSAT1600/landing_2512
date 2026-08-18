import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('supabase-admin must only be imported on the server side');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceKey);
