'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { StrategyHistoryType } from '@/types/crm';
import type { StatsDetailMetric, LeadDetailItem, StatsDetailResult } from '@/lib/crm-stats-detail';
import type { StrategyTypeStats, PerStrategyRow } from '@/lib/strategy-stats';
import {
  type Preset,
  getPresetRange,
  PRESETS,
  OverviewCard,
  RateBar,
} from './stats-primitives';
import { StatsDetailModal } from './StatsDetailModal';
import { LeadDetailTable } from './LeadDetailTable';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  // 배정 많은 전략부터 — 배정 0 전략은 뒤로.
  const rows = [...(data?.by_strategy ?? [])].sort((a, b) => b.assigned - a.assigned);

  // 선택 동기화: 목록이 바뀌면 유효한 선택을 유지하고, 없으면 첫 배정 전략(없으면 첫 전략)을 고른다.
  useEffect(() => {
    if (rows.length === 0) { setSelectedId(null); return; }
    setSelectedId((cur) => {
      if (cur && rows.some((r) => r.strategy_id === cur)) return cur;
      return (rows.find((r) => r.assigned > 0) ?? rows[0]).strategy_id;
    });
    // rows는 매 렌더 새 배열이라 식별키로 의존성 고정.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => r.strategy_id).join(','), rows.length]);

  const selected = rows.find((r) => r.strategy_id === selectedId) ?? null;

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

      {!loading && !error && rows.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-400">해당 기간에 배정된 전략이 없습니다.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* 좌: 전략 목록 */}
          <div className="md:w-64 md:shrink-0 space-y-1.5">
            {rows.map((r) => (
              <StrategyListItem
                key={r.strategy_id}
                row={r}
                active={r.strategy_id === selectedId}
                onClick={() => setSelectedId(r.strategy_id)}
              />
            ))}
          </div>

          {/* 우: 선택 전략 상세 */}
          <div className="flex-1 min-w-0">
            {selected ? (
              <StrategyDetailPane
                key={`${selected.strategy_id}:${type}:${range.from}:${range.to}`}
                row={selected}
                adminKey={adminKey}
                type={type}
                from={range.from}
                to={range.to}
                segment={segment}
                onMetric={(metric, label) => setDetail({ strategyId: selected.strategy_id, strategyName: selected.strategy_name, metric, label })}
                onSelectStudent={onSelectStudent}
              />
            ) : (
              <p className="py-16 text-center text-sm text-gray-400">전략을 선택하세요.</p>
            )}
          </div>
        </div>
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

function StrategyListItem({
  row,
  active,
  onClick,
}: {
  row: PerStrategyRow;
  active: boolean;
  onClick: () => void;
}) {
  const zero = row.assigned === 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
        active
          ? 'border-gray-900 bg-gray-900/[0.03] ring-1 ring-gray-900'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <p className={`text-sm font-semibold truncate ${zero ? 'text-gray-400' : 'text-gray-900'}`}>
        {row.strategy_name}
      </p>
      {zero ? (
        <p className="mt-0.5 text-[11px] text-gray-400">이 기간 배정 없음</p>
      ) : (
        <p className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
          전환율 {row.conversion_rate}% · 결제 {row.paid} · 배정 {row.assigned}
        </p>
      )}
    </button>
  );
}

function StrategyDetailPane({
  row,
  adminKey,
  type,
  from,
  to,
  segment,
  onMetric,
  onSelectStudent,
}: {
  row: PerStrategyRow;
  adminKey: string;
  type: StrategyHistoryType;
  from: string;
  to: string;
  segment?: 'b2b' | 'b2c';
  onMetric: (metric: StatsDetailMetric, label: string) => void;
  onSelectStudent?: (id: string) => void;
}) {
  const [leads, setLeads] = useState<LeadDetailItem[] | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState('');

  useEffect(() => {
    if (row.assigned === 0) { setLeads([]); return; }
    let cancelled = false;
    (async () => {
      setLeadsLoading(true);
      setLeadsError('');
      try {
        const qs = new URLSearchParams({ metric: 'leads', type, strategy_id: row.strategy_id, from, to });
        if (segment) qs.set('segment', segment);
        const res = await fetch(`/api/crm/strategy-stats/detail?${qs.toString()}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.data && (json.data as StatsDetailResult).kind === 'leads') {
          setLeads((json.data as StatsDetailResult).items as LeadDetailItem[]);
        } else {
          setLeadsError(json.error?.message ?? json.error ?? '리드를 불러오지 못했습니다.');
        }
      } catch {
        if (!cancelled) setLeadsError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLeadsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row.strategy_id, row.assigned, type, from, to, segment, adminKey]);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-gray-900">{row.strategy_name}</span>
          {row.touched > row.assigned && (
            <span className="ml-1.5 text-[10px] text-gray-400">(touched {row.touched})</span>
          )}
        </div>
      </div>

      {/* 지표 */}
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <OverviewCard label="배정 리드" value={row.assigned} />
        <OverviewCard
          label="컨택"
          value={row.contacted}
          sub={`컨택률 ${row.contact_rate}%`}
          onClick={row.contacted > 0 ? () => onMetric('contacted', '컨택 리드') : undefined}
        />
        <OverviewCard
          label="결제"
          value={row.paid}
          sub={`전환율 ${row.conversion_rate}%`}
          onClick={row.paid > 0 ? () => onMetric('paid', '결제 리드') : undefined}
        />
        <OverviewCard
          label="매출"
          value={`${manwon(row.revenue)}원`}
          title={won(row.revenue)}
          sub={`실수익 ${manwon(row.net_revenue)}원`}
          onClick={row.revenue !== 0 ? () => onMetric('revenue', '매출') : undefined}
        />
        <OverviewCard
          label="평균 전환일"
          value={row.avg_days_to_convert == null ? '-' : `${row.avg_days_to_convert}일`}
        />
      </div>

      {/* 결제 전환율 바 */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-gray-400 w-16 shrink-0">결제 전환율</span>
        <RateBar value={row.conversion_rate} color="bg-gray-900" />
        <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">{row.conversion_rate}%</span>
      </div>

      {/* 진행된 리드 목록 */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 mb-3">배정 리드 {row.assigned}명</p>
        {leadsLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중…
          </div>
        )}
        {!leadsLoading && leadsError && <p className="py-6 text-center text-sm text-red-500">{leadsError}</p>}
        {!leadsLoading && !leadsError && leads && leads.length > 0 && (
          <LeadDetailTable items={leads} onSelectStudent={onSelectStudent} />
        )}
        {!leadsLoading && !leadsError && leads && leads.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">리드가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
