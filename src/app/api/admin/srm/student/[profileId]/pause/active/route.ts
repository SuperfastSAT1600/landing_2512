import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// DELETE: 현재 활성 휴원 조기 해제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const { data: linked } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('sfv2_profile_id', profileId)
    .maybeSingle();

  // sfv2_profile_id 또는 student_id 기준 활성 pause 해제
  const orFilter = linked?.id
    ? `sfv2_profile_id.eq.${profileId},student_id.eq.${linked.id}`
    : `sfv2_profile_id.eq.${profileId}`;

  const { error } = await supabaseAdmin
    .from('student_pauses')
    .update({ ended_at: new Date().toISOString() })
    .is('ended_at', null)
    .lte('pause_start', today)
    .or(`pause_until.is.null,pause_until.gte.${today}`)
    .or(orFilter);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
