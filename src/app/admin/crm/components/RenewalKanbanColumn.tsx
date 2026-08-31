'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  RENEWAL_STAGE_LABELS,
  isRenewalCarried,
  type RenewalOutcomeQuality,
  type RenewalStage,
  type RenewalTarget,
} from '@/types/crm';
import { RenewalCard, type RenewalCardTutoring } from './RenewalCard';

interface RenewalKanbanColumnProps {
  stage: RenewalStage;
  targets: RenewalTarget[];
  nowMs: number;
  tutoringByStudentId: Map<string, RenewalCardTutoring>;
  showWeekBadge: boolean;
  onCardClick: (target: RenewalTarget) => void;
  onPayment?: (target: RenewalTarget) => void;
  onDrop?: (target: RenewalTarget) => void;
  onRemove?: (target: RenewalTarget) => void;
  onReopen?: (target: RenewalTarget) => void;
  onEditQuality?: (target: RenewalTarget, quality: RenewalOutcomeQuality) => void;
}

// 4(결제 완료)=emerald, 5(미전환)=무채색, 1~3=기본
const STAGE_TONE: Record<RenewalStage, { header: string; title: string; count: string }> = {
  '1': { header: 'border-gray-200', title: 'text-gray-600', count: 'text-gray-400' },
  '2': { header: 'border-gray-200', title: 'text-gray-600', count: 'text-gray-400' },
  '3': { header: 'border-amber-300 bg-amber-50', title: 'text-amber-700', count: 'text-amber-500' },
  '4': { header: 'border-emerald-300 bg-emerald-50', title: 'text-emerald-700', count: 'text-emerald-500' },
  '5': { header: 'border-gray-300 bg-gray-50', title: 'text-gray-500', count: 'text-gray-400' },
};

export function RenewalKanbanColumn({
  stage,
  targets,
  nowMs,
  tutoringByStudentId,
  showWeekBadge,
  onCardClick,
  onPayment,
  onDrop,
  onRemove,
  onReopen,
  onEditQuality,
}: RenewalKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const tone = STAGE_TONE[stage];
  // 이월된 행은 이 컬럼에 남아 '누가 이월됐는지'를 보여주지만 진행 중 인원은 아니다.
  const carried = targets.filter(isRenewalCarried).length;
  const live = targets.length - carried;

  return (
    <div className="flex flex-col flex-1 min-w-40 sm:min-w-44">
      <div className={`px-2 py-2 border-b ${tone.header}`}>
        <p className={`text-[11px] font-semibold leading-tight truncate ${tone.title}`}>
          {stage}. {RENEWAL_STAGE_LABELS[stage]}
        </p>
        <span className={`text-[10px] ${tone.count}`}>
          {live}명
          {carried > 0 && <span className="text-gray-400"> · 이월 {carried}</span>}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-1.5 min-h-[120px] transition-colors ${isOver ? 'bg-blue-500/10' : ''}`}
      >
        <SortableContext items={targets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {targets.map((target) => (
            <RenewalCard
              key={target.id}
              target={target}
              tutoring={tutoringByStudentId.get(target.student_id) ?? null}
              nowMs={nowMs}
              showWeekBadge={showWeekBadge}
              onClick={() => onCardClick(target)}
              onPayment={onPayment && (() => onPayment(target))}
              onDrop={onDrop && (() => onDrop(target))}
              onRemove={onRemove && (() => onRemove(target))}
              onReopen={onReopen && (() => onReopen(target))}
              onEditQuality={onEditQuality && ((q) => onEditQuality(target, q))}
            />
          ))}
        </SortableContext>
        {targets.length === 0 && (
          <p className="text-[10px] text-gray-300 text-center pt-2">비어 있음</p>
        )}
      </div>
    </div>
  );
}
