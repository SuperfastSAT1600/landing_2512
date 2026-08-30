import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import {
  RENEWAL_STAGES,
  RENEWAL_OUTCOME_QUALITIES,
  type RenewalStage,
  type RenewalOutcomeQuality,
} from '@/types/crm';

// GET/POST와 응답 shape을 맞춘다 (route.ts의 STUDENT_FIELDS와 동일 집합).
const STUDENT_FIELDS = 'id, name, grade, parent_phone, is_vip, needs_attention, traffic_source, lead_type';

/** 품질을 기록할 수 있는 터미널 단계. */
const QUALITY_STAGES: RenewalStage[] = ['4', '5'];

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
    outcome_quality?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  // stage 는 선택이다 — 결과 품질만 소급 지정할 때 stage_updated_at 을 재기록하면
  // 카드의 '단계 D+N' 이 리셋되고 목록 정렬(stage_updated_at DESC)까지 흐트러진다.
  const hasStage = body.stage !== undefined;
  const stage = body.stage;
  if (hasStage && (typeof stage !== 'string' || !RENEWAL_STAGES.includes(stage as RenewalStage))) {
    return NextResponse.json(
      { error: { code: 'INVALID_STAGE', message: '유효하지 않은 stage입니다.' } },
      { status: 400 }
    );
  }

  const hasQuality = 'outcome_quality' in body;
  const quality = body.outcome_quality;
  if (
    hasQuality &&
    quality !== null &&
    (typeof quality !== 'string' || !RENEWAL_OUTCOME_QUALITIES.includes(quality as RenewalOutcomeQuality))
  ) {
    return NextResponse.json(
      { error: { code: 'INVALID_OUTCOME_QUALITY', message: '유효하지 않은 결과 품질입니다.' } },
      { status: 400 }
    );
  }

  if (!hasStage && !hasQuality) {
    return NextResponse.json(
      { error: { code: 'NO_UPDATABLE_FIELDS', message: '변경할 필드가 없습니다.' } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };

  if (hasStage) {
    update.stage = stage;
    update.stage_updated_at = now;
  } else {
    // 소급 경로 — 대상 행이 실제로 터미널 단계인지 확인한다.
    const { data: current, error: currentError } = await supabaseAdmin
      .from('renewal_targets')
      .select('stage')
      .eq('id', id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '대상을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }
    if (!QUALITY_STAGES.includes(current.stage as RenewalStage)) {
      return NextResponse.json(
        { error: { code: 'INVALID_OUTCOME_QUALITY', message: '결제 완료·미전환 단계에서만 지정할 수 있습니다.' } },
        { status: 400 }
      );
    }
  }

  // 터미널 단계의 부가 정보는 해당 단계로 이동할 때만 기록한다.
  if (stage === '4' && body.converted_payment_id) {
    update.converted_payment_id = body.converted_payment_id;
  }
  if (stage === '5' && body.drop_reason) {
    update.drop_reason = body.drop_reason;
  }
  // 미전환을 되돌릴 때(5 → 2) 남아 있던 사유를 지운다.
  if (hasStage && stage !== '5' && body.clear_drop_reason) {
    update.drop_reason = null;
  }

  if (hasQuality && (!hasStage || QUALITY_STAGES.includes(stage as RenewalStage))) {
    update.outcome_quality = quality;
  }
  // 터미널을 벗어나면 품질도 함께 비운다. `hasStage &&` 가드가 없으면 소급 경로가
  // 이 분기에 걸려 방금 지정한 값을 즉시 지운다.
  if (hasStage && !QUALITY_STAGES.includes(stage as RenewalStage)) {
    update.outcome_quality = null;
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
