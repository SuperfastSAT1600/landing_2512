'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { getPresetRange, getTrendRange, TREND_PRESETS, type TrendPreset } from '../../crm/components/stats-primitives';
import { toMonthKey } from '@/lib/crm-stats-core';
import { combineMonthlyRevenue, USD_TO_KRW_RATE } from '@/lib/business-targets';
import type { CrmStatsData, StatsMonthly } from '@/lib/crm-stats-service';
import type { GlobalSaleEntry } from '@/app/api/business/global-sales/route';

const SalesRevenueChart = dynamic(() => import('./SalesRevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[320px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});

interface Props {
  adminKey: string;
}

const manwon = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;
const won = (n: number) => `${n.toLocaleString()}원`;

/**
 * "전체" 탭 — 한국비즈니스(KRW)와 글로벌(USD)을 합산한 큰 그림만 보여준다.
 * 글로벌은 리드·컨택 개념이 없어 퍼널 지표(신규 리드/컨택률/유입 소스)는 절대 합치지 않는다
 * — 그건 한국비즈니스 탭에서만 본다. 목표 지표도 여기선 안 보여준다(통화별 목표 설정·편집은
 * 한국비즈니스/글로벌 각 탭에서, 여기는 순수 매출 추이만).
 */
export function TotalOverviewPanel({ adminKey }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<CrmStatsData['overview'] | null>(null);
  const [tutoringMonthly, setTutoringMonthly] = useState<StatsMonthly[]>([]);
  const [globalEntries, setGlobalEntries] = useState<GlobalSaleEntry[]>([]);
  const [trendPreset, setTrendPreset] = useState<TrendPreset>('all');
  const [trendCustomFrom, setTrendCustomFrom] = useState('');
  const [trendCustomTo, setTrendCustomTo] = useState('');

  const trendRange =
    trendPreset === 'custom' ? { from: trendCustomFrom, to: trendCustomTo } : getTrendRange(trendPreset);

  // 이번 달 KPI + 글로벌 전체 목록은 기간 선택과 무관하게 한 번만 로드한다.
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      const headers = { 'x-admin-key': adminKey };
      const thisMonth = getPresetRange('this_month');
      try {
        const [crmThisMonth, sales] = await Promise.all([
          fetch(`/api/crm/stats?from=${thisMonth.from}&to=${thisMonth.to}&segment=all`, { headers }),
          fetch('/api/business/global-sales', { headers }),
        ]);
        const [crmThisMonthJson, salesJson] = await Promise.all([crmThisMonth.json(), sales.json()]);
        if (crmThisMonth.ok) setOverview((crmThisMonthJson.data as CrmStatsData).overview);
        if (sales.ok) setGlobalEntries(salesJson.data ?? []);
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminKey]);

  // 월별 추이(합산)에 쓰는 한국비즈니스 매출만 선택한 기간에 맞춰 재조회한다.
  useEffect(() => {
    const { from: tf, to: tt } = trendRange;
    if (!tf || !tt || tf > tt) return;
    (async () => {
      try {
        const res = await fetch(`/api/crm/stats?from=${tf}&to=${tt}&segment=all`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (res.ok && json.data) setTutoringMonthly((json.data as CrmStatsData).monthly);
      } catch {
        /* 무시: 추이 그래프만 비어 보임 */
      }
    })();
    // trendRange는 from/to 외 프로퍼티가 없고 매 렌더링 재생성되므로 from/to만 의존한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, trendRange.from, trendRange.to]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }

  const thisMonthKey = toMonthKey(getPresetRange('this_month').from);
  const globalThisMonthUsd = globalEntries
    .filter((e) => toMonthKey(e.sale_date) === thisMonthKey)
    .reduce((sum, e) => sum + e.amount_usd, 0);
  const globalThisMonthKrw = globalThisMonthUsd * USD_TO_KRW_RATE;

  const o = overview ?? { gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 };
  const grossRevenue = o.gross_revenue + globalThisMonthKrw;
  // 글로벌은 환불·부가세 구분이 없어 총매출과 동일하게 순매출·순수익에도 그대로 더한다.
  const netRevenue = o.total_revenue + globalThisMonthKrw;
  const netProfit = o.total_net_revenue + globalThisMonthKrw;
  const tutoringShare = grossRevenue > 0 ? Math.round((o.gross_revenue / grossRevenue) * 100) : 0;
  const globalShare = grossRevenue > 0 ? 100 - tutoringShare : 0;

  const globalByMonth: Record<string, number> = {};
  for (const e of globalEntries) {
    if (e.sale_date < trendRange.from || e.sale_date > trendRange.to) continue;
    const key = toMonthKey(e.sale_date);
    globalByMonth[key] = (globalByMonth[key] ?? 0) + e.amount_usd;
  }
  const combinedMonthly = combineMonthlyRevenue(tutoringMonthly, globalByMonth);

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">총 매출</p>
          <p data-testid="total-revenue-krw" className="text-2xl font-semibold text-gray-900 tabular-nums">
            {manwon(grossRevenue)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            이번 달 · 한국비즈니스 {tutoringShare}% · 글로벌 {globalShare}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">순매출</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{manwon(netRevenue)}</p>
          <p className="text-[11px] text-gray-400 mt-1">이번 달 · 원화 환산 기준</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">순 수익</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{manwon(netProfit)}</p>
          <p className="text-[11px] text-gray-400 mt-1">글로벌은 1$ = {USD_TO_KRW_RATE.toLocaleString()}원 환산</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3">월별 추이 (합산)</h3>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {TREND_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTrendPreset(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                trendPreset === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}

          {trendPreset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1">
              <input
                type="date"
                value={trendCustomFrom}
                onChange={(e) => setTrendCustomFrom(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="date"
                value={trendCustomTo}
                onChange={(e) => setTrendCustomTo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>

        {combinedMonthly.length > 0 ? (
          <SalesRevenueChart data={combinedMonthly} formatWon={won} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
            데이터가 없습니다.
          </p>
        )}
        <p className="mt-3 text-[11px] text-gray-400">
          리드·컨택·전환 같은 퍼널 지표는 글로벌에 해당 개념이 없어 여기서 합치지 않습니다 — 한국비즈니스 탭에서 확인하세요.
        </p>
      </div>
    </div>
  );
}
