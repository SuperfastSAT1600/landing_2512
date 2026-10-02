import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRenewalOutcomeReasons, type RenewalStage, type RenewalOutcomeQuality } from '@/types/crm';
import { QUALITY_STAGES, isPatchFailure, patchFailure, type PatchFailure, type PatchInput } from './patch-input';

export interface PatchPlan {
  update: Record<string, unknown>;
  effectiveStage: RenewalStage | null;
  effectiveQuality: RenewalOutcomeQuality | null;
}

/** 소급 경로 — 대상 행이 실제로 터미널 단계인지 확인하고 그 단계를 돌려준다. */
async function fetchTerminalStage(id: string): Promise<{ stage: RenewalStage } | PatchFailure> {
  const { data: current, error: currentError } = await supabaseAdmin
    .from('renewal_targets')
    .select('stage')
    .eq('id', id)
    .single();

  if (currentError || !current) {
    return patchFailure('NOT_FOUND', '대상을 찾을 수 없습니다.', 404);
  }
  if (!QUALITY_STAGES.includes(current.stage as RenewalStage)) {
    return patchFailure('INVALID_OUTCOME_QUALITY', '결제 완료·미전환 단계에서만 지정할 수 있습니다.');
  }
  return { stage: current.stage as RenewalStage };
}

/** 메모·예정일·단계 이동처럼 단계 판정과 무관한 필드를 update 에 싣는다. */
function applyPlainFields(update: Record<string, unknown>, input: PatchInput, now: string): void {
  const { hasMemo, memoText, hasContactDate, contactDate, hasStage, stage } = input;
  // 메모는 단계·결과와 독립이다 — 메모만 저장할 때 stage_updated_at 이 바뀌면
  // 카드의 '단계 D+N' 이 리셋된다.
  if (hasMemo) {
    update.memo = memoText === '' ? null : memoText;
  }

  // 예정일도 단계와 독립이다 — 날짜만 고칠 때 stage_updated_at 이 바뀌면 '단계 D+N' 이 리셋된다.
  if (hasContactDate) {
    update.next_contact_date = contactDate ? (contactDate as string) : null;
  }

  if (hasStage) {
    update.stage = stage;
    update.stage_updated_at = now;
  }
}

/** 단계 전환에 딸린 부가 정보와 터미널 이탈 시 정리 항목. */
function applyStageSideEffects(
  update: Record<string, unknown>,
  input: PatchInput,
  isTerminal: boolean
): void {
  const { body, hasStage, stage, hasQuality, quality } = input;
  // 터미널 단계의 부가 정보는 해당 단계로 이동할 때만 기록한다.
  if (stage === '4' && body.converted_payment_id) {
    update.converted_payment_id = body.converted_payment_id;
  }
  // 미전환을 되돌릴 때(5 → 2) 레거시 drop_reason 이 남아 있으면 지운다(120 이전 행).
  if (hasStage && stage !== '5' && body.clear_drop_reason) {
    update.drop_reason = null;
  }

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
  // 결과가 확정된 행에 '다음에 언제 연락' 이 남아 있으면 보드에서 죽은 약속으로 보인다.
  if (hasStage && QUALITY_STAGES.includes(stage as RenewalStage)) {
    update.next_contact_date = null;
  }
}

/** 사유 검증 후 update 에 반영한다. 실패하면 PatchFailure. */
function applyReason(
  update: Record<string, unknown>,
  input: PatchInput,
  effectiveStage: RenewalStage | null,
  effectiveQuality: RenewalOutcomeQuality | null,
  isTerminal: boolean
): PatchFailure | null {
  const { hasQuality, hasReason, reasonTag, reasonNote } = input;
  if (isTerminal && hasQuality && effectiveQuality === null) {
    update.outcome_reason_tag = null;
    update.outcome_reason_note = null;
  } else if (isTerminal && (hasQuality || hasReason)) {
    const tag = typeof reasonTag === 'string' ? reasonTag.trim() : '';
    if (!tag) {
      return patchFailure('INVALID_OUTCOME_REASON', '사유를 선택해 주세요.');
    }
    // 품질을 함께 안 보냈으면 이미 저장된 품질 기준으로 목록을 고를 수 없다.
    if (!effectiveQuality) {
      return patchFailure('INVALID_OUTCOME_REASON', '사유는 품질과 함께 보내야 합니다.');
    }
    if (!getRenewalOutcomeReasons(effectiveStage!, effectiveQuality).includes(tag)) {
      return patchFailure('INVALID_OUTCOME_REASON', '해당 결과에 없는 사유입니다.');
    }
    update.outcome_reason_tag = tag;
    update.outcome_reason_note = reasonNote || null;
  }
  return null;
}

/**
 * 검증된 입력으로 update 객체를 만든다. 소급 경로(stage 없이 품질·사유만)는
 * 현재 행의 단계를 조회해야 하므로 비동기다.
 */
export async function buildPatchPlan(
  id: string,
  input: PatchInput,
  now: string
): Promise<PatchPlan | PatchFailure> {
  const { hasStage, stage, hasQuality, hasReason, quality } = input;
  const update: Record<string, unknown> = { updated_at: now };
  // 사유 목록은 (단계, 품질) 조합마다 다르다 — 검증에 실제 단계가 필요하다.
  let effectiveStage: RenewalStage | null = hasStage ? (stage as RenewalStage) : null;

  applyPlainFields(update, input, now);

  if (!hasStage && (hasQuality || hasReason)) {
    const current = await fetchTerminalStage(id);
    if (isPatchFailure(current)) return current;
    effectiveStage = current.stage;
  }

  const isTerminal = effectiveStage !== null && QUALITY_STAGES.includes(effectiveStage);
  applyStageSideEffects(update, input, isTerminal);

  // 사유는 품질에 종속된다 — 품질을 지우면 사유도 없어지고, 품질을 지정하면 사유가 필수다.
  // 품질 없이 사유만 고치는 것도 허용한다(이미 품질이 찍힌 행의 사유 보정).
  const effectiveQuality: RenewalOutcomeQuality | null = hasQuality
    ? ((quality ?? null) as RenewalOutcomeQuality | null)
    : null;

  const failure = applyReason(update, input, effectiveStage, effectiveQuality, isTerminal);
  if (failure) return failure;
  return { update, effectiveStage, effectiveQuality };
}
