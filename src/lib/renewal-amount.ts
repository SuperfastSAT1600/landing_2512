// 주차별 재결제 금액 — 4단계(결제 완료) 대상의 실제 결제액을 푼다.
//
// converted_payment_id 는 '어느 결제인지 지목'일 뿐 필수가 아니다. 카드를 4단계로 옮기기만 해도
// 4단계가 되고, 결제는 다른 화면에서 기록될 수 있다. 그래서 링크만 합산하면 실제로 들어온 돈이
// 조용히 빠진다. 금액의 출처는 언제나 payments 이고, 링크는 정확도를 높이는 힌트로만 쓴다.

import { getWeekDefByStart } from './week-definitions';

export interface CompletedTargetRow {
  week_start: string;
  student_id: string;
  converted_payment_id: string | null;
}

export interface RenewalPaymentRow {
  id: string;
  student_id: string | null;
  amount: number | null;
  paid_at: string;
}

export interface WeekAmount {
  /** 그 주차 결제 완료 건의 결제액 합(원). */
  completed_amount: number;
  /** 결제를 끝내 찾지 못한 결제 완료 건 수 — 합계가 실제보다 적을 수 있음을 드러낸다. */
  amount_missing: number;
}

/** paid_at(timestamptz) → KST 날짜. 주차 경계는 KST 기준이라 UTC 로 자르면 하루 밀린다. */
export function kstDate(paidAt: string): string {
  return new Date(new Date(paidAt).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 4단계 대상들을 주차별 금액으로 집계한다.
 *
 * @param targets         4단계 대상 행만
 * @param amountById      converted_payment_id → 결제액 (링크가 가리키는 결제)
 * @param renewalPayments 조회 기간의 재결제 결제 — 링크 없는 건을 되짚는 데 쓴다
 */
export function resolveWeeklyAmounts(
  targets: CompletedTargetRow[],
  amountById: Map<string, number>,
  renewalPayments: RenewalPaymentRow[]
): Map<string, WeekAmount> {
  const byWeek = new Map<string, WeekAmount>();
  const weekOf = (weekStart: string) => {
    const found = byWeek.get(weekStart) ?? { completed_amount: 0, amount_missing: 0 };
    byWeek.set(weekStart, found);
    return found;
  };

  // 한 결제가 두 행(또는 두 주차)에 겹쳐 잡히지 않도록 쓴 결제를 표시해 둔다.
  const claimed = new Set<string>();
  const unlinked: CompletedTargetRow[] = [];

  for (const t of targets) {
    const amount = t.converted_payment_id ? amountById.get(t.converted_payment_id) : undefined;
    if (amount === undefined) {
      unlinked.push(t);
      continue;
    }
    weekOf(t.week_start).completed_amount += amount;
    claimed.add(t.converted_payment_id!);
  }

  for (const t of unlinked) {
    const week = getWeekDefByStart(t.week_start);
    const matches = week
      ? renewalPayments.filter(
          (p) =>
            p.student_id === t.student_id &&
            typeof p.amount === 'number' &&
            !claimed.has(p.id) &&
            kstDate(p.paid_at) >= week.start &&
            kstDate(p.paid_at) <= week.end
        )
      : [];
    const counts = weekOf(t.week_start);
    if (matches.length === 0) {
      counts.amount_missing += 1;
      continue;
    }
    for (const m of matches) {
      counts.completed_amount += m.amount!;
      claimed.add(m.id);
    }
  }

  return byWeek;
}
