import type { Student, FunnelStage } from '@/types/crm';
import { FUNNEL_STAGE_LABELS } from '@/types/crm';

// 리드 단위 통합 활동 피드 — 이미 로드된 Student의 여러 필드를 하나의 시간순 피드로 합친다.
// (consultation_timeline / stage_history / strategy_history / reactivation_log
//  + first_message_sent_at + payments(외부 fetch)). 순수 함수, 신규 스키마 없음.

export type ActivityKind = 'memo' | 'stage' | 'strategy' | 'reactivation' | 'payment' | 'first_message';

export interface ActivityItem {
  kind: ActivityKind;
  at: string; // ISO timestamp
  title: string;
  detail?: string;
  meta?: string; // 작성자/보조 정보
}

/** payments는 Student에 없고 /api/crm/payments로 별도 조회 → 이 형태로 주입. */
export interface FeedPayment {
  amount: number;
  payment_type: string | null;
  product: string | null;
  paid_at: string;
}

type FeedStudent = Pick<
  Student,
  'consultation_timeline' | 'stage_history' | 'strategy_history' | 'reactivation_log' | 'first_message_sent_at'
>;

const REACT_OUTCOME_LABEL: Record<string, string> = {
  pending: '대기',
  no_response: '무응답',
  reactivated: '재활성화',
  rejected: '거절',
};

function toMs(ts: string | null | undefined): number {
  if (!ts) return NaN;
  return new Date(ts).getTime();
}

export function buildActivityFeed(student: FeedStudent, payments: FeedPayment[] = []): ActivityItem[] {
  const items: ActivityItem[] = [];

  // 상담 메모
  for (const e of student.consultation_timeline ?? []) {
    if (!e.created_at) continue;
    const text = e.raw_memo || e.ai_purified || '';
    items.push({
      kind: 'memo',
      at: e.created_at,
      title: '상담 메모',
      detail: text,
      meta: e.author || undefined,
    });
  }

  // 단계 전환
  for (const e of student.stage_history ?? []) {
    if (!e.entered_at) continue;
    const label = e.label || FUNNEL_STAGE_LABELS[e.stage as FunnelStage] || e.stage;
    items.push({ kind: 'stage', at: e.entered_at, title: '단계 이동', detail: label });
  }

  // 전략 배정
  for (const e of student.strategy_history ?? []) {
    if (!e.applied_at) continue;
    items.push({
      kind: 'strategy',
      at: e.applied_at,
      title: '전략 배정',
      detail: e.strategy_name,
      meta: e.memo || undefined,
    });
  }

  // 재활성화 시도
  for (const e of student.reactivation_log ?? []) {
    if (!e.attempted_at) continue;
    items.push({
      kind: 'reactivation',
      at: e.attempted_at,
      title: `재활성화 · ${REACT_OUTCOME_LABEL[e.outcome] ?? e.outcome}`,
      detail: e.strategy,
      meta: e.notes || undefined,
    });
  }

  // 첫 메시지 발송
  if (student.first_message_sent_at) {
    items.push({ kind: 'first_message', at: student.first_message_sent_at, title: '첫 메시지 발송' });
  }

  // 결제 (외부 주입)
  for (const p of payments) {
    if (!p.paid_at) continue;
    const won = `${p.amount.toLocaleString()}원`;
    items.push({
      kind: 'payment',
      at: p.paid_at,
      title: p.payment_type || '결제',
      detail: p.product ? `${p.product} · ${won}` : won,
    });
  }

  // 최신순 정렬 (유효 타임스탬프만)
  return items
    .filter((i) => !Number.isNaN(toMs(i.at)))
    .sort((a, b) => toMs(b.at) - toMs(a.at));
}
