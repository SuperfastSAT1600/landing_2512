'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Users, RotateCcw, Crown, Link2Off } from 'lucide-react';
import { Student } from '@/types/crm';
import { getAdminUserName } from '@/lib/admin-user';
import { RefundModal } from './RefundModal';
import type { TutoringUser, TutoringStatus } from '@/app/api/admin/srm/tutoring-users/route';

// ── 분류 타입 ─────────────────────────────────────────────────────────────────

// 'ended'는 목록에서 제외하므로 DisplayStatus에 포함하지 않는다
type DisplayStatus = 'unlinked' | 'active' | 'paused' | 'partial_end' | 'sales';

interface TutoringEntry {
  student: Student;
  displayStatus: DisplayStatus;
  remainingHours: number | null;
}

const STATUS_META: Record<DisplayStatus, { label: string; color: string; dot: string }> = {
  unlinked:     { label: '미연결',      color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' },
  active:       { label: '수업중',      color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  paused:       { label: '휴원',        color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  partial_end:  { label: '부분종료',    color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  sales:        { label: '재결제세일즈', color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
};

type SubTab = 'all' | DisplayStatus;

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all',          label: '전체' },
  { key: 'unlinked',     label: '미연결' },
  { key: 'active',       label: '수업중' },
  { key: 'paused',       label: '휴원' },
  { key: 'partial_end',  label: '부분종료' },
  { key: 'sales',        label: '재결제세일즈' },
];

// ── 분류 로직 ──────────────────────────────────────────────────────────────────

function classifyEntries(
  enrolled: Student[],
  linked: TutoringUser[],
): TutoringEntry[] {
  // crmStudentId → TutoringUser (null 제외)
  const crmMap = new Map<string, TutoringUser>();
  for (const u of linked) {
    if (u.crmStudentId) crmMap.set(u.crmStudentId, u);
  }

  const entries: TutoringEntry[] = [];
  for (const student of enrolled) {
    const tu = crmMap.get(student.id);
    if (!tu) {
      // SRM 미연결 또는 구매 이력 없음
      entries.push({ student, displayStatus: 'unlinked', remainingHours: null });
      continue;
    }
    if (tu.status === 'ended') continue; // 종료 학생은 목록에서 제외

    const status = tu.status as DisplayStatus;
    entries.push({ student, displayStatus: status, remainingHours: tu.remainingHours });
  }
  return entries;
}

// ── 카드 컴포넌트 ──────────────────────────────────────────────────────────────

function TutoringCard({
  entry,
  onStudentClick,
  onRefund,
}: {
  entry: TutoringEntry;
  onStudentClick: (s: Student) => void;
  onRefund: (s: Student) => void;
}) {
  const { student, displayStatus, remainingHours } = entry;
  const meta = STATUS_META[displayStatus];

  return (
    <div
      onClick={() => onStudentClick(student)}
      className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{student.name}</span>
          {student.grade && <span className="text-xs text-gray-500">{student.grade}</span>}
          {student.is_vip && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide bg-amber-100 text-amber-700">
              <Crown size={9} />VIP
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
          {displayStatus === 'unlinked' && (
            <Link2Off size={11} className="text-gray-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">{student.parent_phone}</span>
          {remainingHours !== null && (
            <span className="text-xs text-gray-400">잔여 {remainingHours}h</span>
          )}
          {student.traffic_source && (
            <span className="text-xs text-gray-400">{student.traffic_source}</span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRefund(student); }}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
        title="환불 처리"
      >
        <RotateCcw size={12} />
        <span className="hidden sm:inline">환불</span>
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

interface EnrolledLeadsProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

export function EnrolledLeads({ adminKey, onStudentClick, onStudentUpdate }: EnrolledLeadsProps) {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [vipOnly, setVipOnly] = useState(false);
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
        setEntries(classifyEntries(enrolled, linked));
      })
      .catch(err => setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [adminKey]);

  // 서브 탭별 카운트
  const counts = useMemo(() => {
    const c: Record<SubTab, number> = {
      all: 0, unlinked: 0, active: 0, paused: 0, partial_end: 0, sales: 0,
    };
    for (const e of entries) {
      c.all++;
      if (e.displayStatus in c) (c as Record<string, number>)[e.displayStatus]++;
    }
    return c;
  }, [entries]);

  // 현재 탭 + VIP 필터 적용
  const visible = useMemo(() => {
    return entries.filter(e => {
      if (subTab !== 'all' && e.displayStatus !== subTab) return false;
      if (vipOnly && !e.student.is_vip) return false;
      return true;
    });
  }, [entries, subTab, vipOnly]);

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
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl w-fit">
        <Users size={15} className="text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-700">튜터링 유저</span>
        {!loading && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
            {counts.all}명
          </span>
        )}
      </div>

      {/* 상태 서브 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit max-w-full overflow-x-auto scrollbar-none">
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 whitespace-nowrap ${
              subTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {!loading && counts[key] > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-bold ${
                subTab === key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* VIP 토글 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVipOnly(false)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            !vipOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setVipOnly(true)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            vipOnly ? 'bg-amber-400 text-white' : 'text-gray-500 hover:text-amber-600'
          }`}
        >
          <Crown size={10} />
          VIP
        </button>
      </div>

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
            <TutoringCard
              key={entry.student.id}
              entry={entry}
              onStudentClick={onStudentClick}
              onRefund={setRefundTarget}
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
