'use client';

import { useMemo, useState } from 'react';
import type { Student } from '@/types/crm';
import { FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';
import { useCompanies } from '@/hooks/useCompanies';

interface Props {
  adminKey: string;
  students: Student[];
  onStudentClick: (student: Student) => void;
}

const kstDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }) : '-';

export function B2bLeads({ adminKey, students, onStudentClick }: Props) {
  const { companies } = useCompanies(adminKey, { all: true });
  const [companyFilter, setCompanyFilter] = useState('');
  const companyName = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const leads = useMemo(
    () => students.filter((s) => s.company_id != null && (!companyFilter || s.company_id === companyFilter)),
    [students, companyFilter]
  );

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">B2B 리드 <span className="text-gray-400 font-normal">({leads.length})</span></p>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
          <option value="">전체 업체</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-400">
              <th className="text-left py-2.5 px-2 font-medium">이름</th>
              <th className="text-left py-2.5 px-3 font-medium">업체</th>
              <th className="text-left py-2.5 px-3 font-medium">단계</th>
              <th className="text-left py-2.5 px-3 font-medium">상태</th>
              <th className="text-right py-2.5 px-2 font-medium">문의일</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer" onClick={() => onStudentClick(s)}>
                <td className="py-2.5 px-2 font-medium text-blue-600">{s.name}</td>
                <td className="py-2.5 px-3 text-gray-600">{(s.company_id && companyName.get(s.company_id)) ?? s.b2b_partner ?? '-'}</td>
                <td className="py-2.5 px-3 text-gray-600">{FUNNEL_STAGE_LABELS[s.funnel_stage as FunnelStage] ?? s.funnel_stage}</td>
                <td className="py-2.5 px-3 text-gray-600">{s.lead_status}</td>
                <td className="py-2.5 px-2 text-right text-gray-500 tabular-nums">{kstDate(s.inquiry_date ?? s.created_at)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">B2B 리드가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
