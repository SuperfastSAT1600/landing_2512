'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, GraduationCap, UserX } from 'lucide-react';
import { Student, ChurnType } from '@/types/crm';
import { ChurnModal } from './ChurnModal';

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

function EnrolledCard({ student, onStudentClick, onGraduate }: {
  student: Student;
  onStudentClick: (s: Student) => void;
  onGraduate: (s: Student) => void;
}) {
  const enrolledDays = Math.floor(
    (Date.now() - new Date(student.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => onStudentClick(student)}
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{student.name}</span>
          <span className="text-xs text-gray-500">{student.grade}</span>
          {student.desired_subjects && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
              {student.desired_subjects}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-400">{student.parent_phone}</span>
          <span className="text-xs text-gray-400">수강 {enrolledDays}일차</span>
          {student.traffic_source && (
            <span className="text-xs text-gray-400">{student.traffic_source}</span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onGraduate(student); }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shrink-0"
        title="수업 종료 후 이탈 처리"
      >
        <UserX size={12} />
        수업 종료
      </button>
    </div>
  );
}

export function EnrolledLeads({ adminKey, onStudentClick, onStudentUpdate }: EnrolledLeadsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);

  const fetchEnrolled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/students?lead_status=enrolled', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setStudents(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (adminKey) fetchEnrolled();
  }, [adminKey, fetchEnrolled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={fetchEnrolled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={12} />
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <GraduationCap size={16} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">수강 중 {students.length}명</span>
        </div>
        <button
          onClick={fetchEnrolled}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={12} />
          새로고침
        </button>
      </div>

      {students.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          수업 중인 학생이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <EnrolledCard
              key={s.id}
              student={s}
              onStudentClick={onStudentClick}
              onGraduate={setChurnTarget}
            />
          ))}
        </div>
      )}

      {churnTarget && (
        <ChurnModal
          student={churnTarget}
          onConfirm={(churnTag: string, churnType: ChurnType) => {
            onStudentUpdate(churnTarget.id, {
              funnel_stage: 'churned',
              lead_status: 'inactive',
              churn_tag: churnTag,
              churn_type: churnType,
            });
            setStudents(prev => prev.filter(s => s.id !== churnTarget.id));
            setChurnTarget(null);
          }}
          onClose={() => setChurnTarget(null)}
        />
      )}
    </div>
  );
}
