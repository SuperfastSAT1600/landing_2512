'use client';

import { useState } from 'react';
import type { Student } from '@/types/crm';
import { B2bStats } from './B2bStats';
import { CompaniesTab } from './CompaniesTab';
import { B2bLeads } from './B2bLeads';

type HubTab = 'dashboard' | 'companies' | 'leads';

interface Props {
  adminKey: string;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onSelectStudentById: (id: string) => void;
}

// 메뉴1: 업체·리드 현황·통계 (대시보드 / 업체 목록 / 리드)
export function B2bHub({ adminKey, students, onStudentClick, onSelectStudentById }: Props) {
  const [sub, setSub] = useState<HubTab>('dashboard');
  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {([
          { key: 'dashboard', label: '대시보드' },
          { key: 'companies', label: '업체 목록' },
          { key: 'leads', label: '리드' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSub(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${sub === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'dashboard' && <B2bStats adminKey={adminKey} onSelectStudentById={onSelectStudentById} />}
      {sub === 'companies' && <CompaniesTab adminKey={adminKey} />}
      {sub === 'leads' && <B2bLeads adminKey={adminKey} students={students} onStudentClick={onStudentClick} />}
    </div>
  );
}
