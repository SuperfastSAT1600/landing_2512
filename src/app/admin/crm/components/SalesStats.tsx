'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Users, Phone, CreditCard, RefreshCw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// recharts는 통계 탭을 열 때만 필요 — 지연 로딩해 CRM 첫 진입 번들에서 제외한다.
const SalesRevenueChart = dynamic(() => import('./SalesRevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});
import type { CrmStatsData, StatsBySource, StatsWeekly, StatsMonthly } from '@/app/api/crm/stats/route';
import type { StatsDetailMetric, LeadDetailItem } from '@/lib/crm-stats-detail';
import { StatsDetailModal, leadStatus, type LeadDisplayStatus } from './StatsDetailModal';
import {
  type Preset,
  type TrendPreset,
  getPresetRange,
  getTrendRange,
  PRESETS,
  TREND_PRESETS,
  OverviewCard,
  RateBar,
  formatDuration,
} from './stats-primitives';

// ─── Sub-components ────────────────────────────────────────────────────────────

const SRC_STATUS_STYLE: Record<LeadDisplayStatus, string> = {
  '세일즈 중': 'bg-blue-50 text-blue-600',
  '결제': 'bg-emerald-50 text-emerald-600',
  '이탈': 'bg-gray-100 text-gray-500',
};
const srcLeadDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }) : '-';

