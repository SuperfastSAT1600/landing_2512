import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client with service role key — server-side only (write, admin ops)
export const supabaseAdmin = createClient(url, serviceKey);

// Public read-only client with anon key
export const supabase = createClient(url, anonKey);
