'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, GraduationCap, UserX, RotateCcw, Search, X, Crown } from 'lucide-react';
import { Student, ChurnType } from '@/types/crm';
import { getAdminUserName } from '@/lib/admin-user';
import { ChurnModal } from './ChurnModal';
import { RefundModal } from './RefundModal';

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

function EnrolledCard({ student, firstPaidAt, onStudentClick, onGraduate, onRefund }: {
  student: Student;
  firstPaidAt: string | null;
  onStudentClick: (s: Student) => void;
  onGraduate: (s: Student) => void;
  onRefund: (s: Student) => void;
}) {
  const enrolledDays = firstPaidAt
    ? Math.floor((Date.now() - new Date(firstPaidAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      onClick={() => onStudentClick(student)}
      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{student.name}</span>
          <span className="text-xs text-gray-500">{student.grade}</span>
          {student.is_vip && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide bg-amber-100 text-amber-700">
              <Crown size={9} />VIP
            </span>
          )}
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
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onRefund(student); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-100 rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors"
          title="환불 처리"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">환불</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGraduate(student); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-100 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
          title="수업 종료 후 이탈 처리"
        >
          <UserX size={12} />
          <span className="hidden sm:inline">수업 종료</span>
        </button>
      </div>
    </div>
  );
}

type TabType = 'all' | 'vip';

export function EnrolledLeads({ adminKey, onStudentClick, onStudentUpdate }: EnrolledLeadsProps) {
  const [tab, setTab] = useState<TabType>('all');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [vipStudents, setVipStudents] = useState<Student[]>([]);
  const [firstPaidMap, setFirstPaidMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [refundTarget, setRefundTarget] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 전체 목록 진입 시 즉시 로드 (검색은 클라이언트 필터링)
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/crm/students?lead_status=enrolled', { headers: { 'x-admin-key': adminKey } }),
      fetch('/api/crm/payments', { headers: { 'x-admin-key': adminKey } }),
    ])
      .then(async ([studentsRes, paymentsRes]) => {
        if (!studentsRes.ok) throw new Error('데이터를 불러오지 못했습니다.');
        const studentsData = await studentsRes.json();
        setAllStudents(studentsData.data ?? []);
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
      })
      .catch(err => setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [adminKey]);

  // VIP 탭 진입 시 VIP 학생 전체 로드
  useEffect(() => {
    if (tab !== 'vip') return;
    setVipLoading(true);
    fetch('/api/crm/students?lead_status=enrolled&is_vip=true', { headers: { 'x-admin-key': adminKey } })
      .then(async (r) => {
        const data = await r.json();
        setVipStudents(data.data ?? []);
      })
      .catch((err) => console.error('[EnrolledLeads] VIP fetch failed:', err))
      .finally(() => setVipLoading(false));
  }, [tab, adminKey]);

  const students = searchQuery.trim()
    ? allStudents.filter(s => s.name.includes(searchQuery.trim()))
    : allStudents;

  const totalCount = allStudents.length || null;

  return (
    <div className="space-y-4">
      {/* 헤더 + 탭 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
          <GraduationCap size={16} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">수업 중</span>
          {totalCount !== null && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              {totalCount}명
            </span>
          )}
        </div>
        {/* 탭 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setTab('vip')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'vip' ? 'bg-amber-400 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            <Crown size={11} />
            VIP
          </button>
        </div>
        {/* 전체 탭 검색창 */}
        {tab === 'all' && (
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="이름 검색..."
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-100 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
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
        )}
      </div>

      {/* VIP 탭 */}
      {tab === 'vip' && (
        vipLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : vipStudents.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">VIP 학생이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">{vipStudents.length}명</p>
            {vipStudents.map(s => (
              <EnrolledCard
                key={s.id}
                student={s}
                firstPaidAt={firstPaidMap[s.name] ?? null}
                onStudentClick={onStudentClick}
                onGraduate={setChurnTarget}
                onRefund={setRefundTarget}
              />
            ))}
          </div>
        )
      )}

      {/* 전체 탭 */}
      {tab === 'all' && (
        loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 justify-center text-red-500">
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다.` : '수업 중인 학생이 없습니다.'}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">{students.length}명{searchQuery ? ' 검색됨' : ''}</p>
            {students.map(s => (
              <EnrolledCard
                key={s.id}
                student={s}
                firstPaidAt={firstPaidMap[s.name] ?? null}
                onStudentClick={onStudentClick}
                onGraduate={setChurnTarget}
                onRefund={setRefundTarget}
              />
            ))}
          </div>
        )
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
            setAllStudents(prev => prev.filter((s: Student) => s.id !== churnTarget.id));
            setVipStudents(prev => prev.filter((s: Student) => s.id !== churnTarget.id));
            setChurnTarget(null);
          }}
          onClose={() => setChurnTarget(null)}
        />
      )}

      {refundTarget && (
        <RefundModal
          student={refundTarget}
          onConfirm={async (refundAmount, refundReason, churnType) => {
            const res = await fetch(`/api/crm/students/${refundTarget.id}/refund`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
              body: JSON.stringify({ refund_amount: refundAmount, refund_reason: refundReason, churn_type: churnType, created_by: getAdminUserName() }),
            });
            if (!res.ok) throw new Error('환불 처리 실패');
            onStudentUpdate(refundTarget.id, {
              funnel_stage: 'churned',
              lead_status: 'inactive',
              churn_tag: `환불: ${refundReason}`,
              churn_type: churnType,
            });
            setAllStudents(prev => prev.filter((s: Student) => s.id !== refundTarget.id));
            setVipStudents(prev => prev.filter((s: Student) => s.id !== refundTarget.id));
            setRefundTarget(null);
          }}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </div>
  );
}
