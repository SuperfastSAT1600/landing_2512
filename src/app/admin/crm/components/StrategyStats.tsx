'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// recharts는 전략 비교 차트에서만 필요 — 지연 로딩해 첫 진입 번들에서 제외한다.
const StrategyCompareChart = dynamic(() => import('./StrategyCompareChart'), {
  ssr: false,
  loading: () => <div className="h-[220px] flex items-center justify-center text-sm text-gray-300">차트 로딩…</div>,
});
import type { StrategyHistoryType } from '@/types/crm';
import type { StatsDetailMetric } from '@/lib/crm-stats-detail';
import type { StrategyTypeStats, PerStrategyRow } from '@/lib/strategy-stats';
import {
  type Preset,
  getPresetRange,
  PRESETS,
  OverviewCard,
  RateBar,
} from './stats-primitives';
import { StatsDetailModal } from './StatsDetailModal';

const TYPE_TABS: { key: StrategyHistoryType; label: string }[] = [
  { key: 'initial_contact', label: '최초 컨텍' },
  { key: 'initial_sales', label: '최초 세일즈' },
  { key: 'retry', label: '재시도' },
];

const won = (n: number) => `${n.toLocaleString()}원`;
const manwon = (n: number) => (n === 0 ? '0' : `${Math.round(n / 10000).toLocaleString()}만`);

interface Props {
  adminKey: string;
  segment?: 'b2b' | 'b2c'; // 있으면 해당 세그먼트 코호트만 집계
  onSelectStudent?: (id: string) => void;
}

interface DetailTarget {
  strategyId: string;
  strategyName: string;
  metric: StatsDetailMetric;
  label: string;
}

export function StrategyStats({ adminKey, segment, onSelectStudent }: Props) {
  const [type, setType] = useState<StrategyHistoryType>('initial_sales');
  const [preset, setPreset] = useState<Preset>('last_6m');
  const [range, setRange] = useState(() => getPresetRange('last_6m'));
  const [data, setData] = useState<StrategyTypeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(getPresetRange(p));
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ type, from: range.from, to: range.to });
      if (segment) qs.set('segment', segment);
      const res = await fetch(`/api/crm/strategy-stats?${qs.toString()}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok && json.data) setData(json.data as StrategyTypeStats);
      else setError(json.error ?? '조회에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [type, range.from, range.to, segment, adminKey]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const rollup = data?.rollup;
  const rows = data?.by_strategy ?? [];
  const chartData = rows
    .filter((r) => r.assigned > 0)
    .map((r) => ({ name: r.strategy_name.length > 12 ? r.strategy_name.slice(0, 12) + '…' : r.strategy_name, 전환율: r.conversion_rate, 배정: r.assigned }));

  return (
    <div className="space-y-5">
      {/* 타입 탭 + 기간 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                type === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                preset === p.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <span className="flex items-center gap-1">
              <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="text-xs border border-gray-200 rounded-md px-1.5 py-1" />
              <span className="text-gray-300">~</span>
              <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="text-xs border border-gray-200 rounded-md px-1.5 py-1" />
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        기준: 전략 적용일(applied_at) · {range.from} ~ {range.to} · 전환율 = 결제/컨택
      </p>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> 불러오는 중…
        </div>
      )}
      {!loading && error && <p className="py-16 text-center text-sm text-red-500">{error}</p>}

      {!loading && !error && rollup && (
        <>
          {/* 타입 롤업 카드 */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
            <OverviewCard label="배정 리드" value={rollup.assigned} />
            <OverviewCard label="컨택률" value={`${rollup.contact_rate}%`} sub={`${rollup.contacted}명 컨택`} />
            <OverviewCard label="결제 전환율" value={`${rollup.conversion_rate}%`} sub={`${rollup.paid}명 결제`} />
            <OverviewCard label="매출" value={`${manwon(rollup.revenue)}원`} title={won(rollup.revenue)} sub={`실수익 ${manwon(rollup.net_revenue)}원`} />
          </div>

          {/* 전략 비교 차트 */}
          {chartData.length > 1 && (
            <div className="border-b border-gray-100 pb-6">
              <p className="text-xs font-semibold text-gray-400 mb-3">전략별 비교</p>
              <StrategyCompareChart data={chartData} />
            </div>
          )}

          {/* 전략별 테이블 */}
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-400">
                    <th className="text-left py-2.5 px-2 font-medium min-w-[180px]">전략</th>
                    <th className="text-right py-2.5 px-2 font-medium">배정</th>
                    <th className="text-right py-2.5 px-2 font-medium">컨택</th>
                    <th className="py-2.5 px-2 font-medium min-w-[90px]">전환율</th>
                    <th className="text-right py-2.5 px-2 font-medium">결제</th>
                    <th className="text-right py-2.5 px-2 font-medium">매출</th>
                    <th className="text-right py-2.5 px-2 font-medium">평균 전환일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <StrategyRow
                      key={r.strategy_id}
                      row={r}
                      onMetric={(metric, label) => setDetail({ strategyId: r.strategy_id, strategyName: r.strategy_name, metric, label })}
                    />
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">해당 기간에 배정된 전략이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detail && (
        <StatsDetailModal
          adminKey={adminKey}
          metric={detail.metric}
          label={`${detail.strategyName} · ${detail.label}`}
          from={range.from}
          to={range.to}
          endpoint="/api/crm/strategy-stats/detail"
          extraParams={{ type, strategy_id: detail.strategyId, ...(segment ? { segment } : {}) }}
          onSelectStudent={onSelectStudent}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function StrategyRow({
  row,
  onMetric,
}: {
  row: PerStrategyRow;
  onMetric: (metric: StatsDetailMetric, label: string) => void;
}) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-2.5 px-2 font-medium text-gray-800">
        {row.strategy_name}
        {row.touched > row.assigned && (
          <span className="ml-1.5 text-[10px] text-gray-400">(touched {row.touched})</span>
        )}
      </td>
      <td className="text-right py-2.5 px-2 tabular-nums">
        <button onClick={() => onMetric('leads', '배정 리드')} className="text-blue-600 hover:underline disabled:text-gray-700 disabled:no-underline" disabled={row.assigned === 0}>{row.assigned}</button>
      </td>
      <td className="text-right py-2.5 px-2 tabular-nums">
        <button onClick={() => onMetric('contacted', '컨택 리드')} className="text-blue-600 hover:underline disabled:text-gray-700 disabled:no-underline" disabled={row.contacted === 0}>{row.contacted}</button>
      </td>
      <td className="py-2.5 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">{row.conversion_rate}%</span>
          <RateBar value={row.conversion_rate} color="bg-gray-900" />
        </div>
      </td>
      <td className="text-right py-2.5 px-2 tabular-nums">
        <button onClick={() => onMetric('paid', '결제 리드')} className="text-blue-600 hover:underline disabled:text-gray-700 disabled:no-underline" disabled={row.paid === 0}>{row.paid}</button>
      </td>
      <td className="text-right py-2.5 px-2 tabular-nums text-gray-700">
        <button onClick={() => onMetric('revenue', '매출')} className="hover:underline disabled:no-underline" disabled={row.revenue === 0} title={won(row.revenue)}>{manwon(row.revenue)}</button>
      </td>
      <td className="text-right py-2.5 px-2 tabular-nums text-gray-500">{row.avg_days_to_convert == null ? '-' : `${row.avg_days_to_convert}일`}</td>
    </tr>
  );
}
