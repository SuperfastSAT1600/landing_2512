import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { RENEWAL_STAGES, type RenewalStage } from '@/types/crm';

// GET/POST와 응답 shape을 맞춘다 (route.ts의 STUDENT_FIELDS와 동일 집합).
const STUDENT_FIELDS = 'id, name, grade, parent_phone, is_vip, traffic_source, lead_type';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: {
    stage?: unknown;
    converted_payment_id?: unknown;
    drop_reason?: unknown;
    clear_drop_reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const stage = body.stage;
  if (!stage || typeof stage !== 'string' || !RENEWAL_STAGES.includes(stage as RenewalStage)) {
    return NextResponse.json(
      { error: { code: 'INVALID_STAGE', message: '유효하지 않은 stage입니다.' } },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    stage,
    stage_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 터미널 단계의 부가 정보는 해당 단계로 이동할 때만 기록한다.
  if (stage === '4' && body.converted_payment_id) {
    update.converted_payment_id = body.converted_payment_id;
  }
  if (stage === '5' && body.drop_reason) {
    update.drop_reason = body.drop_reason;
  }
  // 미전환을 되돌릴 때(5 → 2) 남아 있던 사유를 지운다.
  if (stage !== '5' && body.clear_drop_reason) {
    update.drop_reason = null;
  }

  const { data, error } = await supabaseAdmin
    .from('renewal_targets')
    .update(update)
    .eq('id', id)
    .select(`*, student:students(${STUDENT_FIELDS})`)
    .single();

  if (error) {
    console.error('[renewal-targets/[id] PATCH]', error);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '수정에 실패했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const { error } = await supabaseAdmin.from('renewal_targets').delete().eq('id', id);

  if (error) {
    console.error('[renewal-targets/[id] DELETE]', error);
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: '삭제에 실패했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id } });
}
