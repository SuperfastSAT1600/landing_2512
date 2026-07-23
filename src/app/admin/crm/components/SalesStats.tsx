'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Phone, CreditCard, RefreshCw } from 'lucide-react';
import type { CrmStatsData, StatsBySource, StatsWeekly } from '@/app/api/crm/stats/route';
import type { StatsDetailMetric } from '@/lib/crm-stats-detail';
import { StatsDetailModal } from './StatsDetailModal';
import {
  type Preset,
  getPresetRange,
  PRESETS,
  OverviewCard,
  RateBar,
  formatDuration,
} from './stats-primitives';

// ─── Sub-components ────────────────────────────────────────────────────────────

function SourceTable({
  rows,
  onSelect,
}: {
  rows: StatsBySource[];
  onSelect: (source: string) => void;
}) {
  const maxLeads = Math.max(...rows.map((r) => r.leads), 1);

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
          {rows.map((r) => (
            <tr
              key={r.source}
              onClick={() => onSelect(r.source)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(r.source);
                }
              }}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer focus:outline-none focus:bg-gray-50"
            >
              <td className="py-2.5 pr-4">
                <div>
                  <p className="text-xs font-medium text-blue-700 hover:underline">{r.source}</p>
                  <RateBar value={r.leads} max={maxLeads} color="bg-gray-300" />
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
          ))}
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
              sub="문의 기준"
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
                {trendView === 'monthly' ? '월별 추이' : '주차별 추이'}
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

            {trendView === 'monthly' ? (
              d.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.monthly} barGap={2}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend
                      formatter={(v: string) =>
                        ({ leads: '리드', contacted: '컨택 성공', paid: '결제' })[v] ?? v
                      }
                    />
                    <Bar dataKey="leads" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="contacted" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="paid" fill="#34d399" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                onSelect={(source) =>
                  setDetail({ metric: 'leads', label: `${source} 리드`, source })
                }
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
