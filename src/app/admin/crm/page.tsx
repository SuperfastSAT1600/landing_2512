'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, AlertCircle, FileAudio, UploadCloud } from 'lucide-react';
import { Student } from '@/types/crm';
import { useCrmRealtime, RealtimeStatus } from '@/hooks/useCrmRealtime';
import { StudentCreateModal } from './components/StudentCreateModal';
import { StudentDetailPanel } from './components/StudentDetailPanel';
import { B2cWorkspace } from './components/B2cWorkspace';
import { B2bWorkspace } from './components/B2bWorkspace';
import { TranscriptBackfillModal } from './components/TranscriptBackfillModal';
import { IntfuncImportModal } from './components/IntfuncImportModal';

type CrmMode = 'b2c' | 'b2b';

function getAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

function getAdminUserName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') || '';
}

function getCrmMode(): CrmMode {
  if (typeof window === 'undefined') return 'b2c';
  return localStorage.getItem('crm_mode') === 'b2b' ? 'b2b' : 'b2c';
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

function CrmModeToggle({ mode, onChange }: { mode: CrmMode; onChange: (m: CrmMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {(['b2c', 'b2b'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function CrmPage() {
  const [students, setStudents] = useState<Student[]>([]);
  // "오늘 취한 액션" 전용 데이터셋 — lead_status 무관(재활성화·이탈 리드풀 포함).
  // 기본 students는 active만 담으므로 별도 조회로 사각지대를 메운다.
  const [todayActions, setTodayActions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adminKey, setAdminKey] = useState('');
  // 임시: 과거 녹음 전사 복구용. 정리가 끝나면 이 상태와 버튼을 함께 제거한다.
  const [showTranscriptBackfill, setShowTranscriptBackfill] = useState(false);
  const [showIntfuncImport, setShowIntfuncImport] = useState(false);
  const [adminUserName, setAdminUserName] = useState('');
  const [crmMode, setCrmMode] = useState<CrmMode>('b2c');
  // 수업 시작(enrolled) 전환 시 재시도 보드에서 후처리하도록 신호로 전달
  const [retryEnrolledId, setRetryEnrolledId] = useState<string | null>(null);

  useEffect(() => {
    setAdminKey(getAdminKey());
    setAdminUserName(getAdminUserName());
    setCrmMode(getCrmMode());
  }, []);

  const changeMode = useCallback((m: CrmMode) => {
    setCrmMode(m);
    if (typeof window !== 'undefined') localStorage.setItem('crm_mode', m);
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

  const fetchTodayActions = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/students?today_actions=true', {
        headers: { 'x-admin-key': getAdminKey() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTodayActions(data.data ?? []);
    } catch {
      // "오늘 취한 액션"은 보조 위젯 — 실패해도 메인 로드를 막지 않는다.
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchTodayActions();
  }, [fetchStudents, fetchTodayActions]);

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
    if (updates.lead_status === "enrolled") setRetryEnrolledId(id);
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
      } else if (updates.daily_action_done_at !== undefined) {
        // 완료 체크/해제는 "오늘 취한 액션" 명단을 바꾸므로 재조회한다.
        fetchTodayActions();
      }
    } catch {
      setStudents(prevStudents);
      if (prevSelected) setSelectedStudent(prevSelected);
    }
  }, [students, selectedStudent, fetchTodayActions]);

  const handleStudentClick = useCallback((student: Student) => {
    setSelectedStudent(student);
  }, []);

  // 통계 상세 내역에서 학생 이름 클릭 → id로 학생을 찾거나 fetch해 상세 패널 오픈
  const handleSelectStudentById = useCallback(async (id: string) => {
    const existing = students.find(s => s.id === id);
    if (existing) { setSelectedStudent(existing); return; }
    try {
      const res = await fetch(`/api/crm/students/${id}`, {
        headers: { 'x-admin-key': getAdminKey() },
      });
      const json = await res.json();
      if (res.ok && json.data) setSelectedStudent(json.data as Student);
    } catch {
      /* 무시: 패널이 열리지 않을 뿐 */
    }
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
      <div className="sticky top-12 md:top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">CRM</h1>
            <CrmModeToggle mode={crmMode} onChange={changeMode} />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <RealtimeIndicator status={status} />
            {/* 임시: 지난 녹음 전사 복구용. 정리가 끝나면 제거한다. */}
            <button
              onClick={() => setShowTranscriptBackfill(true)}
              title="메모는 있는데 전사가 없는 상담 건을 일괄 전사합니다 (임시 기능)"
              className="flex items-center gap-2 px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold text-amber-900 transition-colors"
            >
              <FileAudio size={13} />
              전사 일괄 처리 (임시)
            </button>
            <button
              onClick={() => setShowIntfuncImport(true)}
              title="결과가 확정된 학생의 상담 전사를 IntelligentFunctions 데이터셋으로 보냅니다"
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors"
            >
              <UploadCloud size={13} />
              IF 데이터 전송
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition-colors"
            >
              <UserPlus size={13} />
              새 학생 추가
            </button>
          </div>
        </div>
      </div>

      {/* Board area — mode별 워크스페이스 */}
      {crmMode === 'b2c' ? (
        <B2cWorkspace
          students={students}
          userName={adminUserName}
          todayActions={todayActions}
          adminKey={adminKey}
          onStudentUpdate={handleStudentUpdate}
          onStudentClick={handleStudentClick}
          onSelectStudentById={handleSelectStudentById}
          fetchStudents={fetchStudents}
          retryEnrolledId={retryEnrolledId}
          onEnrolledHandled={() => setRetryEnrolledId(null)}
        />
      ) : (
        <B2bWorkspace
          adminKey={adminKey}
          students={students}
          onStudentClick={handleStudentClick}
          onSelectStudentById={handleSelectStudentById}
        />
      )}

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
          userName={adminUserName}
          onClose={() => setShowCreateModal(false)}
          onCreate={(student) => {
            setStudents(prev => [student, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* 임시: 지난 녹음 전사 복구용. 정리가 끝나면 제거한다. */}
      {showTranscriptBackfill && (
        <TranscriptBackfillModal
          adminKey={adminKey}
          onClose={() => setShowTranscriptBackfill(false)}
        />
      )}

      {showIntfuncImport && (
        <IntfuncImportModal adminKey={adminKey} onClose={() => setShowIntfuncImport(false)} />
      )}
    </div>
  );
}
