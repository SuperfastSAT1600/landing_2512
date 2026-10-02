import {
  RENEWAL_STAGES,
  RENEWAL_OUTCOME_QUALITIES,
  type RenewalStage,
  type RenewalOutcomeQuality,
} from '@/types/crm';

/** 카드 메모는 한 줄 상태 노트다. 상담 기록 전체는 학생 패널 타임라인이 담당한다. */
const MEMO_MAX_LENGTH = 1000;

/** 컨택 예정일은 KST 기준 달력 날짜다 — 시각은 담지 않는다. */
const CONTACT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 품질을 기록할 수 있는 터미널 단계. */
export const QUALITY_STAGES: RenewalStage[] = ['4', '5'];

export interface PatchBody {
  stage?: unknown;
  converted_payment_id?: unknown;
  drop_reason?: unknown;
  clear_drop_reason?: unknown;
  outcome_quality?: unknown;
  outcome_reason_tag?: unknown;
  outcome_reason_note?: unknown;
  memo?: unknown;
  next_contact_date?: unknown;
  author?: unknown;
}

export interface PatchFailure {
  code: string;
  message: string;
  status: number;
}

/** 필드 존재 여부(has*)와 검증을 통과한 값을 함께 들고 다닌다. */
export interface PatchInput {
  body: PatchBody;
  hasStage: boolean;
  stage: unknown;
  hasQuality: boolean;
  quality: unknown;
  hasReason: boolean;
  reasonTag: unknown;
  reasonNote: string;
  hasMemo: boolean;
  memoText: string;
  hasContactDate: boolean;
  contactDate: unknown;
}

export function patchFailure(code: string, message: string, status = 400): PatchFailure {
  return { code, message, status };
}

export function isPatchFailure<T extends object>(result: T | PatchFailure): result is PatchFailure {
  return 'status' in result;
}

function isInvalidQuality(quality: unknown): boolean {
  return (
    quality !== null &&
    (typeof quality !== 'string' || !RENEWAL_OUTCOME_QUALITIES.includes(quality as RenewalOutcomeQuality))
  );
}

function isInvalidContactDate(contactDate: unknown): boolean {
  return (
    contactDate !== null &&
    (typeof contactDate !== 'string' ||
      (contactDate !== '' && !CONTACT_DATE_PATTERN.test(contactDate)))
  );
}

/** 요청 본문 형식 검증. 검증 순서가 곧 에러 우선순위다. */
export function parsePatchInput(body: PatchBody): PatchInput | PatchFailure {
  // stage 는 선택이다 — 결과 품질만 소급 지정할 때 stage_updated_at 을 재기록하면
  // 카드의 '단계 D+N' 이 리셋되고 목록 정렬(stage_updated_at DESC)까지 흐트러진다.
  const hasStage = body.stage !== undefined;
  const stage = body.stage;
  if (hasStage && (typeof stage !== 'string' || !RENEWAL_STAGES.includes(stage as RenewalStage))) {
    return patchFailure('INVALID_STAGE', '유효하지 않은 stage입니다.');
  }

  const hasQuality = 'outcome_quality' in body;
  const quality = body.outcome_quality;
  if (hasQuality && isInvalidQuality(quality)) {
    return patchFailure('INVALID_OUTCOME_QUALITY', '유효하지 않은 결과 품질입니다.');
  }

  const hasReason = 'outcome_reason_tag' in body;
  const reasonTag = body.outcome_reason_tag;
  if (hasReason && reasonTag !== null && typeof reasonTag !== 'string') {
    return patchFailure('INVALID_OUTCOME_REASON', '유효하지 않은 사유입니다.');
  }
  const reasonNote =
    typeof body.outcome_reason_note === 'string' ? body.outcome_reason_note.trim() : '';

  const hasMemo = 'memo' in body;
  if (hasMemo && body.memo !== null && typeof body.memo !== 'string') {
    return patchFailure('INVALID_MEMO', '메모 형식이 올바르지 않습니다.');
  }
  const memoText = typeof body.memo === 'string' ? body.memo.trim() : '';
  if (memoText.length > MEMO_MAX_LENGTH) {
    return patchFailure('MEMO_TOO_LONG', `메모는 ${MEMO_MAX_LENGTH}자까지 가능합니다.`);
  }

  const hasContactDate = 'next_contact_date' in body;
  const contactDate = body.next_contact_date;
  if (hasContactDate && isInvalidContactDate(contactDate)) {
    return patchFailure('INVALID_CONTACT_DATE', '컨택 예정일 형식이 올바르지 않습니다.');
  }

  if (!hasStage && !hasQuality && !hasReason && !hasMemo && !hasContactDate) {
    return patchFailure('NO_UPDATABLE_FIELDS', '변경할 필드가 없습니다.');
  }

  return {
    body, hasStage, stage, hasQuality, quality, hasReason, reasonTag, reasonNote,
    hasMemo, memoText, hasContactDate, contactDate,
  };
}
