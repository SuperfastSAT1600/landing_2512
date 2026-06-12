import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NEXT_STAGE, type SrmStage } from '@/app/admin/srm/lifecycle-constants';

export type { SrmStage };
export { STAGE_LABELS } from '@/app/admin/srm/lifecycle-constants';

export interface LifecycleStage {
  id: string;
  student_id: string | null;
  sfv2_profile_id: string | null;
  stage: SrmStage;
  due_date: string | null;
  completed_at: string | null;
  note: string | null;
  created_at: string;
}

export interface LifecycleResponse {
  current: LifecycleStage | null;
  history: LifecycleStage[];
}

function buildQuery(profileId: string | null, studentId: string | null) {
  if (profileId) {
    return supabaseAdmin
      .from('srm_lifecycle_stages')
      .select('*')
      .eq('sfv2_profile_id', profileId)
      .order('created_at', { ascending: false });
  }
  return supabaseAdmin
    .from('srm_lifecycle_stages')
    .select('*')
    .eq('student_id', studentId!)
    .order('created_at', { ascending: false });
}

// GET /api/admin/srm/lifecycle?profileId=... or ?studentId=...
export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get('profileId');
  const studentId = req.nextUrl.searchParams.get('studentId');

  if (!profileId && !studentId) {
    return NextResponse.json({ error: 'profileId or studentId required' }, { status: 400 });
  }

  const { data, error } = await buildQuery(profileId, studentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data ?? []) as LifecycleStage[];
  const current = all.find((s) => !s.completed_at) ?? null;

  return NextResponse.json({ current, history: all } satisfies LifecycleResponse);
}

// POST /api/admin/srm/lifecycle
// body: { profileId?, studentId?, stage, action: 'complete'|'set', dueDate?, note? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profileId, studentId, stage, action, dueDate, note } = body as {
    profileId?: string;
    studentId?: string;
    stage: SrmStage;
    action: 'complete' | 'set';
    dueDate?: string;
    note?: string;
  };

  if (!profileId && !studentId) {
    return NextResponse.json({ error: 'profileId or studentId required' }, { status: 400 });
  }
  if (!stage || !action) {
    return NextResponse.json({ error: 'stage and action required' }, { status: 400 });
  }

  const identifier = profileId
    ? { sfv2_profile_id: profileId }
    : { student_id: studentId! };

  if (action === 'complete') {
    // 현재 활성 단계 완료 처리
    const { error: completeError } = await supabaseAdmin
      .from('srm_lifecycle_stages')
      .update({ completed_at: new Date().toISOString(), note: note ?? null })
      .match({ ...identifier, stage })
      .is('completed_at', null);

    if (completeError) return NextResponse.json({ error: completeError.message }, { status: 500 });

    // 다음 단계 자동 생성
    const nextStage = NEXT_STAGE[stage];
    if (nextStage) {
      const { error: insertError } = await supabaseAdmin
        .from('srm_lifecycle_stages')
        .insert({ ...identifier, stage: nextStage, due_date: dueDate ?? null });

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, nextStage: nextStage ?? null });
  }

  if (action === 'set') {
    // 직접 단계 지정 (기존 활성 단계가 있으면 완료 처리 후 삽입)
    await supabaseAdmin
      .from('srm_lifecycle_stages')
      .update({ completed_at: new Date().toISOString() })
      .match(identifier)
      .is('completed_at', null);

    const { error: insertError } = await supabaseAdmin
      .from('srm_lifecycle_stages')
      .insert({ ...identifier, stage, due_date: dueDate ?? null, note: note ?? null });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true, nextStage: stage });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}
