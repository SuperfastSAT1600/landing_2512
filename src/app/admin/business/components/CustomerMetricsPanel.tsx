'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Users, CreditCard, TrendingUp, Repeat2 } from 'lucide-react';
import type { CustomerMetrics } from '@/app/api/business/customer-metrics/route';
import type { LtvTrendData } from '@/app/api/business/ltv-trend/route';
import { USD_TO_KRW_RATE } from '@/lib/business-targets';
import {
  type Preset,
  PRESETS,
  getPresetRange,
} from '../../crm/components/stats-primitives';

const LtvTrendChart = dynamic(() => import('./LtvTrendChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[240px] flex items-center justify-center text-sm text-gray-300">
      차트 로딩…
    </div>
  ),
});

interface Props {
  adminKey: string;
}

const won = (n: number) =>
  n >= 1_0000_0000
    ? `${(n / 1_0000_0000).toFixed(1)}억원`
    : `${Math.round(n / 10000).toLocaleString()}만원`;
const wonFull = (n: number) => `${n.toLocaleString()}원`;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

type Segment = 'korea' | 'global';

const TABS: { key: Segment; label: string }[] = [
  { key: 'korea', label: '한국' },
  { key: 'global', label: '글로벌' },
];

const METRIC_PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_month',   label: '이번 달' },
  { key: 'last_month',   label: '지난 달' },
  { key: 'this_quarter', label: '이번 분기' },
  { key: 'last_6m',      label: '최근 6개월' },
  { key: 'this_year',    label: '올해' },
  { key: 'last_year',    label: '지난해' },
  { key: 'all',          label: '전체' },
  { key: 'custom',       label: '직접 입력' },
];

function MetricCard({
  icon: Icon,
  label,
  value,
  title,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  title?: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 ${color}`}>
        <Icon size={14} />
      </div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums tracking-tight" title={title}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function CustomerMetricsPanel({ adminKey }: Props) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [trend, setTrend] = useState<LtvTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<Segment>('korea');

  // 기간 선택
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } =
    preset === 'custom' ? { from: customFrom, to: customTo } : getPresetRange(preset);

  const fetchMetrics = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/business/customer-metrics?${qs}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? '조회 실패'); return; }
      setMetrics(json.data as CustomerMetrics);
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [from, to, adminKey]);

  // 트렌드 차트는 기간 선택과 무관하게 전체 기간 고정
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/business/ltv-trend', { headers: { 'x-admin-key': adminKey } });
        if (res.ok) setTrend((await res.json()).data as LtvTrendData);
      } catch { /* 차트만 비어 보임 */ }
    })();
  }, [adminKey]);

  useEffect(() => {
    if (preset !== 'custom') fetchMetrics();
  }, [preset, fetchMetrics]);

  const periodLabel = preset === 'all'
    ? '전체 기간'
    : preset === 'custom' && from && to
    ? `${from} ~ ${to}`
    : METRIC_PRESETS.find((p) => p.key === preset)?.label ?? '';

  const ltvLabel = preset === 'all' ? '평균 LTV' : '기간 내 1인당 평균';

  const trendData = segment === 'korea' ? (trend?.korea ?? []) : (trend?.global ?? []);
  const currency = segment === 'korea' ? 'KRW' : 'USD';

  return (
    <div className="space-y-5">
      {/* 기간 선택기 */}
      <div className="flex flex-wrap items-center gap-2">
        {METRIC_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPreset(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              preset === key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
            <button
              onClick={fetchMetrics}
              disabled={!customFrom || !customTo}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg disabled:opacity-40"
            >
              조회
            </button>
          </div>
        )}
        {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {metrics && (
        <>
          {/* 세그먼트 탭 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSegment(key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  segment === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── 한국 ── */}
          {segment === 'korea' && (
            <>
              <div className="flex flex-wrap gap-x-10 gap-y-5">
                <MetricCard
                  icon={Users}
                  label="결제 고객"
                  value={`${metrics.total_unique_customers.toLocaleString()}명`}
                  sub={`${periodLabel} · 중복 제거`}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  icon={TrendingUp}
                  label={ltvLabel}
                  value={won(metrics.avg_ltv)}
                  title={wonFull(metrics.avg_ltv)}
                  sub={preset === 'all' ? `중앙값 ${won(metrics.median_ltv)}` : undefined}
                  color="bg-emerald-50 text-emerald-600"
                />
                <MetricCard
                  icon={CreditCard}
                  label="고객당 평균 결제"
                  value={`${metrics.avg_payments_per_customer}회`}
                  sub={`총 ${metrics.total_payments.toLocaleString()}건`}
                  color="bg-purple-50 text-purple-600"
                />
                <MetricCard
                  icon={Repeat2}
                  label="재구매율"
                  value={`${metrics.renewal_rate}%`}
                  sub="재결제 경험 있는 고객 비율"
                  color="bg-teal-50 text-teal-600"
                />
              </div>

              <div className="bg-gray-50 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    {preset === 'all' ? '누적 순매출 (전체 기간)' : `기간 내 순매출 · ${periodLabel}`}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums" title={wonFull(metrics.cumulative_revenue)}>
                    {won(metrics.cumulative_revenue)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span>고객 {metrics.total_unique_customers.toLocaleString()}명</span>
                  <span>1인당 평균 {won(metrics.avg_ltv)}</span>
                  {preset === 'all' && metrics.first_payment_date && (
                    <span>
                      서비스 시작{' '}
                      {new Date(metrics.first_payment_date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── 글로벌 ── */}
          {segment === 'global' && (
            <>
              <div className="flex flex-wrap gap-x-10 gap-y-5">
                <MetricCard
                  icon={Users}
                  label="결제 고객"
                  value={`${metrics.global_unique_customers.toLocaleString()}명`}
                  sub={`${periodLabel} · 이름 기준`}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  icon={TrendingUp}
                  label={ltvLabel}
                  value={usd(metrics.global_avg_ltv_usd)}
                  sub={`≈ ${won(metrics.global_avg_ltv_usd * USD_TO_KRW_RATE)}`}
                  color="bg-emerald-50 text-emerald-600"
                />
                <MetricCard
                  icon={CreditCard}
                  label="고객당 평균 결제"
                  value={`${metrics.global_avg_payments_per_customer}회`}
                  sub={`총 ${metrics.global_total_payments.toLocaleString()}건`}
                  color="bg-purple-50 text-purple-600"
                />
              </div>

              <div className="bg-gray-50 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    {preset === 'all' ? '누적 순매출 (전체 기간)' : `기간 내 순매출 · ${periodLabel}`}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums">
                    {usd(metrics.global_cumulative_revenue_usd)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span>고객 {metrics.global_unique_customers.toLocaleString()}명</span>
                  <span>1인당 평균 {usd(metrics.global_avg_ltv_usd)}</span>
                  <span>원화 환산 {won(metrics.global_cumulative_revenue_usd * USD_TO_KRW_RATE)}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* LTV 트렌드 차트 — 기간 선택과 무관하게 전체 기간 누적 LTV */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">월별 누적 LTV 추이</h3>
          <p className="text-[11px] text-gray-400">전체 기간 · 우상향 = 리텐션 우수</p>
        </div>
        <LtvTrendChart data={trendData} currency={currency} />
      </div>

      <p className="text-[11px] text-gray-400">
        한국: 결제 테이블 기준 환불 포함 순 LTV. 글로벌: global_sales USD 기준. 트렌드 차트는 기간 선택 무관 전체 기간.
      </p>
    </div>
  );
}
