'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { B2bStatsData, B2bCompanyStats } from '@/app/api/crm/b2b/stats/route';
import {
  type Preset,
  getPresetRange,
  PRESETS,
  OverviewCard,
  RateBar,
} from '../stats-primitives';

const won = (n: number) => `${n.toLocaleString()}원`;
const manwon = (n: number) => (n === 0 ? '0' : `${Math.round(n / 10000).toLocaleString()}만`);

interface Props {
  adminKey: string;
}

export function B2bStats({ adminKey }: Props) {
  const [preset, setPreset] = useState<Preset>('last_6m');
  const [range, setRange] = useState(() => getPresetRange('last_6m'));
  const [data, setData] = useState<B2bStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(getPresetRange(p));
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from: range.from, to: range.to });
      const res = await fetch(`/api/crm/b2b/stats?${qs.toString()}`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (res.ok && json.data) setData(json.data as B2bStatsData);
      else setError(json.error ?? '조회에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, adminKey]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const o = data?.overview;
  const rows = data?.by_company ?? [];
  const chartData = rows.filter((r) => r.leads > 0).slice(0, 10).map((r) => ({
    name: r.company_name.length > 8 ? r.company_name.slice(0, 8) + '…' : r.company_name,
    리드: r.leads,
    결제: r.paid,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => applyPreset(p.key)} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${preset === p.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
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

      {loading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>}
      {!loading && error && <p className="py-16 text-center text-sm text-red-500">{error}</p>}

      {!loading && !error && o && (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
            <OverviewCard label="활성 업체" value={o.companies_active} sub={`${o.companies_with_leads}개 리드 보유`} />
            <OverviewCard label="소개 리드" value={o.total_leads} sub={`컨택 ${o.contact_rate}%`} />
            <OverviewCard label="결제 전환율" value={`${o.conversion_rate}%`} sub={`${o.paid}명 결제`} />
            <OverviewCard label="매출" value={`${manwon(o.total_revenue)}원`} title={won(o.total_revenue)} sub={`실수익 ${manwon(o.total_net_revenue)}원`} />
          </div>

          {chartData.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-3">업체별 리드·결제</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="리드" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="결제" fill="#34d399" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-400">
                    <th className="text-left py-2.5 px-2 font-medium min-w-[160px]">업체</th>
                    <th className="text-right py-2.5 px-2 font-medium">리드</th>
                    <th className="text-right py-2.5 px-2 font-medium">컨택</th>
                    <th className="py-2.5 px-2 font-medium min-w-[90px]">전환율</th>
                    <th className="text-right py-2.5 px-2 font-medium">결제</th>
                    <th className="text-right py-2.5 px-2 font-medium">매출</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <CompanyRow key={r.company_id} row={r} expanded={expanded === r.company_id} onToggle={() => setExpanded((e) => (e === r.company_id ? null : r.company_id))} />
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">업체가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CompanyRow({ row, expanded, onToggle }: { row: B2bCompanyStats; expanded: boolean; onToggle: () => void }) {
  const dim = row.leads === 0 && !row.is_active;
  return (
    <>
      <tr className={`border-b border-gray-50 hover:bg-gray-50/50 ${dim ? 'opacity-40' : ''}`}>
        <td className="py-2.5 px-2">
          <button onClick={onToggle} className="flex items-center gap-1.5 text-left font-medium text-gray-800 hover:text-blue-600">
            {expanded ? <ChevronDown size={14} className="text-gray-300" /> : <ChevronRight size={14} className="text-gray-300" />}
            {row.company_name}
            {!row.is_active && <span className="text-[10px] text-gray-400">(비활성)</span>}
          </button>
        </td>
        <td className="text-right py-2.5 px-2 tabular-nums">{row.leads}</td>
        <td className="text-right py-2.5 px-2 tabular-nums text-gray-500">{row.contacted}</td>
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">{row.conversion_rate}%</span>
            <RateBar value={row.conversion_rate} color="bg-gray-900" />
          </div>
        </td>
        <td className="text-right py-2.5 px-2 tabular-nums">{row.paid}</td>
        <td className="text-right py-2.5 px-2 tabular-nums text-gray-700" title={won(row.revenue)}>{manwon(row.revenue)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-2 py-3">
            {row.trend.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={row.trend} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="leads" name="리드" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="paid" name="결제" fill="#34d399" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">기간 내 데이터 없음</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
