import { Student, ReactivationEntry, FunnelStage, FUNNEL_STAGE_LABELS } from '@/types/crm';
import { FUNNEL_FLOW_ORDER, effectiveChurnStage } from '@/lib/funnel-stats';
import { churnedDaysAgo } from './filters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function lastConsultationSnippet(student: Student): string {
  const timeline = student.consultation_timeline ?? [];
  if (timeline.length === 0) return '';
  const latest = [...timeline].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  return (latest.ai_purified ?? latest.raw_memo ?? '').slice(0, 60);
}

// ─── Outcome Badge ─────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<ReactivationEntry['outcome'], string> = {
  pending: 'bg-gray-100 text-gray-600',
  no_response: 'bg-orange-100 text-orange-700',
  reactivated: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const OUTCOME_LABELS: Record<ReactivationEntry['outcome'], string> = {
  pending: '대기 중',
  no_response: '반응 없음',
  reactivated: '재활성화',
  rejected: '거절',
};

// ─── StudentPoolCard ───────────────────────────────────────────────────────────

interface StudentPoolCardProps {
  student: Student;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  onSetChurnStage: (id: string, stage: FunnelStage) => void;
}

export function StudentPoolCard({
  student,
  selected,
  onToggle,
  onClick,
  onSetChurnStage,
}: StudentPoolCardProps) {
  const churnStage = effectiveChurnStage(student);
  const daysAgo = churnedDaysAgo(student);
  const snippet = lastConsultationSnippet(student);
  const log = student.reactivation_log ?? [];
  const lastEntry =
    log.length > 0 ? [...log].sort((a, b) => (a.attempted_at < b.attempted_at ? 1 : -1))[0] : null;
  const isReactivating = student.lead_status === 'reactivating';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
        selected
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {/* Checkbox — click stops propagation so card click doesn't also toggle */}
      <div onClick={onToggle} className="mt-1 flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{student.name}</span>
            <span className="text-xs text-gray-500">{student.grade}</span>
            {isReactivating && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                재활성화 시도 중
              </span>
            )}
            {student.churn_type && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  student.churn_type === 'closed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {student.churn_type === 'closed' ? '완전 이탈' : '잠재 이탈'}
              </span>
            )}
            {student.churn_tag && (
              <span
                title={student.churn_tag}
                className="inline-block align-bottom text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[220px] truncate"
              >
                {student.churn_tag}
              </span>
            )}
            {churnStage ? (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                ✘ {FUNNEL_STAGE_LABELS[churnStage]} 이탈
              </span>
            ) : (
              <select
                value=""
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.value) onSetChurnStage(student.id, e.target.value as FunnelStage);
                }}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-500 bg-white focus:outline-none"
                title="이탈 단계 수동 지정"
              >
                <option value="">단계 지정</option>
                {FUNNEL_FLOW_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {FUNNEL_STAGE_LABELS[st]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">{daysAgo}일 경과</span>
        </div>

        {snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{snippet}...</p>}

        {lastEntry && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400">
              마지막 시도: {new Date(lastEntry.attempted_at).toLocaleDateString('ko-KR')}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTCOME_COLORS[lastEntry.outcome]}`}
            >
              {OUTCOME_LABELS[lastEntry.outcome]}
            </span>
          </div>
        )}

        <p className="text-[10px] text-blue-400 mt-1.5">클릭하여 상담 이력 보기</p>
      </div>
    </div>
  );
}
