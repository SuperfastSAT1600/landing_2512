import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

type PauseRow = {
  id: string;
  student_id: string | null;
  sfv2_profile_id: string | null;
  pause_start: string;
  pause_until: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  ended_at: string | null;
};

async function getActivePauseBySfv2(profileId: string): Promise<PauseRow | null> {
  const today = new Date().toISOString().slice(0, 10);

  // 먼저 CRM student_id로 조회 (sfv2_profile_id 연결 경유)
  const { data: linked } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('sfv2_profile_id', profileId)
    .maybeSingle();

  const conditions: { column: string; value: string }[] = [];
  if (linked?.id) conditions.push({ column: 'student_id', value: linked.id });
  conditions.push({ column: 'sfv2_profile_id', value: profileId });

  // student_id 또는 sfv2_profile_id로 활성 pause 조회
  for (const cond of conditions) {
    const { data } = await supabaseAdmin
      .from('student_pauses')
      .select('*')
      .eq(cond.column, cond.value)
      .is('ended_at', null)
      .lte('pause_start', today)
      .or(`pause_until.is.null,pause_until.gte.${today}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) return data as PauseRow;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { profileId } = await params;
  const pause = await getActivePauseBySfv2(profileId);
  return NextResponse.json({ pause });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { profileId } = await params;
  const body = await req.json() as { pause_until?: string | null; reason?: string; created_by?: string };

  // CRM student_id 찾기
  const { data: linked } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('sfv2_profile_id', profileId)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from('student_pauses')
    .insert({
      student_id: linked?.id ?? null,
      sfv2_profile_id: profileId,
      pause_start: new Date().toISOString().slice(0, 10),
      pause_until: body.pause_until ?? null,
      reason: body.reason ?? null,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pause: data });
}
