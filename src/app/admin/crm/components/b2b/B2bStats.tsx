'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
const kstDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }) : '-';

interface Props {
  adminKey: string;
  onSelectStudentById: (id: string) => void;
}

export function B2bStats({ adminKey, onSelectStudentById }: Props) {
  const [preset, setPreset] = useState<Preset>('all');
  const [range, setRange] = useState(() => getPresetRange('all'));
  const [data, setData] = useState<B2bStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  // 트렌드 차트 업체 필터(다중 선택). 비어있으면 전체 업체 합산.
  const [trendCompanies, setTrendCompanies] = useState<Set<string>>(new Set());
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) setCompanyMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [companyMenuOpen]);

  const toggleTrendCompany = (id: string) =>
    setTrendCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

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
  // 업체별 월 트렌드를 월별로 합산 → 매출·리드·결제 시계열. 선택 업체가 있으면 그 업체들만.
  const monthlyTrend = useMemo(() => {
    const src = trendCompanies.size ? rows.filter((r) => trendCompanies.has(r.company_id)) : rows;
    const m = new Map<string, { month: string; revenue: number; leads: number; paid: number }>();
    for (const c of src) {
      for (const t of c.trend) {
        const e = m.get(t.month) ?? { month: t.month, revenue: 0, leads: 0, paid: 0 };
        e.revenue += t.revenue;
        e.leads += t.leads;
        e.paid += t.paid;
        m.set(t.month, e);
      }
    }
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [rows, trendCompanies]);

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

          {rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-400">매출·리드·결제 트렌드</p>
                <div className="relative" ref={companyMenuRef}>
                  <button
                    onClick={() => setCompanyMenuOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
                  >
                    {trendCompanies.size === 0 ? '전체 업체' : `${trendCompanies.size}개 업체 선택`}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {companyMenuOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-56 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                      <button
                        onClick={() => setTrendCompanies(new Set())}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-gray-50 ${trendCompanies.size === 0 ? 'font-semibold text-blue-600' : 'text-gray-600'}`}
                      >
                        전체 업체
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      {rows.map((r) => (
                        <label key={r.company_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trendCompanies.has(r.company_id)}
                            onChange={() => toggleTrendCompany(r.company_id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600"
                          />
                          <span className="text-xs text-gray-700 truncate">{r.company_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {monthlyTrend.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={monthlyTrend} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="b2bRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="b2bLead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m: string) => m.slice(2)} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48}
                    tickFormatter={(v: number) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : `${Math.round(v / 1e4)}만`)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) => (name === '매출' ? won(Number(value)) : `${value}명`)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="매출" stroke="#10b981" strokeWidth={2} fill="url(#b2bRev)" />
                  <Area yAxisId="right" type="monotone" dataKey="leads" name="리드" stroke="#60a5fa" strokeWidth={2} fill="url(#b2bLead)" />
                  <Line yAxisId="right" type="monotone" dataKey="paid" name="결제" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-400 py-10 text-center">선택한 업체의 트렌드 데이터가 부족합니다.</p>
              )}
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
                    <CompanyRow
                      key={r.company_id}
                      row={r}
                      onSelectStudentById={onSelectStudentById}
                      expanded={expanded === r.company_id}
                      onToggle={() => setExpanded((e) => (e === r.company_id ? null : r.company_id))}
                    />
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

function CompanyRow({ row, onSelectStudentById, expanded, onToggle }: { row: B2bCompanyStats; onSelectStudentById: (id: string) => void; expanded: boolean; onToggle: () => void }) {
  const dim = row.leads === 0 && !row.is_active;
  const companyStudents = row.students;
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
          <td colSpan={6} className="px-2 py-3 bg-gray-50/40">
            {companyStudents.length ? (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 px-1 mb-1">학생 {companyStudents.length}명</p>
                {companyStudents.map((s) => {
                  const enrolled = s.lead_status === 'enrolled' || s.funnel_stage === '8';
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectStudentById(s.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left"
                    >
                      <span className="font-medium text-blue-600 shrink-0">{s.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${enrolled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {enrolled ? '수업 중' : '이탈'}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums ml-auto shrink-0">{kstDate(s.inquiry_date ?? s.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">이 업체에 연결된 학생이 없습니다.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
