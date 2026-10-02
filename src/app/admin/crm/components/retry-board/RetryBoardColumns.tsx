'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { Student, RetryStage, RETRY_STAGES } from '@/types/crm';
import { StudentCard } from '../StudentCard';
import { RetryColumn } from './RetryColumn';

interface RetryBoardColumnsProps {
  studentsByStage: Map<RetryStage, Student[]>;
  activeStudent: Student | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onStudentClick: (student: Student) => void;
  onRemove: (student: Student) => void;
}

/** 재시도 단계 컬럼 + 드래그 컨텍스트. */
export function RetryBoardColumns({
  studentsByStage,
  activeStudent,
  onDragStart,
  onDragEnd,
  onStudentClick,
  onRemove,
}: RetryBoardColumnsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3">
        {RETRY_STAGES.map(stage => (
          <RetryColumn
            key={stage}
            stage={stage}
            students={studentsByStage.get(stage) ?? []}
            onStudentClick={onStudentClick}
            onRemove={onRemove}
          />
        ))}
      </div>

      <DragOverlay>
        {activeStudent && (
          <StudentCard
            student={activeStudent}
            onClick={() => {}}
            onChurn={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
