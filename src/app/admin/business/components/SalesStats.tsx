'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Users, Phone, CreditCard, RefreshCw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// recharts는 통계 탭을 열 때만 필요 — 지연 로딩해 CRM 첫 진입 번들에서 제외한다.
const SalesRevenueChart = dynamic(() => import('./SalesRevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[320px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});
const TargetVsActualChart = dynamic(() => import('./TargetVsActualChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});
import type { CrmStatsData, StatsBySource, StatsWeekly, StatsMonthly } from '@/lib/crm-stats-service';
import type { StatsDetailMetric, LeadDetailItem } from '@/lib/crm-stats-detail';
// CRM 통계 공용 컴포넌트 — StrategyStats/B2bStats도 함께 쓰므로 CRM에 그대로 둔다.
import { StatsDetailModal, leadStatus, type LeadDisplayStatus } from '../../crm/components/StatsDetailModal';
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
} from '../../crm/components/stats-primitives';
import type { CrmStatsSegment } from '@/lib/crm-stats-core';
import { buildSixMonthWindow, type MonthlyTargetRow } from '@/lib/business-targets';
import { GlobalSalesPanel } from './GlobalSalesPanel';
import { MonthlyTargetEditor } from './MonthlyTargetEditor';
import { TotalOverviewPanel } from './TotalOverviewPanel';

// 2단 위계: 전체(한국비즈니스+글로벌 합산) / 한국비즈니스(구 B2C+B2B) / 글로벌.
// "한국비즈니스"를 고르면 그 아래 [합산|B2C|B2B] 보조 탭이 나타난다.
// CrmStatsSegment 자체는 확장하지 않는다 — 서버 집계 로직(company_id 기반)과 결합돼 있어
// 무관한 'global'을 끼워 넣으면 API·타입 양쪽에 불필요한 위험이 생긴다.
type TopView = 'total' | 'tutoring' | 'global';
const TOP_TABS: { key: TopView; label: string }[] = [
  { key: 'total', label: '전체' },
  { key: 'global', label: '글로벌 사업' },
  { key: 'tutoring', label: '한국 사업' },
];
const TUTORING_SUB_TABS: { key: CrmStatsSegment; label: string }[] = [
  { key: 'all', label: '합산' },
  { key: 'b2c', label: 'B2C' },
  { key: 'b2b', label: 'B2B' },
];

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
  segment,
  onSelectStudent,
}: {
  rows: StatsBySource[];
  adminKey: string;
  from: string;
  to: string;
  segment: CrmStatsSegment;
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
      const qs = new URLSearchParams({ metric: 'leads', from, to, source, segment });
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
  const [topView, setTopView] = useState<TopView>('total');
  const [tutoringSub, setTutoringSub] = useState<CrmStatsSegment>('all');
  const segment: CrmStatsSegment = tutoringSub;
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
  // 전체(B2C+B2B) 탭 전용 — 월별 목표 대비 실적. 다른 세그먼트에는 결합 목표가 없어 노출하지 않는다.
  const [monthlyMode, setMonthlyMode] = useState<'target' | 'trend'>('target');
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetRow[]>([]);
  const [firstTargets, setFirstTargets] = useState<MonthlyTargetRow[]>([]);
  const [reTargets, setReTargets] = useState<MonthlyTargetRow[]>([]);
  const [renewalConvRate, setRenewalConvRate] = useState<number | null>(null);
  const [renewalCounts, setRenewalCounts] = useState<{ completed: number; selected: number } | null>(null);

  const { from, to } =
    preset === 'custom' ? { from: customFrom, to: customTo } : getPresetRange(preset);

  const fetchStats = useCallback(async () => {
    if (topView !== 'tutoring' || !from || !to || from > to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/stats?from=${from}&to=${to}&segment=${segment}`, {
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
  }, [topView, from, to, segment, adminKey]);

  useEffect(() => {
    if (preset !== 'custom') fetchStats();
  }, [preset, fetchStats]);

  // 직접 입력 모드에서도 세그먼트 변경 시에는 즉시 재조회한다.
  useEffect(() => {
    if (preset === 'custom') fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  // 트렌드 그래프 기간(트렌드 전용 프리셋 또는 직접 입력, 상단 기간과 독립)
  const trendRange =
    trendPreset === 'custom'
      ? { from: trendCustomFrom, to: trendCustomTo }
      : getTrendRange(trendPreset);

  // 트렌드 그래프용 월별 데이터 로드. 커스텀은 from~to가 유효할 때만 조회.
  useEffect(() => {
    if (topView !== 'tutoring') return;
    const { from: tf, to: tt } = trendRange;
    if (!tf || !tt || tf > tt) return;
    (async () => {
      try {
        const res = await fetch(`/api/crm/stats?from=${tf}&to=${tt}&segment=${segment}`, { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok && json.data) setAllMonthly((json.data as CrmStatsData).monthly);
      } catch { /* 무시: 그래프만 비어 보임 */ }
    })();
    // trendRange는 from/to 외 프로퍼티가 없고 매 렌더링 재생성되므로 from/to만 의존한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topView, adminKey, trendRange.from, trendRange.to, segment]);

  // 한국 사업 '합산' 탭의 월별 목표 — 합산·최초결제·재결제 세 payment_type을 모두 조회한다.
  const fetchMonthlyTargets = useCallback(async () => {
    if (topView !== 'tutoring' || tutoringSub !== 'all') return;
    try {
      const headers = { 'x-admin-key': adminKey };
      const [allRes, firstRes, reRes] = await Promise.all([
        fetch('/api/business/monthly-targets?segment=tutoring&payment_type=all', { headers }),
        fetch('/api/business/monthly-targets?segment=tutoring&payment_type=first', { headers }),
        fetch('/api/business/monthly-targets?segment=tutoring&payment_type=re', { headers }),
      ]);
      const [allJson, firstJson, reJson] = await Promise.all([allRes.json(), firstRes.json(), reRes.json()]);
      if (allRes.ok) setMonthlyTargets(allJson.data ?? []);
      if (firstRes.ok) setFirstTargets(firstJson.data ?? []);
      if (reRes.ok) setReTargets(reJson.data ?? []);
    } catch { /* 무시: 목표 비교만 비어 보임 */ }
  }, [topView, tutoringSub, adminKey]);

  useEffect(() => { fetchMonthlyTargets(); }, [fetchMonthlyTargets]);

  // 재결제 전환율 — renewal_targets 주차 집계를 기간에 맞게 필터링
  useEffect(() => {
    if (topView !== 'tutoring' || !from || !to) { setRenewalConvRate(null); setRenewalCounts(null); return; }
    (async () => {
      try {
        const res = await fetch('/api/crm/renewal-targets/stats?weeks=52', { headers: { 'x-admin-key': adminKey } });
        if (!res.ok) return;
        const json = await res.json();
        const weeks = (json.data ?? []) as { week_start: string; completed: number; selected: number }[];
        const filtered = weeks.filter((w) => w.week_start >= from && w.week_start <= to);
        const totalSelected = filtered.reduce((s, w) => s + w.selected, 0);
        const totalCompleted = filtered.reduce((s, w) => s + w.completed, 0);
        if (totalSelected === 0) { setRenewalConvRate(null); setRenewalCounts(null); return; }
        setRenewalConvRate(Math.round((totalCompleted / totalSelected) * 1000) / 10);
        setRenewalCounts({ completed: totalCompleted, selected: totalSelected });
      } catch { /* 무시: 카드만 '-' 표시 */ }
    })();
  }, [topView, from, to, adminKey]);

  // allMonthly의 net_revenue(순매출)를 월별 실적으로 쓴다 — 목표 대비 비교는 순매출 기준.
  const actualByMonth = Object.fromEntries(allMonthly.map((m) => [m.month, m.net_revenue]));
  const targetVsActual = buildSixMonthWindow(monthlyTargets, actualByMonth);

  const d = data;

  // 단일 월 선택 시 해당 월의 payment_type별 달성률 계산
  const isSingleMonth = from && to && from.slice(0, 7) === to.slice(0, 7);
  const currentMonthKey = from ? from.slice(0, 7) : '';
  const firstTarget = firstTargets.find((t) => t.month.slice(0, 7) === currentMonthKey);
  const reTarget = reTargets.find((t) => t.month.slice(0, 7) === currentMonthKey);

  function achievementRate(actual: number, target: number | undefined): number | null {
    if (!target || target <= 0) return null;
    return Math.round((actual / target) * 100);
  }

  function rateColor(rate: number): string {
    if (rate >= 100) return 'text-emerald-600 bg-emerald-50';
    if (rate >= 80) return 'text-blue-600 bg-blue-50';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  }

  const segmentSub: Record<CrmStatsSegment, string> = {
    all: '문의 기준 · B2C+B2B',
    b2c: '문의 기준 · B2C',
    b2b: '문의 기준 · B2B',
  };
  // 카드 값: 한눈에 비교되도록 만원 단위로 축약. 정확한 원 단위 값은 title 툴팁으로 노출.
  const fmt만원 = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;
  const fmt원 = (n: number) => `${n.toLocaleString()}원`;

  return (
    <div className="space-y-6">
      {/* Period picker (한국비즈니스 탭에서만 — 전체·글로벌은 자체 기간 개념) */}
      <div className="flex flex-wrap items-center gap-2">
        {topView === 'tutoring' && (
          <>
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
          </>
        )}

        <div className="ml-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {TOP_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTopView(key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  topView === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {topView === 'tutoring' && (
            <div
              data-testid="stats-segment-tabs"
              className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-0.5"
            >
              {TUTORING_SUB_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTutoringSub(key)}
                  className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                    tutoringSub === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {topView === 'total' && <TotalOverviewPanel adminKey={adminKey} />}

      {topView === 'global' && <GlobalSalesPanel adminKey={adminKey} />}

      {topView === 'tutoring' && error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {topView === 'tutoring' && d && (
        <>
          {/* Overview cards */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
            <OverviewCard
              icon={Users}
              label="신규 리드"
              value={d.overview.total_leads}
              sub={segmentSub[segment]}
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
              label="최초결제 전환율"
              value={`${d.overview.conversion_rate}%`}
              sub={`${d.overview.paid}명 / ${d.overview.contacted}명 · 컨택 성공`}
              color="bg-emerald-50 text-emerald-600"
              onClick={() => setDetail({ metric: 'paid', label: '결제 전환(결제 인원)' })}
            />
            <OverviewCard
              icon={CreditCard}
              label="재결제 전환율"
              value={renewalConvRate !== null ? `${renewalConvRate}%` : '-'}
              sub={renewalCounts ? `${renewalCounts.completed}명 / ${renewalCounts.selected}명 · 재결제 선정` : '기간 내 재결제 선정 없음'}
              color="bg-teal-50 text-teal-600"
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
            {/* 순매출 + 결제 유형별 구성 — 순매출 카드 바로 아래에 표시 */}
            <div className="flex flex-col gap-2">
              <OverviewCard
                icon={TrendingUp}
                label="순매출"
                value={fmt만원(d.overview.total_revenue)}
                title={fmt원(d.overview.total_revenue)}
                sub="총매출 − 환불"
                color="bg-purple-50 text-purple-600"
                onClick={() => setDetail({ metric: 'net_revenue', label: '순매출' })}
              />
              {/* 결제 유형별 구성 — 순매출의 세부 내역 */}
              <div className="pl-2 border-l-2 border-purple-100 space-y-1.5">
                {(() => {
                  const netFirst = d.overview.net_first_payment_revenue;
                  const netRe = d.overview.net_repayment_revenue;
                  const netTotal = d.overview.total_revenue;
                  const firstPct = netTotal > 0 ? Math.round((netFirst / netTotal) * 100) : 0;
                  const rePct = netTotal > 0 ? Math.round((netRe / netTotal) * 100) : 0;
                  const unattributed = d.overview.unattributed_refund; // 귀속 불가 환불(음수)

                  return (
                    <>
                      {/* 최초결제 */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setDetail({ metric: 'first_payment', label: '최초결제' })}
                          className="w-full flex items-baseline justify-between gap-2 rounded-md py-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400">최초결제</span>
                            <span className="text-[10px] text-gray-300 tabular-nums">{firstPct}%</span>
                          </span>
                          <span title={fmt원(netFirst)} className="text-sm font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                            {fmt만원(netFirst)}
                          </span>
                        </button>
                        {isSingleMonth && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {(() => {
                              const rate = achievementRate(netFirst, firstTarget?.target_amount);
                              if (rate === null) return <span className="text-[10px] text-gray-300">목표 미설정</span>;
                              return (
                                <>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rateColor(rate)}`}>{rate}% 달성</span>
                                  <span className="text-[10px] text-gray-400">/ 목표 {fmt만원(firstTarget!.target_amount)}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {/* 재결제 */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setDetail({ metric: 'repayment', label: '재결제' })}
                          className="w-full flex items-baseline justify-between gap-2 rounded-md py-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400">재결제</span>
                            <span className="text-[10px] text-gray-300 tabular-nums">{rePct}%</span>
                          </span>
                          <span title={fmt원(netRe)} className="text-sm font-semibold text-gray-600 tabular-nums whitespace-nowrap">
                            {fmt만원(netRe)}
                          </span>
                        </button>
                        {isSingleMonth && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {(() => {
                              const rate = achievementRate(netRe, reTarget?.target_amount);
                              if (rate === null) return <span className="text-[10px] text-gray-300">목표 미설정</span>;
                              return (
                                <>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rateColor(rate)}`}>{rate}% 달성</span>
                                  <span className="text-[10px] text-gray-400">/ 목표 {fmt만원(reTarget!.target_amount)}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {/* 미귀속 환불 (직전 결제 없어 유형 특정 불가) */}
                      {unattributed < 0 && (
                        <div className="flex items-baseline justify-between pt-1 border-t border-gray-50">
                          <span className="text-[11px] text-gray-300">미귀속 환불</span>
                          <span className="text-[11px] text-red-400 tabular-nums">−{fmt만원(-unattributed)}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-300">클릭하면 세부 내역</p>
                    </>
                  );
                })()}
              </div>
            </div>
            <OverviewCard
              icon={TrendingUp}
              label="순 수익"
              value={fmt만원(d.overview.total_net_revenue)}
              title={fmt원(d.overview.total_net_revenue)}
              sub="환불·부가세 제외 실수익"
              color="bg-emerald-50 text-emerald-600"
              onClick={() => setDetail({ metric: 'net_profit', label: '순 수익' })}
            />
          </div>

          {/* Monthly target-vs-actual (전체 탭 기본) / 기존 월별·주차별 추이 */}
          <div className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500">
                {tutoringSub === 'all' && monthlyMode === 'target'
                  ? '월별 목표 대비 실적'
                  : trendView === 'monthly'
                  ? `월별 추이 · ${
                      trendPreset === 'custom' && trendRange.from && trendRange.to
                        ? `${trendRange.from} ~ ${trendRange.to}`
                        : TREND_PRESETS.find((p) => p.key === trendPreset)?.label ?? '전체'
                    }`
                  : '주차별 추이'}
              </h3>
              <div className="flex items-center gap-3">
                {tutoringSub === 'all' && (
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    {(['target', 'trend'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonthlyMode(m)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          monthlyMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {m === 'target' ? '목표 비교' : '추이 보기'}
                      </button>
                    ))}
                  </div>
                )}
                {!(tutoringSub === 'all' && monthlyMode === 'target') && (
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
                )}
              </div>
            </div>

            {tutoringSub === 'all' && monthlyMode === 'target' ? (
              <>
                <div className="flex justify-end mb-2">
                  <MonthlyTargetEditor segment="tutoring" adminKey={adminKey} onSaved={fetchMonthlyTargets} />
                </div>
                {targetVsActual.some((r) => r.target > 0 || r.actual > 0) ? (
                  <TargetVsActualChart data={targetVsActual} formatValue={fmt만원} />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">
                    설정된 목표가 없습니다. ‘목표 설정’으로 이번 달부터 등록해보세요.
                  </p>
                )}
              </>
            ) : (
              <>
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
              </>
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
                segment={segment}
                onSelectStudent={onSelectStudent}
              />
            )}
          </div>
        </>
      )}

      {topView === 'tutoring' && !d && !loading && !error && (
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
          extraParams={{ segment }}
          onSelectStudent={onSelectStudent}
          from={from}
          to={to}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
