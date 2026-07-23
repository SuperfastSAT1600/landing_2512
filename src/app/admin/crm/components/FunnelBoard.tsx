'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { TRAFFIC_SOURCE_OPTIONS, type FunnelNote, type FunnelStageKey } from '@/types/crm';
import { WEEK_DEFINITIONS } from '@/lib/week-definitions';
import type { StrategyFunnelData, FunnelRow } from '@/app/api/crm/strategy-funnel/route';

const MILESTONE_SKELETON: FunnelRow[] = [
  { key: 'lead', label: '리드 남김', count: 0, rate: 0 },
  { key: 'call', label: '콜 완료', count: 0, rate: 0 },
  { key: 'diagnostic', label: '진단 테스트 실시', count: 0, rate: 0 },
  { key: 'report', label: '리포트 콜', count: 0, rate: 0 },
  { key: 'paid', label: '결제', count: 0, rate: 0 },
];

const ALL = '__all__';

interface PeriodCol { id: string; label: string; from: string; to: string; fixed?: boolean }

const uid = () => Math.random().toString(36).slice(2, 9);

function fmtRange(from: string, to: string) {
  return `${from.slice(5).replace('-', '/')}~${to.slice(5).replace('-', '/')}`;
}

interface Props {
  adminKey: string;
}

