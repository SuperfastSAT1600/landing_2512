'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Users, CreditCard, TrendingUp, Repeat2 } from 'lucide-react';
import type { CustomerMetrics } from '@/app/api/business/customer-metrics/route';
import type { LtvTrendData } from '@/app/api/business/ltv-trend/route';
import { USD_TO_KRW_RATE } from '@/lib/business-targets';

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mRes, tRes] = await Promise.all([
          fetch('/api/business/customer-metrics', { headers: { 'x-admin-key': adminKey } }),
          fetch('/api/business/ltv-trend', { headers: { 'x-admin-key': adminKey } }),
        ]);
        const [mJson, tJson] = await Promise.all([mRes.json(), tRes.json()]);
        if (!mRes.ok) { setError(mJson.error?.message ?? '조회 실패'); return; }
        setMetrics(mJson.data as CustomerMetrics);
        if (tRes.ok) setTrend(tJson.data as LtvTrendData);
      } catch {
        setError('네트워크 오류');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
        <Loader2 size={14} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (error || !metrics) {
    return <p className="text-sm text-red-500 py-4">{error || '데이터 없음'}</p>;
  }

  const firstYear = metrics.first_payment_date
    ? new Date(metrics.first_payment_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      })
    : '-';

  // 글로벌 집계 — trend 데이터의 마지막 포인트가 최신 누적값
  const globalLatest = trend?.global?.at(-1);
  const globalCustomers = globalLatest?.customers ?? 0;
  const globalRevUsd = globalLatest?.revenue ?? 0;
  const globalAvgLtvUsd = globalLatest?.ltv ?? 0;
  const globalTotalPayments = trend?.global?.reduce((s, p) => {
    // 고객 수 변화분 = 신규 고객, 간접 추정 어려움 — API에서 직접 반환하지 않으므로 생략
    return s;
  }, 0);

  const koreanRenewalRate = metrics.renewal_rate;
  // 글로벌 재구매율: 재결제 경험 있는 customer 비율 — trend에서 직접 못 뽑으므로 별도 계산 불필요
  // (global_sales의 payment_type='재결제' 있는 학생 비율은 customer-metrics API가 한국만 집계)
  // → 현재는 한국 지표만 있으므로 글로벌 재구매율은 '-'로 표시

  const trendData = segment === 'korea' ? (trend?.korea ?? []) : (trend?.global ?? []);
  const currency = segment === 'korea' ? 'KRW' : 'USD';

  // 글로벌 구독 여부는 global_sales 테이블 billing_type 기준 — 현재 API에서 집계 안 함
  // 추후 필요 시 /api/business/customer-metrics 에 global 섹션 추가

  return (
    <div className="space-y-5">
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
              label="누적 결제 고객"
              value={`${metrics.total_unique_customers.toLocaleString()}명`}
              sub={`${firstYear}부터 · 중복 제거`}
              color="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="평균 LTV"
              value={won(metrics.avg_ltv)}
              title={wonFull(metrics.avg_ltv)}
              sub={`중앙값 ${won(metrics.median_ltv)}`}
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
              value={`${koreanRenewalRate}%`}
              sub="재결제 경험 있는 고객 비율"
              color="bg-teal-50 text-teal-600"
            />
          </div>

          {/* 누적 강조 */}
          <div className="bg-gray-50 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">누적 순매출 (전체 기간)</p>
              <p
                className="text-3xl font-bold text-gray-900 tabular-nums"
                title={wonFull(metrics.cumulative_revenue)}
              >
                {won(metrics.cumulative_revenue)}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
              <span>고객 {metrics.total_unique_customers.toLocaleString()}명 확보</span>
              <span>1인당 평균 {won(metrics.avg_ltv)}</span>
              <span>서비스 시작 {firstYear}</span>
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
              label="누적 결제 고객"
              value={`${globalCustomers.toLocaleString()}명`}
              sub="이름 기준 중복 제거"
              color="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="평균 LTV"
              value={usd(globalAvgLtvUsd)}
              sub={`≈ ${won(globalAvgLtvUsd * USD_TO_KRW_RATE)} (${USD_TO_KRW_RATE.toLocaleString()}원/달러)`}
              color="bg-emerald-50 text-emerald-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="누적 총 매출"
              value={usd(globalRevUsd)}
              sub={`≈ ${won(globalRevUsd * USD_TO_KRW_RATE)}`}
              color="bg-purple-50 text-purple-600"
            />
          </div>

          <div className="bg-gray-50 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">누적 순매출 (전체 기간)</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {usd(globalRevUsd)}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
              <span>고객 {globalCustomers.toLocaleString()}명 확보</span>
              <span>1인당 평균 {usd(globalAvgLtvUsd)}</span>
              <span>원화 환산 {won(globalRevUsd * USD_TO_KRW_RATE)}</span>
            </div>
          </div>
        </>
      )}

      {/* LTV 트렌드 차트 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500">
            월별 누적 LTV 추이
          </h3>
          <p className="text-[11px] text-gray-400">
            해당 달까지 유입된 전체 고객의 누적 평균 · 우상향 = 리텐션 우수
          </p>
        </div>
        <LtvTrendChart data={trendData} currency={currency} />
      </div>

      <p className="text-[11px] text-gray-400">
        한국: 결제 테이블 전체 기간 기준, 환불 포함 순 LTV. 글로벌: global_sales 테이블 USD 기준.
      </p>
    </div>
  );
}
