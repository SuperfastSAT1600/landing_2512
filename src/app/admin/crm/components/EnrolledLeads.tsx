'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Student } from '@/types/crm';
import { getAdminUserName } from '@/lib/admin-user';
import { RefundModal } from './RefundModal';
import {
  TutoringStudentRow,
  TutoringListControls,
  classifyTutoringEntries,
  countByTutoringStatus,
  filterTutoringEntries,
  type TutoringEntry,
  type TutoringSubTab,
} from './TutoringStudentRow';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

export function EnrolledLeads({ adminKey, onStudentClick, onStudentUpdate }: EnrolledLeadsProps) {
  const [subTab, setSubTab] = useState<TutoringSubTab>('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<TutoringEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Student | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const headers = { 'x-admin-key': adminKey };
    Promise.all([
      fetch('/api/crm/students?lead_status=enrolled', { headers }).then(r => r.json()),
      fetch('/api/admin/srm/tutoring-users', { headers }).then(r => r.json()),
    ])
      .then(([enrolledData, tutoringData]) => {
        const enrolled: Student[] = enrolledData.data ?? [];
        const linked: TutoringUser[] = tutoringData.linked ?? [];
        setEntries(classifyTutoringEntries(enrolled, linked));
      })
      .catch(err => setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [adminKey]);

  // 서브 탭별 카운트
  const counts = useMemo(() => countByTutoringStatus(entries), [entries]);

  // 현재 탭 + VIP + 이름 검색 필터 적용
  const visible = useMemo(
    () => filterTutoringEntries(entries, { subTab, vipOnly, searchQuery }),
    [entries, subTab, vipOnly, searchQuery]
  );

  const handleRefundConfirm = async (
    refundAmount: number,
    refundReason: string,
    churnType: string,
  ) => {
    if (!refundTarget) return;
    const res = await fetch(`/api/crm/students/${refundTarget.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({
        refund_amount: refundAmount,
        refund_reason: refundReason,
        churn_type: churnType,
        created_by: getAdminUserName(),
      }),
    });
    if (!res.ok) throw new Error('환불 처리 실패');
    onStudentUpdate(refundTarget.id, {
      funnel_stage: 'churned',
      lead_status: 'inactive',
      churn_tag: `환불: ${refundReason}`,
      churn_type: churnType as Student['churn_type'],
    });
    setEntries(prev => prev.filter(e => e.student.id !== refundTarget.id));
    setRefundTarget(null);
  };

  return (
    <div className="space-y-4">

      {/* 상태 서브 탭 + VIP 토글 + 이름 검색 */}
      <TutoringListControls
        subTab={subTab}
        onSubTabChange={setSubTab}
        counts={counts}
        vipOnly={vipOnly}
        onVipOnlyChange={setVipOnly}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showCounts={!loading}
      />

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-8 justify-center text-red-500">
          <AlertCircle size={16} />
          <p className="text-sm">{error}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">해당 학생이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{visible.length}명</p>
          {visible.map(entry => (
            <TutoringStudentRow
              key={entry.student.id}
              student={entry.student}
              displayStatus={entry.displayStatus}
              remainingHours={entry.remainingHours}
              onClick={() => onStudentClick(entry.student)}
              action={
                <button
                  onClick={() => setRefundTarget(entry.student)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                  title="환불 처리"
                >
                  <RotateCcw size={12} />
                  <span className="hidden sm:inline">환불</span>
                </button>
              }
            />
          ))}
        </div>
      )}

      {refundTarget && (
        <RefundModal
          student={refundTarget}
          onConfirm={handleRefundConfirm}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </div>
  );
}
