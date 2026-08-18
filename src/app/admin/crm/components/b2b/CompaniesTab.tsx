'use client';

import { useState } from 'react';
import { Plus, Pencil, Building2 } from 'lucide-react';
import type { Company } from '@/types/crm';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyEditModal } from './CompanyEditModal';

interface Props {
  adminKey: string;
}

export function CompaniesTab({ adminKey }: Props) {
  const { companies, loading, error, refetch } = useCompanies(adminKey, { all: true });
  const [editing, setEditing] = useState<Company | null | undefined>(undefined); // undefined=닫힘, null=신규, Company=수정

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">업체 목록 <span className="text-gray-400 font-normal">({companies.length})</span></p>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
        >
          <Plus size={13} /> 업체 추가
        </button>
      </div>

      {loading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중…</p>}
      {error && <p className="py-10 text-center text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-400">
                <th className="text-left py-2.5 px-2 font-medium">업체명</th>
                <th className="text-left py-2.5 px-3 font-medium">담당자</th>
                <th className="text-left py-2.5 px-3 font-medium">연락처</th>
                <th className="text-left py-2.5 px-3 font-medium">상태</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="py-2.5 px-2 font-medium text-gray-800 flex items-center gap-2">
                    <Building2 size={14} className="text-gray-300" /> {c.name}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{c.contact_person ?? '-'}</td>
                  <td className="py-2.5 px-3 text-gray-600">{c.contact_phone ?? '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="수정">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">등록된 업체가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <CompanyEditModal
          adminKey={adminKey}
          company={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); refetch(); }}
        />
      )}
    </div>
  );
}
