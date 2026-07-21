'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { B2bPipelineData, B2bPipelineCompany } from '@/app/api/crm/b2b/pipeline/route';
import { OverviewCard, StageFlowTable } from '../stats-primitives';

interface Props {
  adminKey: string;
}

const kstDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }) : '-';

export function B2bPipeline({ adminKey }: Props) {
  const [data, setData] = useState<B2bPipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crm/b2b/pipeline', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (res.ok && json.data) setData(json.data as B2bPipelineData);
      else setError(json.error ?? '조회에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const o = data?.overview;
  // 분포 바에 쓸 최대값 (0 division 방지)
  const maxStage = o ? Math.max(1, ...o.by_stage.map((s) => s.count)) : 1;

  return (
    <div className="space-y-5">
      <p className="text-[11px] text-gray-400">현재 영업 진행중(활성 리드가 세일즈 단계에 있는) 업체 스냅샷</p>

      {loading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>}
      {!loading && error && <p className="py-16 text-center text-sm text-red-500">{error}</p>}

      {!loading && !error && o && (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-100 pb-6">
            <OverviewCard label="영업중 업체" value={o.companies_in_sales} />
            <OverviewCard label="활성 리드" value={o.total_active_leads} />
          </div>

          {/* 단계 분포 (전체) */}
          <div className="border-b border-gray-100 pb-6">
            <p className="text-xs font-semibold text-gray-400 mb-3">단계별 활성 리드 분포</p>
            <div className="space-y-1.5">
              {o.by_stage.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-40 shrink-0"><span className="text-gray-400">{s.stage}.</span> {s.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-gray-700 w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 업체 리스트 */}
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-400">
                    <th className="text-left py-2.5 px-2 font-medium min-w-[160px]">업체</th>
                    <th className="text-right py-2.5 px-2 font-medium">활성 리드</th>
                    <th className="text-left py-2.5 px-2 font-medium">단계 분포</th>
                    <th className="text-right py-2.5 px-2 font-medium">수업중</th>
                    <th className="text-right py-2.5 px-2 font-medium">최근 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((c) => (
                    <PipelineRow key={c.company_id} row={c} expanded={expanded === c.company_id} onToggle={() => setExpanded((e) => (e === c.company_id ? null : c.company_id))} />
                  ))}
                  {data.companies.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">현재 영업 진행중인 업체가 없습니다.</td></tr>
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

function PipelineRow({ row, expanded, onToggle }: { row: B2bPipelineCompany; expanded: boolean; onToggle: () => void }) {
  const active = row.by_stage.filter((s) => s.count > 0);
  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50">
        <td className="py-2.5 px-2">
          <button onClick={onToggle} className="flex items-center gap-1.5 text-left font-medium text-gray-800 hover:text-blue-600">
            {expanded ? <ChevronDown size={14} className="text-gray-300" /> : <ChevronRight size={14} className="text-gray-300" />}
            {row.company_name}
          </button>
        </td>
        <td className="text-right py-2.5 px-2 tabular-nums font-medium">{row.active_lead_count}</td>
        <td className="py-2.5 px-2">
          <div className="flex flex-wrap gap-1">
            {active.map((s) => (
              <span key={s.stage} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{s.label} {s.count}</span>
            ))}
          </div>
        </td>
        <td className="text-right py-2.5 px-2 tabular-nums text-gray-400">{row.enrolled_count}</td>
        <td className="text-right py-2.5 px-2 tabular-nums text-gray-500">{kstDate(row.latest_activity_at)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-2 py-3">
            <StageFlowTable rows={row.stage_flow} />
          </td>
        </tr>
      )}
    </>
  );
}
