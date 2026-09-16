'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
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
import type { TutoringUser, CrmUnlinkedStudent } from '@/app/api/admin/srm/tutoring-users/route';

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

export function EnrolledLeads({ adminKey, onStudentClick, onStudentUpdate }: EnrolledLeadsProps) {
  const [subTab, setSubTab] = useState<TutoringSubTab>('unlinked');
  const [vipOnly, setVipOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<TutoringEntry[]>([]);
  const [crmUnlinked, setCrmUnlinked] = useState<CrmUnlinkedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Student | null>(null);

  useEffect(() => {
    const headers = { 'x-admin-key': adminKey };

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const tutoringRes = await fetch('/api/admin/srm/tutoring-users', { headers }).then(r => r.json());
        const linked: TutoringUser[] = tutoringRes.linked ?? [];
        const unlinked: CrmUnlinkedStudent[] = tutoringRes.crmUnlinked ?? [];
        // SFv2 연결된 학생만 상태 탭에 표시
        setEntries(classifyTutoringEntries([], linked).filter(e => e.isCrmLinked));
        setCrmUnlinked(unlinked);
        // 미연결 학생이 없으면 재원 탭으로
        if (unlinked.length === 0) setSubTab('active');
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adminKey]);

  // 서브 탭별 카운트 — 미연결은 CRM 미연결 학생 수로 override
  const counts = useMemo(() => {
    const c = countByTutoringStatus(entries);
    c.unlinked = crmUnlinked.length;
    return c;
  }, [entries, crmUnlinked]);

  // 상태 탭 필터 (미연결 탭일 때는 entries 무시)
  const visible = useMemo(
    () => subTab === 'unlinked' ? [] : filterTutoringEntries(entries, { subTab, vipOnly, searchQuery }),
    [entries, subTab, vipOnly, searchQuery]
  );

  // CRM 미연결 탭 — 이름 검색만 적용
  const visibleCrmUnlinked = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return crmUnlinked;
    return crmUnlinked.filter(s => s.name?.toLowerCase().includes(q));
  }, [crmUnlinked, searchQuery]);

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

  const isUnlinkedTab = subTab === 'unlinked';
  const listCount = isUnlinkedTab ? visibleCrmUnlinked.length : visible.length;
  const isEmpty = isUnlinkedTab ? visibleCrmUnlinked.length === 0 : visible.length === 0;

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
      ) : isEmpty ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {isUnlinkedTab ? 'SFv2 미연결 학생이 없습니다.' : '해당 학생이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{listCount}명</p>

          {/* CRM 미연결 탭 — CRM에 결제됐지만 SFv2 계정 미연결 */}
          {isUnlinkedTab ? (
            visibleCrmUnlinked.map(student => (
              <div
                key={student.id}
                onClick={() => onStudentClick({ id: student.id, name: student.name } as Student)}
                className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{student.name}</span>
                    {student.grade && <span className="text-xs text-gray-500">{student.grade}</span>}
                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-600">
                      SFv2 미연결
                    </span>
                  </div>
                  {student.parent_phone && (
                    <p className="text-xs text-gray-400 mt-0.5">{student.parent_phone}</p>
                  )}
                </div>
                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                  <a
                    href="/admin/srm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink size={11} />
                    SRM 연결
                  </a>
                </div>
              </div>
            ))
          ) : (
            visible.map(entry => (
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
            ))
          )}
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
