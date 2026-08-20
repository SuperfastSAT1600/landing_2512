/**
 * 미러 라이트 헬퍼 — 윈백 활동을 기존 학생 JSONB(상담 타임라인·재활성화 로그)에 남기는 문구/매핑.
 *
 * 분석 정본은 winback_targets이고, 여기서 만드는 것은 "사람이 읽는 흔적"이다.
 * 이 미러 덕분에 기존 재활성화 탭·성공률 카드·활동 피드가 코드 변경 없이 윈백을 인식한다.
 */
import type { WinbackResponse } from '@/types/crm';

export const MIRROR_MEMO_HEADER = '📨 윈백 발송';

/** 플레이/변형 라벨 — 상담 메모와 재활성화 로그에서 같은 표기를 쓴다. */
export function playLabel(playTitle: string, variantName?: string | null): string {
  return variantName ? `${playTitle} / ${variantName}` : playTitle;
}

export function buildMirrorMemo(input: {
  playTitle: string;
  variantName?: string | null;
  message?: string | null;
}): string {
  const head = `${MIRROR_MEMO_HEADER} · ${playLabel(input.playTitle, input.variantName)}`;
  const body = input.message?.trim();
  return body ? `${head}\n\n${body}` : head;
}

/** reactivation_log.strategy 값 — 기존 성공률 집계가 그대로 쓰는 자유문 필드. */
export function reactivationStrategyLabel(playTitle: string, variantName?: string | null): string {
  return `[윈백] ${playLabel(playTitle, variantName)}`;
}

/**
 * 윈백 타겟 상태 → 기존 ReactivationEntry.outcome 매핑.
 * 전환/재연결/긍정 반응은 성과이므로 reactivated, 명시적 거절만 rejected,
 * 무응답은 no_response, 그 외(보류·미마킹)는 pending으로 남긴다.
 */
export function reactivationOutcomeFor(target: {
  response?: WinbackResponse | null;
  reconnected_at?: string | null;
  converted_at?: string | null;
}): 'pending' | 'no_response' | 'reactivated' | 'rejected' {
  if (target.converted_at || target.reconnected_at || target.response === 'positive') {
    return 'reactivated';
  }
  if (target.response === 'negative') return 'rejected';
  if (target.response === 'none') return 'no_response';
  return 'pending';
}

/**
 * 전략 변형 균등 배정(라운드로빈). 변형이 없으면 전부 null(미지정 버킷).
 * 무작위 배정을 쓰지 않는 이유: 표본이 수십 건이라 랜덤은 쏠림이 크고 재현도 안 된다.
 * @param startIndex 이미 배정된 타겟 수 — 나중에 리드를 더 담아도 변형 균형이 유지된다.
 */
export function assignVariants(
  studentIds: string[],
  variantIds: string[],
  startIndex = 0
): Map<string, string | null> {
  const out = new Map<string, string | null>();
  studentIds.forEach((id, i) => {
    const n = variantIds.length;
    out.set(id, n > 0 ? variantIds[(startIndex + i) % n] : null);
  });
  return out;
}