export function FunnelBoard({ adminKey }: Props) {
  const year = new Date().getFullYear();
  const [source, setSource] = useState<string>(ALL);
  const [periods, setPeriods] = useState<PeriodCol[]>(() => [
    { id: 'cum', label: `${String(year).slice(2)}년 누적`, from: `${year}-01-01`, to: `${year}-12-31`, fixed: true },
  ]);
  const [funnels, setFunnels] = useState<Record<string, FunnelRow[]>>({});
  const [notes, setNotes] = useState<FunnelNote[]>([]);
  const [loading, setLoading] = useState(true);

  // 퍼널 데이터: source/periods 변경 시 각 기간 조회
  const loadFunnels = useCallback(async (): Promise<Record<string, FunnelRow[]>> => {
    setLoading(true);
    const out: Record<string, FunnelRow[]> = {};
    await Promise.all(periods.map(async (p) => {
      try {
        const qs = new URLSearchParams({ source, from: p.from, to: p.to });
        const res = await fetch(`/api/crm/strategy-funnel?${qs}`, { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok && json.data) out[p.id] = (json.data as StrategyFunnelData).rows;
      } catch { /* skip */ }
    }));
    return out;
  }, [source, periods, adminKey]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/funnel-notes?source=${encodeURIComponent(source)}`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      setNotes(res.ok ? (json.data ?? []) : []);
    } catch { setNotes([]); }
  }, [source, adminKey]);

  // 빠른 소스/기간 변경 시 늦게 온 응답이 최신을 덮어쓰지 않도록 가드
  useEffect(() => { let stale = false; (async () => { const r = await loadFunnels(); if (!stale && r) { setFunnels(r); setLoading(false); } })(); return () => { stale = true; }; }, [loadFunnels]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ── 기간 컬럼 ──
  const addPeriod = () => {
    const to = `${year}-12-31`;
    setPeriods((p) => [...p, { id: uid(), label: '', from: `${year}-07-01`, to }]);
  };
  const updatePeriod = (id: string, patch: Partial<PeriodCol>) =>
    setPeriods((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removePeriod = (id: string) => setPeriods((p) => p.filter((x) => x.id !== id));

  // ── 주석 (낙관적) ──
  const stageNotes = (stage: FunnelStageKey) => notes.filter((n) => n.stage_key === stage);
  const addNote = async (stage: FunnelStageKey) => {
    const optimistic: FunnelNote = { id: 'tmp-' + uid(), source, stage_key: stage, week_start: null, content: '', created_at: '', updated_at: '' };
    setNotes((n) => [...n, optimistic]);
    try {
      const res = await fetch('/api/crm/funnel-notes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify({ source, stage_key: stage, content: '' }) });
      const json = await res.json();
      if (res.ok) setNotes((n) => n.map((x) => (x.id === optimistic.id ? json.data : x)));
      else setNotes((n) => n.filter((x) => x.id !== optimistic.id));
    } catch { setNotes((n) => n.filter((x) => x.id !== optimistic.id)); }
  };
  const patchNote = async (id: string, patch: Partial<FunnelNote>) => {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (id.startsWith('tmp-')) return;
    try { await fetch(`/api/crm/funnel-notes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify(patch) }); } catch { /* ignore */ }
  };
  const removeNote = async (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    if (id.startsWith('tmp-')) return;
    try { await fetch(`/api/crm/funnel-notes/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } }); } catch { /* ignore */ }
  };

  // 퍼널 행 순서/라벨 (첫 기간 기준, 없으면 기본 스켈레톤)
  const milestoneRows = funnels[periods[0]?.id] ?? MILESTONE_SKELETON;
  const showNotes = true; // 요약 5단계만 표시 → 시도 주석 항상 노출

  return (
    <div className="space-y-4">
      {/* 소스 선택 + 기간 추가 */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5">
          <option value={ALL}>전체 채널</option>
          {TRAFFIC_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        <div className="flex-1" />
        <button onClick={addPeriod} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-600"><Plus size={13} /> 기간 추가</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-400">
              <th className="text-left py-2.5 px-3 font-medium min-w-[110px]">퍼널</th>
              {periods.map((p) => (
                <th key={p.id} className="py-2.5 px-3 font-medium min-w-[110px] text-right">
                  <div className="flex items-center justify-end gap-1">
                    {p.fixed ? (
                      <span>{p.label}</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <input type="date" value={p.from} onChange={(e) => updatePeriod(p.id, { from: e.target.value })} className="border border-gray-200 rounded px-1 py-0.5 text-[11px]" />
                        <span className="text-gray-300">~</span>
                        <input type="date" value={p.to} onChange={(e) => updatePeriod(p.id, { to: e.target.value })} className="border border-gray-200 rounded px-1 py-0.5 text-[11px]" />
                        <button onClick={() => removePeriod(p.id)} className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {showNotes && <th className="text-left py-2.5 px-3 font-medium min-w-[280px]">시도 주차 · 내용</th>}
            </tr>
          </thead>
          <tbody>
            {milestoneRows.map((m) => (
              <tr key={m.key} className="border-b border-gray-100 align-top">
                <td className="py-3 px-3 font-medium text-gray-800">{m.label}</td>
                {periods.map((p) => {
                  const row = (funnels[p.id] ?? []).find((r) => r.key === m.key);
                  return (
                    <td key={p.id} className="py-3 px-3 text-right tabular-nums">
                      <div className="text-gray-900 font-semibold">{row ? row.count : '-'}</div>
                      {row && <div className="text-[11px] text-gray-400">{row.rate}%</div>}
                    </td>
                  );
                })}
                {/* 시도 주차·내용 (요약 5단계에서만) */}
                {showNotes && (
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    {stageNotes(m.key as FunnelStageKey).map((n) => (
                      <div key={n.id} className="flex items-center gap-1.5">
                        <select value={n.week_start ?? ''} onChange={(e) => patchNote(n.id, { week_start: e.target.value || null })}
                          className="text-[11px] border border-gray-200 rounded px-1 py-0.5 shrink-0 w-28">
                          <option value="">주차</option>
                          {WEEK_DEFINITIONS.slice().reverse().map((w) => <option key={w.start} value={w.start}>{w.label}</option>)}
                        </select>
                        <input value={n.content} onChange={(e) => patchNote(n.id, { content: e.target.value })} placeholder="시도 내용…"
                          className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <button onClick={() => removeNote(n.id)} className="text-gray-300 hover:text-red-400 shrink-0"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => addNote(m.key as FunnelStageKey)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600"><Plus size={11} /> 시도 추가</button>
                  </div>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">코호트 = 기간 내(한국시간) 문의한 리드. <b>종료일 시점</b>에 각 리드가 <b>머물러 있는 단계</b>로 딱 한 구간에 집계(리드 남김=0·1·2·3a·3b / 콜 완료=4·5a / 진단=5b·6 / 리포트 콜=7 / 결제=최초결제 또는 수업중, 이탈 제외). % = 전체 코호트 대비 구성비. {source === ALL ? '전체 채널' : source} 주석은 저장됩니다.</p>
    </div>
  );
}
