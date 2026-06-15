import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('sfv2_profile_id, name')
    .eq('is_vip', true)
    .eq('lead_status', 'enrolled')
    .not('sfv2_profile_id', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sfv2ProfileIds = (data ?? [])
    .map((s: { sfv2_profile_id: string | null; name: string }) => s.sfv2_profile_id)
    .filter(Boolean) as string[];

  return NextResponse.json({ sfv2ProfileIds });
}
