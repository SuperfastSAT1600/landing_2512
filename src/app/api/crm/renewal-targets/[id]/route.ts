import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import {
  RENEWAL_STAGES,
  RENEWAL_OUTCOME_QUALITIES,
  getRenewalOutcomeReasons,
  type RenewalStage,
  type RenewalOutcomeQuality,
} from '@/types/crm';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { notifyMemoToSlack, RENEWAL_OUTCOME_HEADING } from '@/lib/slack-memo';
import { buildRenewalOutcomeMemo } from '@/lib/renewal/mirror';

// GET/POST와 응답 shape을 맞춘다 (route.ts의 STUDENT_FIELDS와 동일 집합).
const STUDENT_FIELDS = 'id, name, grade, parent_phone, is_vip, needs_attention, traffic_source, lead_type';

/** 카드 메모는 한 줄 상태 노트다. 상담 기록 전체는 학생 패널 타임라인이 담당한다. */
const MEMO_MAX_LENGTH = 1000;

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
    outcome_reason_tag?: unknown;
    outcome_reason_note?: unknown;
    memo?: unknown;
    author?: unknown;
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

  const hasReason = 'outcome_reason_tag' in body;
  const reasonTag = body.outcome_reason_tag;
  if (hasReason && reasonTag !== null && typeof reasonTag !== 'string') {
    return NextResponse.json(
      { error: { code: 'INVALID_OUTCOME_REASON', message: '유효하지 않은 사유입니다.' } },
      { status: 400 }
    );
  }
  const reasonNote =
    typeof body.outcome_reason_note === 'string' ? body.outcome_reason_note.trim() : '';

  const hasMemo = 'memo' in body;
  if (hasMemo && body.memo !== null && typeof body.memo !== 'string') {
    return NextResponse.json(
      { error: { code: 'INVALID_MEMO', message: '메모 형식이 올바르지 않습니다.' } },
      { status: 400 }
    );
  }
  const memoText = typeof body.memo === 'string' ? body.memo.trim() : '';
  if (memoText.length > MEMO_MAX_LENGTH) {
    return NextResponse.json(
      { error: { code: 'MEMO_TOO_LONG', message: `메모는 ${MEMO_MAX_LENGTH}자까지 가능합니다.` } },
      { status: 400 }
    );
  }

  if (!hasStage && !hasQuality && !hasReason && !hasMemo) {
    return NextResponse.json(
      { error: { code: 'NO_UPDATABLE_FIELDS', message: '변경할 필드가 없습니다.' } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  // 사유 목록은 (단계, 품질) 조합마다 다르다 — 검증에 실제 단계가 필요하다.
  let effectiveStage: RenewalStage | null = hasStage ? (stage as RenewalStage) : null;

  // 메모는 단계·결과와 독립이다 — 메모만 저장할 때 stage_updated_at 이 바뀌면
  // 카드의 '단계 D+N' 이 리셋된다.
  if (hasMemo) {
    update.memo = memoText === '' ? null : memoText;
  }

  if (hasStage) {
    update.stage = stage;
    update.stage_updated_at = now;
  } else if (hasQuality || hasReason) {
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
    effectiveStage = current.stage as RenewalStage;
  }

  // 터미널 단계의 부가 정보는 해당 단계로 이동할 때만 기록한다.
  if (stage === '4' && body.converted_payment_id) {
    update.converted_payment_id = body.converted_payment_id;
  }
  // 미전환을 되돌릴 때(5 → 2) 레거시 drop_reason 이 남아 있으면 지운다(120 이전 행).
  if (hasStage && stage !== '5' && body.clear_drop_reason) {
    update.drop_reason = null;
  }

  const isTerminal = effectiveStage !== null && QUALITY_STAGES.includes(effectiveStage);

  if (hasQuality && isTerminal) {
    update.outcome_quality = quality;
  }
  // 터미널을 벗어나면 품질과 사유를 함께 비운다. `hasStage &&` 가드가 없으면 소급 경로가
  // 이 분기에 걸려 방금 지정한 값을 즉시 지운다.
  if (hasStage && !QUALITY_STAGES.includes(stage as RenewalStage)) {
    update.outcome_quality = null;
    update.outcome_reason_tag = null;
    update.outcome_reason_note = null;
  }

  // 사유는 품질에 종속된다 — 품질을 지우면 사유도 없어지고, 품질을 지정하면 사유가 필수다.
  // 품질 없이 사유만 고치는 것도 허용한다(이미 품질이 찍힌 행의 사유 보정).
  const effectiveQuality: RenewalOutcomeQuality | null = hasQuality
    ? ((quality ?? null) as RenewalOutcomeQuality | null)
    : null;

  if (isTerminal && hasQuality && effectiveQuality === null) {
    update.outcome_reason_tag = null;
    update.outcome_reason_note = null;
  } else if (isTerminal && (hasQuality || hasReason)) {
    const tag = typeof reasonTag === 'string' ? reasonTag.trim() : '';
    if (!tag) {
      return NextResponse.json(
        { error: { code: 'INVALID_OUTCOME_REASON', message: '사유를 선택해 주세요.' } },
        { status: 400 }
      );
    }
    // 품질을 함께 안 보냈으면 이미 저장된 품질 기준으로 목록을 고를 수 없다.
    if (!effectiveQuality) {
      return NextResponse.json(
        { error: { code: 'INVALID_OUTCOME_REASON', message: '사유는 품질과 함께 보내야 합니다.' } },
        { status: 400 }
      );
    }
    if (!getRenewalOutcomeReasons(effectiveStage!, effectiveQuality).includes(tag)) {
      return NextResponse.json(
        { error: { code: 'INVALID_OUTCOME_REASON', message: '해당 결과에 없는 사유입니다.' } },
        { status: 400 }
      );
    }
    update.outcome_reason_tag = tag;
    update.outcome_reason_note = reasonNote || null;
  }

  // 이월된 행은 다음 주차로 넘어가 종결됐다 — 오래된 탭에서 날아온 stage 변경이
  // 여기서 걸리지 않으면 carried_stage_check 위반(23514)으로 500 이 난다.
  const { data, error } = await supabaseAdmin
    .from('renewal_targets')
    .update(update)
    .eq('id', id)
    .is('carried_to_week', null)
    .select(`*, student:students(${STUDENT_FIELDS})`)
    .single();

  if (error) {
    console.error('[renewal-targets/[id] PATCH]', error);
    // 0행 매칭 — 이월됐거나 삭제된 대상.
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_CARRIED',
            message: '이미 다음 주차로 이월된 대상입니다. 새로고침 후 다시 시도해 주세요.',
          },
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '수정에 실패했습니다.' } },
      { status: 500 }
    );
  }

  // 정본은 renewal_targets — 타임라인과 슬랙은 사람이 읽는 미러다(윈백 발송과 같은 구조).
  // 실패해도 이미 저장된 결과를 되돌리지 않는다.
  if (update.outcome_reason_tag && effectiveQuality && effectiveStage) {
    const memo = buildRenewalOutcomeMemo({
      stage: effectiveStage,
      quality: effectiveQuality,
      reasonTag: update.outcome_reason_tag as string,
      reasonNote: (update.outcome_reason_note as string | null) ?? null,
    });
    const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : undefined;
    try {
      await appendConsultationEntry(data.student_id, { raw_memo: memo, author, published: false });
    } catch (e) {
      console.error('[renewal-targets/[id] timeline]', e);
    }
    try {
      await notifyMemoToSlack({
        studentId: data.student_id,
        memo,
        author,
        heading: RENEWAL_OUTCOME_HEADING,
      });
    } catch (e) {
      console.error('[renewal-targets/[id] slack]', e);
    }
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
