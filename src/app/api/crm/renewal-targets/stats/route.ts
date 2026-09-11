import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getRecentWeeks, getWeekLabel, getKstDateString } from '@/lib/week-definitions';
import { resolveWeeklyAmounts, type RenewalPaymentRow } from '@/lib/renewal-amount';
import type { RenewalWeeklyStat, RenewalOutcomeQuality } from '@/types/crm';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const weeksParam = sp.get('weeks');
  const weeks = Math.max(1, Math.min(52, Number(weeksParam) || 8));

  // 조회 범위를 주차 정의로 좁힌다 — 예전에는 테이블 전체를 읽고 JS에서 잘랐다.
  const recentWeeks = getRecentWeeks(weeks, getKstDateString());
  const cutoff = recentWeeks[recentWeeks.length - 1]?.start;

  let query = supabaseAdmin
    .from('renewal_targets')
    .select(
      'week_start, stage, outcome_quality, carried_to_week, carried_from_week, converted_payment_id, student_id'
    );
  if (cutoff) query = query.gte('week_start', cutoff);

  const { data, error } = await query;

  if (error) {
    console.error('[renewal-targets/stats GET]', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '통계를 불러오지 못했습니다.' } },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as {
    week_start: string;
    stage: string;
    outcome_quality: RenewalOutcomeQuality | null;
    carried_to_week: string | null;
    carried_from_week: string | null;
    converted_payment_id: string | null;
    student_id: string;
  }[];

  const completedTargets = rows.filter((r) => r.stage === '4');

  // 1) 링크가 가리키는 결제. 링크가 하나도 없으면 조회 자체를 생략한다.
  const paymentIds = [
    ...new Set(completedTargets.filter((r) => r.converted_payment_id).map((r) => r.converted_payment_id!)),
  ];
  const amountById = new Map<string, number>();
  if (paymentIds.length > 0) {
    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, amount')
      .in('id', paymentIds);
    // 금액 조회가 실패해도 인원 통계는 내려준다 — 금액은 0 + 미연결로 드러난다.
    if (paymentError) console.error('[renewal-targets/stats GET payments]', paymentError);
    for (const p of (payments ?? []) as { id: string; amount: number | null }[]) {
      if (typeof p.amount === 'number') amountById.set(p.id, p.amount);
    }
  }

  // 2) 조회 범위의 재결제 결제. 링크 없는 건을 되짚고, 남은 건은 '보드 외'로 드러낸다.
  // 결제 완료가 하나도 없는 주차에도 보드 외 재결제는 있을 수 있으니 항상 읽는다.
  let renewalPayments: RenewalPaymentRow[] = [];
  if (rows.length > 0 && cutoff) {
    const { data: paid, error: paidError } = await supabaseAdmin
      .from('payments')
      .select('id, student_id, amount, paid_at')
      .eq('payment_type', '재결제')
      .gte('paid_at', `${cutoff}T00:00:00+09:00`)
      .lte('paid_at', `${recentWeeks[0].end}T23:59:59.999+09:00`);
    if (paidError) console.error('[renewal-targets/stats GET renewal payments]', paidError);
    renewalPayments = (paid ?? []) as RenewalPaymentRow[];
  }

  const amountByWeek = resolveWeeklyAmounts(completedTargets, amountById, renewalPayments);

  type Counts = {
    selected: number;
    completed: number;
    dropped: number;
    good_completed: number;
    bad_completed: number;
    good_dropped: number;
    bad_dropped: number;
    carried_out: number;
    carried_in: number;
  };
  const emptyCounts = (): Counts => ({
    selected: 0,
    completed: 0,
    dropped: 0,
    good_completed: 0,
    bad_completed: 0,
    good_dropped: 0,
    bad_dropped: 0,
    carried_out: 0,
    carried_in: 0,
  });
  const weekMap = new Map<string, Counts>();

  // 품질 미분류(null)는 어느 버킷에도 넣지 않는다 — completed/dropped 총계와의 차이가 곧 미분류 수다.
  for (const row of rows) {
    const counts = weekMap.get(row.week_start) ?? emptyCounts();
    counts.selected += 1;
    // carried_out 은 open/completed/dropped 와 함께 selected 를 배타 분할한다(결과 축).
    // carried_in 은 selected 자체를 신규/이월유입으로 분할한다(출처 축). 서로 다른 축이다.
    if (row.carried_to_week) counts.carried_out += 1;
    if (row.carried_from_week) counts.carried_in += 1;
    if (row.stage === '4') {
      counts.completed += 1;
      if (row.outcome_quality === 'good') counts.good_completed += 1;
      if (row.outcome_quality === 'bad') counts.bad_completed += 1;
    }
    if (row.stage === '5') {
      counts.dropped += 1;
      if (row.outcome_quality === 'good') counts.good_dropped += 1;
      if (row.outcome_quality === 'bad') counts.bad_dropped += 1;
    }
    weekMap.set(row.week_start, counts);
  }

  // 전환율 분모는 '선정 인원' 전체 — 미전환(5)도 남겨야 분모가 줄지 않는다.
  const weekly: RenewalWeeklyStat[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, weeks)
    .map(([week_start, counts]) => ({
      week_start,
      week_label: getWeekLabel(week_start) ?? week_start,
      selected: counts.selected,
      open: counts.selected - counts.completed - counts.dropped - counts.carried_out,
      completed: counts.completed,
      dropped: counts.dropped,
      conversion_rate:
        counts.selected > 0
          ? Math.round((counts.completed / counts.selected) * 100 * 100) / 100
          : 0,
      good_completed: counts.good_completed,
      bad_completed: counts.bad_completed,
      good_dropped: counts.good_dropped,
      bad_dropped: counts.bad_dropped,
      carried_out: counts.carried_out,
      carried_in: counts.carried_in,
      completed_amount: amountByWeek.get(week_start)?.completed_amount ?? 0,
      amount_missing: amountByWeek.get(week_start)?.amount_missing ?? 0,
      off_board_amount: amountByWeek.get(week_start)?.off_board_amount ?? 0,
    }));

  return NextResponse.json({ data: weekly });
}
