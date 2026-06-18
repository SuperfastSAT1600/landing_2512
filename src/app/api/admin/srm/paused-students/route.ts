import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

// 현재 휴원 중인 모든 학생의 sfv2_profile_id 목록 반환
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('student_pauses')
    .select('sfv2_profile_id, student_id')
    .is('ended_at', null)
    .lte('pause_start', today)
    .or(`pause_until.is.null,pause_until.gte.${today}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sfv2Ids = (data ?? [])
    .map((r: { sfv2_profile_id: string | null }) => r.sfv2_profile_id)
    .filter((id): id is string => !!id);

  return NextResponse.json({ sfv2ProfileIds: sfv2Ids });
}
