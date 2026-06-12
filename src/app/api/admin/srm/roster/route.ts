import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface RosterStudent {
  id: string;           // CRM student id
  name: string;
  sfv2ProfileId: string | null;
}

// GET /api/admin/srm/roster
// lead_status='enrolled' (수업 중) 전체 학생 명단 — CRM 수업 중 탭과 동일 기준
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, name, sfv2_profile_id')
    .eq('lead_status', 'enrolled')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: RosterStudent[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    sfv2ProfileId: s.sfv2_profile_id ?? null,
  }));

  return NextResponse.json(result);
}
