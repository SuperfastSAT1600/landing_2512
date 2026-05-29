'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Search, AlertCircle } from 'lucide-react';
import { Student } from '@/types/crm';
import { useCrmRealtime, RealtimeStatus } from '@/hooks/useCrmRealtime';
import { SalesKanban } from './components/SalesKanban';
import { StudentCreateModal } from './components/StudentCreateModal';
import { StudentDetailPanel } from './components/StudentDetailPanel';
import { KanbanFilter, KanbanFilters, DEFAULT_FILTERS } from './components/KanbanFilter';
import { LeadPool } from './components/LeadPool';
import { SalesStats } from './components/SalesStats';
import { EnrolledLeads } from './components/EnrolledLeads';

function getAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

function RealtimeIndicator({ status }: { status: RealtimeStatus }) {
  const colors: Record<RealtimeStatus, string> = {
    connected: 'bg-emerald-400',
    connecting: 'bg-yellow-400 animate-pulse',
    disconnected: 'bg-red-400',
  };
  const labels: Record<RealtimeStatus, string> = {
    connected: '실시간 연결',
    connecting: '재연결 중',
    disconnected: '연결 끊김',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-gray-500">{labels[status]}</span>
    </div>
  );
}

export default function CrmPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'kanban' | 'enrolled' | 'pool' | 'stats'>('kanban');

  useEffect(() => {
    setAdminKey(getAdminKey());
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoadError(null);
      // 첫 요청이 Turbopack 콜드스타트로 실패할 수 있어 1회 재시도
      let res = await fetch('/api/crm/students', { headers: { 'x-admin-key': getAdminKey() } });
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 800));
        res = await fetch('/api/crm/students', { headers: { 'x-admin-key': getAdminKey() } });
      }
      if (!res.ok) throw new Error('학생 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setStudents(data.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleStudentChange = useCallback(
    (payload: { eventType: string; new: Student | null; old: Partial<Student> | null }) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        setStudents(prev =>
          prev.some(s => s.id === (payload.new as Student).id)
            ? prev
            : [payload.new as Student, ...prev]
        );
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = payload.new;
        if (updated.id) {
          setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        } else {
          // Fallback poll from 30s interval
          fetchStudents();
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        const deletedId = payload.old.id;
        if (deletedId) {
          setStudents(prev => prev.filter(s => s.id !== deletedId));
        }
      }
    },
    [fetchStudents]
  );

  const { status } = useCrmRealtime({ onStudentChange: handleStudentChange });

  const handleStudentUpdate = useCallback(async (id: string, updates: Partial<Student>) => {
    // Capture previous state for rollback
    const prevStudents = students;
    const prevSelected = selectedStudent?.id === id ? { ...selectedStudent } : null;

    // Optimistic update
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    setSelectedStudent(prev => (prev?.id === id ? { ...prev, ...updates } : prev));

    try {
      const res = await fetch(`/api/crm/students/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey(),
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        setStudents(prevStudents);
        if (prevSelected) setSelectedStudent(prevSelected);
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message ?? '업데이트에 실패했습니다.');
      }
    } catch {
      setStudents(prevStudents);
      if (prevSelected) setSelectedStudent(prevSelected);
    }
  }, [students, selectedStudent]);

  const handleStudentClick = useCallback((student: Student) => {
    setSelectedStudent(student);
  }, []);

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

  // Calculated from ALL active students (not filtered) so the banner is always accurate
  const followUpCount = useMemo(() => {
    const fiveDaysAgo = Date.now() - 5 * 86400000;
    return students.filter(
      s =>
        s.lead_status === 'active' &&
        s.last_contacted_at !== null &&
        new Date(s.last_contacted_at).getTime() < fiveDaysAgo
    ).length;
  }, [students]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{loadError}</p>
        </div>
        <button
          onClick={fetchStudents}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans overflow-x-hidden">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">CRM</h1>
          <div className="flex items-center gap-4">
            <RealtimeIndicator status={status} />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
            >
              <UserPlus size={13} />
              새 학생 추가
            </button>
          </div>
        </div>
      </div>

      {/* Board area */}
      <div className="p-6">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-4">
          {([
            { key: 'kanban',   label: '세일즈 리드풀' },
            { key: 'enrolled', label: '수업 중' },
            { key: 'pool',     label: '전체 리드풀' },
            { key: 'stats',    label: '통계' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'kanban' && (
          <>
            {/* Search / filter bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
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

            <SalesKanban
              students={filteredStudents}
              followUpCount={followUpCount}
              adminKey={adminKey}
              searchQuery={searchQuery}
              onStudentUpdate={handleStudentUpdate}
              onStudentClick={handleStudentClick}
            />
          </>
        )}

        {activeTab === 'enrolled' && (
          <EnrolledLeads
            adminKey={adminKey}
            onStudentClick={handleStudentClick}
            onStudentUpdate={handleStudentUpdate}
          />
        )}

        {activeTab === 'stats' && (
          <SalesStats adminKey={adminKey} />
        )}

        {activeTab === 'pool' && (
          <LeadPool
            adminKey={adminKey}
            onStudentUpdate={handleStudentUpdate}
            onStudentClick={handleStudentClick}
            onRefetch={fetchStudents}
          />
        )}
      </div>

      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          adminKey={adminKey}
          onClose={() => setSelectedStudent(null)}
          onUpdate={handleStudentUpdate}
          onDelete={(id) => {
            setStudents(prev => prev.filter(s => s.id !== id));
            setSelectedStudent(null);
          }}
        />
      )}

      {showCreateModal && (
        <StudentCreateModal
          adminKey={adminKey}
          onClose={() => setShowCreateModal(false)}
          onCreate={(student) => {
            setStudents(prev => [student, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
