'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Student } from '@/types/crm';
import { SalesKanban } from './SalesKanban';
import { KanbanStatsStrip } from './KanbanStatsStrip';
import { KanbanFilter, KanbanFilters, DEFAULT_FILTERS } from './KanbanFilter';
import { LeadPool } from './LeadPool';
import { SalesStats } from './SalesStats';
import { EnrolledLeads } from './EnrolledLeads';
import { RetryKanban } from './RetryKanban';

type HubTab = 'kanban' | 'retry' | 'enrolled' | 'pool' | 'stats';

interface Props {
  students: Student[];
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onSelectStudentById: (id: string) => void;
  fetchStudents: () => void;
  retryEnrolledId: string | null;
  onEnrolledHandled: () => void;
}

// 메뉴1: 리드 현황·통계 (최초 세일즈 / 재시도 / 수업 중 / 이탈 리드풀 / 통계)
export function LeadsHub({
  students, adminKey, onStudentUpdate, onStudentClick, onSelectStudentById,
  fetchStudents, retryEnrolledId, onEnrolledHandled,
}: Props) {
  const [subTab, setSubTab] = useState<HubTab>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_FILTERS);
  const [retryContext, setRetryContext] = useState<{ id: string; name: string } | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.parent_phone.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (filters.grade && s.grade !== filters.grade) return false;
      if (filters.trafficSource && s.traffic_source !== filters.trafficSource) return false;
      if (filters.desiredSubjects && s.desired_subjects !== filters.desiredSubjects) return false;
      if (filters.leadType && s.lead_type !== filters.leadType) return false;
      return true;
    });
  }, [students, searchQuery, filters]);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit max-w-full overflow-x-auto scrollbar-none">
        {([
          { key: 'kanban', label: '최초 세일즈' },
          { key: 'retry', label: '재시도' },
          { key: 'enrolled', label: '수업 중' },
          { key: 'pool', label: '이탈 리드풀' },
          { key: 'stats', label: '통계' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 whitespace-nowrap ${subTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === 'kanban' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="relative w-full sm:flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="이름 또는 전화번호 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <KanbanFilter filters={filters} onChange={setFilters} />
          </div>
          <KanbanStatsStrip adminKey={adminKey} onSelectStudent={onSelectStudentById} />
          <SalesKanban
            students={filteredStudents}
            adminKey={adminKey}
            searchQuery={searchQuery}
            onStudentUpdate={onStudentUpdate}
            onStudentClick={onStudentClick}
          />
        </>
      )}

      {subTab === 'retry' && (
        <RetryKanban
          adminKey={adminKey}
          onStudentClick={onStudentClick}
          onStudentUpdate={onStudentUpdate}
          onStrategyChange={setRetryContext}
          onNavigateToPool={() => setSubTab('pool')}
          enrolledStudentId={retryEnrolledId}
          onEnrolledHandled={onEnrolledHandled}
        />
      )}

      {subTab === 'enrolled' && (
        <EnrolledLeads adminKey={adminKey} onStudentClick={onStudentClick} onStudentUpdate={onStudentUpdate} />
      )}

      {subTab === 'pool' && (
        <LeadPool
          adminKey={adminKey}
          onStudentUpdate={onStudentUpdate}
          onStudentClick={onStudentClick}
          onRefetch={fetchStudents}
          retryContext={retryContext}
          onRetryContextClear={() => setRetryContext(null)}
          onRetryAssignSuccess={() => { setRetryContext(null); setSubTab('retry'); }}
        />
      )}

      {subTab === 'stats' && <SalesStats adminKey={adminKey} onSelectStudent={onSelectStudentById} />}
    </div>
  );
}
