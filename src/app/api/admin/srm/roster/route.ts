import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface RosterStudent {
  id: string;           // CRM student id
  name: string;
  sfv2ProfileId: string | null;
}

// GET /api/admin/srm/roster
// funnel_stage='8' (수업 중) 전체 학생 명단
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, name, sfv2_profile_id')
    .eq('funnel_stage', '8')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: RosterStudent[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    sfv2ProfileId: s.sfv2_profile_id ?? null,
  }));

  return NextResponse.json(result);
}
