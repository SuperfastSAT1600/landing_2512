import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { ReactivationEntry } from '@/types/crm';

/**
 * POST /api/crm/students/[id]/reactivation
 * 재활성화 시도 로그를 추가한다 (outcome: 'pending').
 * Body: { strategy: string, notes?: string }
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  let body: { strategy?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  const { strategy, notes } = body;
  if (!strategy || strategy.trim() === '') {
    return NextResponse.json(
      { error: { code: 'MISSING_STRATEGY', message: '전략 메모는 필수입니다.' } },
      { status: 400 }
    );
  }

  // 현재 reactivation_log 조회
  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('reactivation_log')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '학생을 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  const newEntry: ReactivationEntry = {
    id: crypto.randomUUID(),
    attempted_at: new Date().toISOString(),
    strategy: strategy.trim(),
    outcome: 'pending',
    ...(notes ? { notes: notes.trim() } : {}),
  };

  const existingLog: ReactivationEntry[] = Array.isArray(student.reactivation_log)
    ? student.reactivation_log
    : [];

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ reactivation_log: [...existingLog, newEntry], lead_status: 'reactivating' })
    .eq('id', id);

  if (updateError) {
    console.error('[reactivation POST]', updateError);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '로그 저장에 실패했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: newEntry }, { status: 201 });
}

/**
 * PATCH /api/crm/students/[id]/reactivation
 * 기존 reactivation_log 항목의 outcome을 업데이트한다.
 * outcome이 'reactivated'이면 lead_status를 'reactivating'으로 변경.
 * Body: { entry_id: string, outcome: 'no_response' | 'reactivated' | 'rejected' }
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  let body: { entry_id?: string; outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  const { entry_id, outcome } = body;

  if (!entry_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_ENTRY_ID', message: 'entry_id는 필수입니다.' } },
      { status: 400 }
    );
  }

  const validOutcomes = ['no_response', 'reactivated', 'rejected'] as const;
  type ValidOutcome = (typeof validOutcomes)[number];

  if (!outcome || !validOutcomes.includes(outcome as ValidOutcome)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_OUTCOME',
          message: 'outcome은 no_response | reactivated | rejected 중 하나여야 합니다.',
        },
      },
      { status: 400 }
    );
  }

  // 현재 학생 데이터 조회
  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('reactivation_log')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '학생을 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  const existingLog: ReactivationEntry[] = Array.isArray(student.reactivation_log)
    ? student.reactivation_log
    : [];

  const entryIndex = existingLog.findIndex((e) => e.id === entry_id);
  if (entryIndex === -1) {
    return NextResponse.json(
      { error: { code: 'ENTRY_NOT_FOUND', message: '해당 로그 항목을 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  const updatedLog = existingLog.map((e) =>
    e.id === entry_id ? { ...e, outcome: outcome as ValidOutcome } : e
  );

  const updatePayload: Record<string, unknown> = { reactivation_log: updatedLog };

  // 재활성화 성공 시 → 다시 활성 1단계로 복귀
  if (outcome === 'reactivated') {
    updatePayload.lead_status = 'active';
    updatePayload.funnel_stage = '1';
  }

  const { data: savedData, error: saveError } = await supabaseAdmin
    .from('students')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (saveError || !savedData) {
    console.error('[reactivation PATCH]', saveError);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '업데이트에 실패했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updatedLog[entryIndex] });
}
