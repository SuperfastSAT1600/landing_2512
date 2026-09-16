'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Student } from '@/types/crm';
import { getAdminUserName } from '@/lib/admin-user';
import { RefundModal } from './RefundModal';
import { SrmLinkModal } from './SrmLinkModal';
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
  const [sfv2Unlinked, setSfv2Unlinked] = useState<TutoringUser[]>([]);
  const [crmUnlinked, setCrmUnlinked] = useState<CrmUnlinkedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Student | null>(null);
  const [linkTarget, setLinkTarget] = useState<CrmUnlinkedStudent | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'x-admin-key': adminKey };
      const tutoringRes = await fetch('/api/admin/srm/tutoring-users', { headers }).then(r => r.json());
      const linked: TutoringUser[] = tutoringRes.linked ?? [];
      const unlinked: CrmUnlinkedStudent[] = tutoringRes.crmUnlinked ?? [];

      const allEntries = classifyTutoringEntries([], linked);
      // SFv2 연결 완료 학생 → 상태 탭
      setEntries(allEntries.filter(e => e.isCrmLinked));
      // SFv2에만 있는 학생 → 연결 모달에서 사용
      setSfv2Unlinked(linked.filter(u => !u.crmStudentId));
      // CRM 결제 완료 & SFv2 미연결 → 미연결 탭
      setCrmUnlinked(unlinked);
      if (unlinked.length === 0) setSubTab('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = useMemo(() => {
    const c = countByTutoringStatus(entries);
    c.unlinked = crmUnlinked.length;
    return c;
  }, [entries, crmUnlinked]);

  const visible = useMemo(
    () => subTab === 'unlinked' ? [] : filterTutoringEntries(entries, { subTab, vipOnly, searchQuery }),
    [entries, subTab, vipOnly, searchQuery]
  );

  const visibleCrmUnlinked = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return crmUnlinked;
    return crmUnlinked.filter(s => s.name?.toLowerCase().includes(q));
  }, [crmUnlinked, searchQuery]);

  const handleRefundConfirm = async (refundAmount: number, refundReason: string, churnType: string) => {
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

  const handleLinked = () => {
    setLinkTarget(null);
    fetchData();
  };

  const isUnlinkedTab = subTab === 'unlinked';
  const listCount = isUnlinkedTab ? visibleCrmUnlinked.length : visible.length;
  const isEmpty = isUnlinkedTab ? visibleCrmUnlinked.length === 0 : visible.length === 0;

  return (
    <div className="space-y-4">

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
                  <button
                    onClick={() => setLinkTarget(student)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    SRM 연결
                  </button>
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

      {linkTarget && (
        <SrmLinkModal
          crmStudent={linkTarget}
          sfv2Unlinked={sfv2Unlinked}
          adminKey={adminKey}
          onLinked={handleLinked}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  );
}
