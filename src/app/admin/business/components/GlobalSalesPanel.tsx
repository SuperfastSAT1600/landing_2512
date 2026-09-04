'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus } from 'lucide-react';
import { toMonthKey } from '@/lib/crm-stats-core';
import { buildTargetVsActual, niceAxisTicks, USD_TO_KRW_RATE, type MonthlyTargetRow } from '@/lib/business-targets';
import { aggregateByBillingType, aggregateByCountry, countDistinctCountries } from '@/lib/global-sales-stats';
import type { GlobalSaleEntry } from '@/lib/global-sales-types';
import { MonthlyTargetEditor } from './MonthlyTargetEditor';
import { RevenueBreakdownBars } from './RevenueBreakdownBars';
import { GlobalSalesTable } from './GlobalSalesTable';
import { GlobalSaleAddForm, type NewGlobalSale } from './GlobalSaleAddForm';

// recharts는 이 패널을 열 때만 필요 — 지연 로딩해 첫 진입 번들에서 제외한다.
const TargetVsActualChart = dynamic(() => import('./TargetVsActualChart'), {
  ssr: false,
  loading: () => <div className="h-[220px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});

interface Props {
  adminKey: string;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;


/**
 * 튜터링 CRM(students/payments)과 완전히 분리된 신규 상품 라인의 단순 매출 기록.
 * 아직 정식 CRM 학생이 아니므로 학생 패널 연결 없음. 금액은 USD.
 */
export function GlobalSalesPanel({ adminKey }: Props) {
  const [entries, setEntries] = useState<GlobalSaleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetRow[]>([]);

  const fetchMonthlyTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/business/monthly-targets?segment=global', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok) setMonthlyTargets(json.data ?? []);
    } catch { /* 무시: 목표 비교만 비어 보임 */ }
  }, [adminKey]);

  useEffect(() => { fetchMonthlyTargets(); }, [fetchMonthlyTargets]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/business/global-sales', { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok) setEntries(json.data ?? []);
        else setError(json.error ?? '조회에 실패했습니다.');
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminKey]);

  async function submit(sale: NewGlobalSale) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/business/global-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(sale),
      });
      const json = await res.json();
      if (res.ok) {
        setEntries((prev) => [json.data as GlobalSaleEntry, ...prev]);
        setAdding(false);
      } else {
        alert(json.error ?? '기록에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 컬럼 도입 이전 기록을 뒤늦게 채워 넣는 경로 — 낙관적 갱신 후 실패 시 되돌린다.
  async function patchEntry(id: string, updates: Partial<GlobalSaleEntry>) {
    const prev = entries;
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    const res = await fetch(`/api/business/global-sales/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(updates),
    });
    if (!res.ok) setEntries(prev);
  }

  async function remove(id: string, studentName: string) {
    if (!confirm(`"${studentName}" 매출 기록을 삭제할까요?`)) return;
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    const res = await fetch(`/api/business/global-sales/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    if (!res.ok) setEntries(prev);
  }

  const total = entries.reduce((sum, e) => sum + e.amount_usd, 0);
  const first = entries.filter((e) => e.payment_type === '최초결제');
  const repeat = entries.filter((e) => e.payment_type === '재결제');
  const sumOf = (list: GlobalSaleEntry[]) => list.reduce((sum, e) => sum + e.amount_usd, 0);

  // 목표(monthlyTargets)는 이미 원화로 저장돼 있다 — 실적(원거래는 USD)만 월별 집계 시점에
  // 1$=1,400원으로 환산해 같은 통화로 맞춘다(그 뒤로는 추가 환산 없음).
  const actualByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = toMonthKey(e.sale_date);
    actualByMonth[key] = (actualByMonth[key] ?? 0) + e.amount_usd * USD_TO_KRW_RATE;
  }
  // 차트에 넘기기 전 달러로 환산해둔다 — recharts는 축 눈금을 원본 값(KRW) 기준으로
  // "예쁜 숫자"를 계산하므로, KRW 그대로 넘기고 formatValue에서만 나누면 눈금이
  // $10,714 같은 어중간한 값이 된다. 데이터 자체를 달러로 바꿔야 눈금도 $10,000 단위로 나온다.
  const targetVsActual = buildTargetVsActual(monthlyTargets, actualByMonth).map((row) => ({
    ...row,
    target: row.target / USD_TO_KRW_RATE,
    actual: row.actual / USD_TO_KRW_RATE,
  }));
  const chartMax = Math.max(0, ...targetVsActual.flatMap((row) => [row.target, row.actual]));
  const chartTicks = niceAxisTicks(chartMax);

  const countryRows = aggregateByCountry(entries);
  const billingRows = aggregateByBillingType(entries);
  const onetime = entries.filter((e) => e.billing_type === '일회성');
  const subscription = entries.filter((e) => e.billing_type === '구독');
  const countryCount = countDistinctCountries(entries);
  const topShare = countryRows[0]?.share ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* 합계 */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">총 매출</p>
          <p data-testid="total-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(total)}</p>
          <p className="text-[11px] text-gray-400 mt-1">등록 {entries.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">최초결제</p>
          <p data-testid="first-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(first))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{first.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">재결제</p>
          <p data-testid="repeat-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(repeat))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{repeat.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">일회성</p>
          <p data-testid="onetime-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(onetime))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{onetime.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">구독</p>
          <p data-testid="subscription-usd" className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(sumOf(subscription))}</p>
          <p className="text-[11px] text-gray-400 mt-1">{subscription.length}건</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">판매 국가</p>
          <p data-testid="country-count" className="text-2xl font-semibold text-gray-900 tabular-nums">
            {countryCount}개국
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {countryRows[0] && countryRows[0].countryCode
              ? `1위 ${countryRows[0].label} ${Math.round(topShare)}%`
              : '국가 미입력'}
          </p>
        </div>
      </div>

      {/* 국가별 매출 — 어느 시장이 실제로 돈을 내는지 보는 구간 */}
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">국가별 매출</h3>
        {countryRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            국가별 매출이 아직 없습니다. ‘매출 추가’에서 국가를 함께 기록해보세요.
          </p>
        ) : (
          <RevenueBreakdownBars
            rowTestId="country-stat-row"
            formatAmount={usd}
            rows={countryRows.map((row) => ({
              key: row.countryCode ?? 'unknown',
              label: row.label,
              total: row.total,
              share: row.share,
              note: `${row.count}건 · 재${usd(row.repeatTotal)}`,
              muted: !row.countryCode,
            }))}
          />
        )}
      </div>

      {/* 결제 방식별 매출 — 일회성 판매와 구독이 각각 얼마를 만드는지 */}
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">결제 방식별 매출</h3>
        {billingRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">결제 방식별 매출이 아직 없습니다.</p>
        ) : (
          <RevenueBreakdownBars
            rowTestId="billing-stat-row"
            formatAmount={usd}
            rows={billingRows.map((row) => ({
              key: row.billingType,
              label: row.label,
              total: row.total,
              share: row.share,
              note: `${row.count}건`,
            }))}
          />
        )}
      </div>

      {/* 월별 목표 대비 실적 — 목표·실적 모두 달러(USD) 단위 데이터로 변환해 차트에 넘긴다.
          (recharts 축 눈금은 원본 데이터 값 기준으로 계산되므로, KRW인 채로 넘기면
          $10,714처럼 어중간한 눈금이 나온다 — 데이터 자체를 달러로 바꿔야 $10,000 단위로 나온다.) */}
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">월별 목표 대비 실적</h3>
          <MonthlyTargetEditor segment="global" adminKey={adminKey} onSaved={fetchMonthlyTargets} />
        </div>
        {targetVsActual.length > 0 ? (
          <TargetVsActualChart
            data={targetVsActual}
            formatValue={usd}
            ticks={chartTicks}
            domain={[0, chartTicks[chartTicks.length - 1]]}
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            설정된 목표가 없습니다. ‘목표 설정’으로 이번 달부터 등록해보세요.
          </p>
        )}
      </div>

      {/* 추가 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">매출 목록</h3>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> 매출 추가
          </button>
        </div>

        {adding && (
          <GlobalSaleAddForm
            submitting={submitting}
            onSubmit={submit}
            onCancel={() => setAdding(false)}
          />
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-lg">
            등록된 매출이 없습니다. ‘매출 추가’로 기록해보세요.
          </p>
        ) : (
          <GlobalSalesTable
            entries={entries}
            formatAmount={usd}
            onPatch={patchEntry}
            onRemove={remove}
          />
        )}
      </div>
    </div>
  );
}