function SourceTable({
  rows,
  adminKey,
  from,
  to,
  onSelectStudent,
}: {
  rows: StatsBySource[];
  adminKey: string;
  from: string;
  to: string;
  onSelectStudent?: (id: string) => void;
}) {
  const maxLeads = Math.max(...rows.map((r) => r.leads), 1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, LeadDetailItem[]>>({});
  const [loadingSrc, setLoadingSrc] = useState<string | null>(null);

  // 기간이 바뀌면 캐시 무효화(펼친 항목 데이터가 기간과 어긋나지 않게)
  useEffect(() => {
    setCache({});
    setExpanded(null);
  }, [from, to]);

  async function toggle(source: string) {
    if (expanded === source) {
      setExpanded(null);
      return;
    }
    setExpanded(source);
    if (cache[source]) return;
    setLoadingSrc(source);
    try {
      const qs = new URLSearchParams({ metric: 'leads', from, to, source });
      const res = await fetch(`/api/crm/stats/detail?${qs.toString()}`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (res.ok && json.data?.kind === 'leads') {
        setCache((prev) => ({ ...prev, [source]: json.data.items as LeadDetailItem[] }));
      }
    } catch {
      /* 무시: 목록만 비어 보임 */
    } finally {
      setLoadingSrc(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 min-w-[140px]">
              유입 소스
            </th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">리드</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">컨택 성공</th>
            <th className="py-2 px-2 text-xs font-medium text-gray-400 min-w-[100px]">컨택률</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">결제</th>
            <th className="py-2 px-2 text-xs font-medium text-gray-400 min-w-[100px]">전환율</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400 whitespace-nowrap">평균 첫 응답</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">매출</th>
            <th className="text-right py-2 pl-2 text-xs font-medium text-gray-400">수익</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = expanded === r.source;
            const leads = cache[r.source];
            return (
              <Fragment key={r.source}>
                <tr
                  onClick={() => toggle(r.source)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(r.source);
                    }
                  }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer focus:outline-none focus:bg-gray-50"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      {isOpen ? <ChevronDown size={13} className="text-gray-300 shrink-0" /> : <ChevronRight size={13} className="text-gray-300 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-700 hover:underline truncate">{r.source}</p>
                        <RateBar value={r.leads} max={maxLeads} color="bg-gray-300" />
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.leads}</td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.contacted}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 w-9 text-right">
                        {r.contact_rate}%
                      </span>
                      <RateBar value={r.contact_rate} color="bg-gray-900" />
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.paid}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 w-9 text-right">
                        {r.conversion_rate}%
                      </span>
                      <RateBar value={r.conversion_rate} color="bg-gray-900" />
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-600 whitespace-nowrap tabular-nums">
                    {formatDuration(r.avg_first_response_seconds)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-600">
                    {r.revenue > 0 ? `${(r.revenue / 10000).toFixed(0)}만` : '-'}
                  </td>
                  <td className="text-right py-2.5 pl-2 text-xs font-medium text-gray-700">
                    {r.net_revenue > 0 ? `${(r.net_revenue / 10000).toFixed(0)}만` : '-'}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={9} className="px-2 py-3 bg-gray-50/40">
                      {loadingSrc === r.source && !leads ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-400">
                          <Loader2 size={14} className="animate-spin" /> 불러오는 중…
                        </div>
                      ) : leads && leads.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-gray-400 px-1 mb-1">리드 {leads.length}명</p>
                          {leads.map((s) => {
                            const st = leadStatus(s);
                            return (
                              <button
                                key={s.id}
                                onClick={() => onSelectStudent?.(s.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left"
                              >
                                <span className="font-medium text-blue-600 text-xs shrink-0">{s.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${SRC_STATUS_STYLE[st]}`}>{st}</span>
                                <span className="text-xs text-gray-400 tabular-nums ml-auto shrink-0">{srcLeadDate(s.date)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-4 text-center">이 소스의 리드가 없습니다.</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyTable({ rows }: { rows: StatsWeekly[] }) {
  const fmt만 = (n: number) => (n > 0 ? `${(n / 10000).toFixed(0)}만` : '-');
  const rate = (a: number, b: number) =>
    b > 0 ? `${(Math.round((a / b) * 10000) / 100).toFixed(2)}%` : '-';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 min-w-[160px]">
              주차
            </th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">리드</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">컨택 성공</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">컨택률</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">결제</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">전환율</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">매출</th>
            <th className="text-right py-2 pl-2 text-xs font-medium text-gray-400">수익</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.week} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-2.5 pr-4 text-xs font-medium text-gray-800">{r.week}</td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.leads || '-'}</td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.contacted || '-'}</td>
              <td className="text-right py-2.5 px-2 text-xs font-medium text-gray-700">
                {rate(r.contacted, r.leads)}
              </td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-700">{r.paid || '-'}</td>
              <td className="text-right py-2.5 px-2 text-xs font-medium text-gray-700">
                {rate(r.paid, r.leads)}
              </td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-600">{fmt만(r.revenue)}</td>
              <td className="text-right py-2.5 pl-2 text-xs font-medium text-gray-700">
                {fmt만(r.net_revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SalesStatsProps {
  adminKey: string;
  onSelectStudent?: (id: string) => void; // 상세 내역에서 학생 이름 클릭 시 상세 패널 열기
}

export function SalesStats({ adminKey, onSelectStudent }: SalesStatsProps) {
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CrmStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 월별 트렌드 그래프는 상단 기간 선택기와 독립적인 자체 기간을 갖는다(별도 fetch).
  const [allMonthly, setAllMonthly] = useState<StatsMonthly[]>([]);
  const [trendPreset, setTrendPreset] = useState<TrendPreset>('all');
  const [trendCustomFrom, setTrendCustomFrom] = useState('');
  const [trendCustomTo, setTrendCustomTo] = useState('');
  const [trendView, setTrendView] = useState<'monthly' | 'weekly'>('monthly');
  const [detail, setDetail] = useState<{ metric: StatsDetailMetric; label: string; source?: string } | null>(null);

  const { from, to } =
    preset === 'custom' ? { from: customFrom, to: customTo } : getPresetRange(preset);

  const fetchStats = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/stats?from=${from}&to=${to}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? '조회 실패');
        return;
      }
      setData(json.data as CrmStatsData);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [from, to, adminKey]);

  useEffect(() => {
    if (preset !== 'custom') fetchStats();
  }, [preset, fetchStats]);

  // 트렌드 그래프 기간(트렌드 전용 프리셋 또는 직접 입력, 상단 기간과 독립)
  const trendRange =
    trendPreset === 'custom'
      ? { from: trendCustomFrom, to: trendCustomTo }
      : getTrendRange(trendPreset);

  // 트렌드 그래프용 월별 데이터 로드. 커스텀은 from~to가 유효할 때만 조회.
  useEffect(() => {
    const { from: tf, to: tt } = trendRange;
    if (!tf || !tt || tf > tt) return;
    (async () => {
      try {
        const res = await fetch(`/api/crm/stats?from=${tf}&to=${tt}`, { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok && json.data) setAllMonthly((json.data as CrmStatsData).monthly);
      } catch { /* 무시: 그래프만 비어 보임 */ }
    })();
  }, [adminKey, trendRange.from, trendRange.to]);

  const d = data;
  // 카드 값: 한눈에 비교되도록 만원 단위로 축약. 정확한 원 단위 값은 title 툴팁으로 노출.
  const fmt만원 = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;
  const fmt원 = (n: number) => `${n.toLocaleString()}원`;

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
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
              onClick={fetchStats}
              disabled={!customFrom || !customTo}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg disabled:opacity-40"
            >
              조회
            </button>
          </div>
        )}

        {loading && <RefreshCw size={14} className="animate-spin text-gray-400 ml-1" />}
        {from && to && !loading && (
          <span className="text-xs text-gray-400 ml-1">
            {from} ~ {to}
          </span>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {d && (
        <>
          {/* Overview cards */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
            <OverviewCard
              icon={Users}
              label="신규 리드"
              value={d.overview.total_leads}
              sub="문의 기준 · B2B 포함"
              color="bg-gray-100 text-gray-600"
              onClick={() => setDetail({ metric: 'leads', label: '신규 리드' })}
            />
            <OverviewCard
              icon={Phone}
              label="컨택 성공률"
              value={`${d.overview.contact_rate}%`}
              sub={`${d.overview.contacted}명 / ${d.overview.contacted_base}명 · 2단계+ 도달`}
              color="bg-blue-50 text-blue-600"
              onClick={() => setDetail({ metric: 'contacted', label: '컨택 성공' })}
            />
            <OverviewCard
              icon={CreditCard}
              label="결제 전환율"
              value={`${d.overview.conversion_rate}%`}
              sub={`${d.overview.paid}명 / ${d.overview.contacted}명 · 컨택 성공`}
              color="bg-emerald-50 text-emerald-600"
              onClick={() => setDetail({ metric: 'paid', label: '결제 전환(결제 인원)' })}
            />
            <OverviewCard
              icon={TrendingUp}
              label="총 매출"
              value={fmt만원(d.overview.gross_revenue)}
              title={fmt원(d.overview.gross_revenue)}
              sub="환불 전 총 결제"
              color="bg-purple-50 text-purple-600"
              onClick={() => setDetail({ metric: 'revenue', label: '총 매출' })}
            />
            <OverviewCard
              icon={TrendingUp}
              label="환불"
              value={d.overview.total_refund < 0 ? `-${fmt만원(-d.overview.total_refund)}` : '-'}
              title={d.overview.total_refund < 0 ? `-${fmt원(-d.overview.total_refund)}` : undefined}
              sub="기간 내 환불 합계"
              color="bg-red-50 text-red-500"
              onClick={() => setDetail({ metric: 'refund', label: '환불' })}
            />
            <OverviewCard
              icon={TrendingUp}
              label="순매출"
              value={fmt만원(d.overview.total_revenue)}
              title={fmt원(d.overview.total_revenue)}
              sub="총매출 − 환불"
              color="bg-purple-50 text-purple-600"
              onClick={() => setDetail({ metric: 'net_revenue', label: '순매출' })}
            />
            <OverviewCard
              icon={TrendingUp}
              label="순 수익"
              value={fmt만원(d.overview.total_net_revenue)}
              title={fmt원(d.overview.total_net_revenue)}
              sub="환불·부가세 제외 실수익"
              color="bg-emerald-50 text-emerald-600"
              onClick={() => setDetail({ metric: 'net_profit', label: '순 수익' })}
            />
            {/* 결제 유형별 매출 (최초/재결제) */}
            <div className="flex-1 min-w-[130px] py-1">
              <p className="text-xs text-gray-400 mb-1.5">결제 유형별</p>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setDetail({ metric: 'first_payment', label: '최초결제' })}
                  className="w-full flex items-baseline justify-between gap-2 rounded-md px-1 -mx-1 py-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-colors"
                >
                  <span className="text-[11px] text-gray-400">최초결제</span>
                  <span title={fmt원(d.overview.first_payment_revenue)} className="text-base font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {fmt만원(d.overview.first_payment_revenue)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetail({ metric: 'repayment', label: '재결제' })}
                  className="w-full flex items-baseline justify-between gap-2 rounded-md px-1 -mx-1 py-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-colors"
                >
                  <span className="text-[11px] text-gray-400">재결제</span>
                  <span title={fmt원(d.overview.repayment_revenue)} className="text-base font-semibold text-gray-700 tabular-nums whitespace-nowrap">
                    {fmt만원(d.overview.repayment_revenue)}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">클릭하면 세부 내역 · 환불 전</p>
            </div>
          </div>

          {/* Monthly / Weekly trend */}
          <div className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500">
                {trendView === 'monthly'
                  ? `월별 추이 · ${
                      trendPreset === 'custom' && trendRange.from && trendRange.to
                        ? `${trendRange.from} ~ ${trendRange.to}`
                        : TREND_PRESETS.find((p) => p.key === trendPreset)?.label ?? '전체'
                    }`
                  : '주차별 추이'}
              </h3>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {(['monthly', 'weekly'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTrendView(v)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      trendView === v
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v === 'monthly' ? '월별' : '주차별'}
                  </button>
                ))}
              </div>
            </div>

            {/* 트렌드 그래프 전용 기간 선택 (월별 뷰에서만) */}
            {trendView === 'monthly' && (
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
            )}

            {trendView === 'monthly' ? (
              allMonthly.length > 0 ? (
                <SalesRevenueChart data={allMonthly} formatWon={fmt원} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">데이터가 없습니다.</p>
              )
            ) : d.weekly.length > 0 ? (
              <WeeklyTable rows={d.weekly} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">주차 데이터가 없습니다.</p>
            )}
          </div>

          {/* Source breakdown */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">유입 소스별 성과</h3>
            <p className="text-[11px] text-gray-400">소스를 클릭하면 해당 리드 명단을 볼 수 있습니다.</p>
            <p className="text-[11px] text-gray-400 mb-4">
              모든 지표(매출·수익 포함)는 이 기간에 <b>문의(인입)</b>한 리드 기준입니다.{' '}
              전 기간 인입 → 이번 기간 결제분은 상단 총매출엔 포함되지만 소스표에선 제외되어,{' '}
              <span className="text-gray-500">소스 매출 합이 상단 총매출과 다를 수 있습니다.</span>
            </p>
            {d.by_source.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">데이터가 없습니다.</p>
            ) : (
              <SourceTable
                rows={d.by_source}
                adminKey={adminKey}
                from={from}
                to={to}
                onSelectStudent={onSelectStudent}
              />
            )}
          </div>
        </>
      )}

      {!d && !loading && !error && (
        <div className="py-16 text-center text-sm text-gray-400">
          기간을 선택하면 통계가 표시됩니다.
        </div>
      )}

      {detail && (
        <StatsDetailModal
          adminKey={adminKey}
          metric={detail.metric}
          label={detail.label}
          source={detail.source}
          onSelectStudent={onSelectStudent}
          from={from}
          to={to}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
