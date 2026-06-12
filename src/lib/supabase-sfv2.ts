import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('supabase-sfv2 must only be imported on the server side');
}

const url = process.env.SMS_SUPABASE_URL!;
const key = process.env.SMS_SUPABASE_SERVICE_KEY!;

export const supabaseSFv2 = createClient(url, key);
