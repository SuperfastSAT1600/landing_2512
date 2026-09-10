/**
 * 이탈 처리 상담 메모 문안 — 순수 함수(I/O 없음).
 * 재결제 결과 기록(`src/lib/renewal/mirror.ts`)과 같은 성격으로, 이탈 모달에서 받은
 * 태그·사유·분류를 상담 타임라인과 슬랙이 공유하는 하나의 문안으로 만든다.
 */
import type { ChurnType } from '@/types/crm';

export const CHURN_MEMO_HEADER = '이탈 처리';

const CHURN_TYPE_LABELS: Record<ChurnType, string> = {
  potential: '잠재 복귀 가능',
  closed: '완전 종료',
};

export function buildChurnMemo(input: {
  churnTag: string;
  reason: string;
  churnType: ChurnType;
}): string {
  const reason = input.reason.trim();
  const lines = [
    `${CHURN_MEMO_HEADER} · ${CHURN_TYPE_LABELS[input.churnType] ?? input.churnType}`,
    `이탈 태그: ${input.churnTag.trim()}`,
  ];
  if (reason) lines.push(`사유: ${reason}`);
  return lines.join('\n');
}
