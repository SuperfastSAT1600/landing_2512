'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, GraduationCap, UserX, Search, X } from 'lucide-react';
import { Student, ChurnType } from '@/types/crm';
import { ChurnModal } from './ChurnModal';

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

function EnrolledCard({ student, firstPaidAt, onStudentClick, onGraduate }: {
  student: Student;
  firstPaidAt: string | null;
  onStudentClick: (s: Student) => void;
  onGraduate: (s: Student) => void;
}) {
  const enrolledDays = firstPaidAt
    ? Math.floor((Date.now() - new Date(firstPaidAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
          {enrolledDays !== null && (
            <span className="text-xs text-gray-400">수강 {enrolledDays}일차</span>
          )}
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
  const [firstPaidMap, setFirstPaidMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/crm/students?lead_status=enrolled&stats_only=true', {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(j => setTotalCount(j.data?.count ?? null))
      .catch(() => {});
  }, [adminKey]);

  const fetchEnrolled = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        fetch(`/api/crm/students?lead_status=enrolled&search=${encodeURIComponent(query)}`, {
          headers: { 'x-admin-key': adminKey },
        }),
        fetch('/api/crm/payments', { headers: { 'x-admin-key': adminKey } }),
      ]);
      if (!studentsRes.ok) throw new Error('데이터를 불러오지 못했습니다.');
      const studentsData = await studentsRes.json();
      setStudents(studentsData.data ?? []);

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        const map: Record<string, string> = {};
        for (const p of (paymentsData.data ?? [])) {
          const name = p.student_name;
          if (!name) continue;
          if (!map[name] || p.paid_at < map[name]) map[name] = p.paid_at;
        }
        setFirstPaidMap(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setStudents([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setHasSearched(true);
      fetchEnrolled(searchQuery.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchEnrolled]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
          <GraduationCap size={16} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">수업 중</span>
          {totalCount !== null && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              {totalCount}명
            </span>
          )}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름 검색..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm">검색 중...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-8 justify-center text-red-500">
          <AlertCircle size={16} />
          <p className="text-sm">{error}</p>
        </div>
      ) : !hasSearched ? (
        <div className="py-16 text-center text-sm text-gray-400">
          이름을 입력하면 수업 중인 학생을 검색합니다.
        </div>
      ) : students.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          &quot;{searchQuery}&quot; 검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{students.length}명 검색됨</p>
          {students.map(s => (
            <EnrolledCard
              key={s.id}
              student={s}
              firstPaidAt={firstPaidMap[s.name] ?? null}
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
