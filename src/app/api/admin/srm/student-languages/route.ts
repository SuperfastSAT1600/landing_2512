import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/admin/srm/student-languages
// Returns enrolled students with sfv2 link who have comm_language = 'en' (ko is default)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('sfv2_profile_id, comm_language')
    .eq('lead_status', 'enrolled')
    .not('sfv2_profile_id', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const languages: Record<string, 'ko' | 'en'> = {};
  for (const s of data ?? []) {
    if (s.sfv2_profile_id) {
      const lang = (s as unknown as { comm_language: string | null }).comm_language;
      languages[s.sfv2_profile_id] = (lang === 'en' ? 'en' : 'ko');
    }
  }

  return NextResponse.json({ languages });
}
