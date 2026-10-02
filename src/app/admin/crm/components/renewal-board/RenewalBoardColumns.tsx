'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  RENEWAL_OPEN_STAGES,
  RENEWAL_STAGES,
  type RenewalOutcomeQuality,
  type RenewalStage,
  type RenewalTarget,
} from '@/types/crm';
import { RenewalCard, type RenewalCardTutoring } from '../RenewalCard';
import { RenewalKanbanColumn } from '../RenewalKanbanColumn';

interface RenewalBoardColumnsProps {
  targetsByStage: Map<RenewalStage, RenewalTarget[]>;
  activeTarget: RenewalTarget | null | undefined;
  nowMs: number;
  tutoringByStudentId: Map<string, RenewalCardTutoring>;
  showWeekBadge: boolean;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onCardClick: (target: RenewalTarget) => void;
  onPayment: (target: RenewalTarget) => void;
  onDrop: (target: RenewalTarget) => void;
  onRemove: (target: RenewalTarget) => void;
  onReopen: (target: RenewalTarget) => void;
  onMemoSave: (target: RenewalTarget, memo: string) => void;
  onContactDateSave: (target: RenewalTarget, date: string | null) => void;
  onEditQuality: (target: RenewalTarget, quality: RenewalOutcomeQuality) => void;
}

/** 단계 컬럼 5개 + 드래그 컨텍스트. 단계별로 쓸 수 있는 액션만 컬럼에 내려준다. */
export function RenewalBoardColumns({
  targetsByStage,
  activeTarget,
  nowMs,
  tutoringByStudentId,
  showWeekBadge,
  onDragStart,
  onDragEnd,
  onCardClick,
  onPayment,
  onDrop,
  onRemove,
  onReopen,
  onMemoSave,
  onContactDateSave,
  onEditQuality,
}: RenewalBoardColumnsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const hits = pointerWithin(args);
        return hits.length > 0 ? hits : closestCenter(args);
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="w-full overflow-x-auto pt-2" style={{ transform: 'rotateX(180deg)' }}>
        <div
          className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-max min-w-full"
          style={{ transform: 'rotateX(180deg)' }}
        >
          {RENEWAL_STAGES.map((stage, index) => (
            <div
              key={stage}
              className={`flex flex-1 min-w-0 ${index < RENEWAL_STAGES.length - 1 ? 'border-r border-gray-200' : ''}`}
            >
              <RenewalKanbanColumn
                stage={stage}
                targets={targetsByStage.get(stage) ?? []}
                nowMs={nowMs}
                tutoringByStudentId={tutoringByStudentId}
                showWeekBadge={showWeekBadge}
                onCardClick={onCardClick}
                onPayment={stage === '3' ? onPayment : undefined}
                onDrop={RENEWAL_OPEN_STAGES.includes(stage) ? onDrop : undefined}
                onRemove={RENEWAL_OPEN_STAGES.includes(stage) ? onRemove : undefined}
                onReopen={stage === '5' ? onReopen : undefined}
                onMemoSave={onMemoSave}
                onContactDateSave={RENEWAL_OPEN_STAGES.includes(stage) ? onContactDateSave : undefined}
                onEditQuality={stage === '4' || stage === '5' ? onEditQuality : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTarget && (
          <div className="w-[200px]">
            <RenewalCard
              target={activeTarget}
              tutoring={tutoringByStudentId.get(activeTarget.student_id) ?? null}
              nowMs={nowMs}
              onClick={() => {}}
              overlay
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
