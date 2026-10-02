'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Student, RetryStage } from '@/types/crm';
import { StudentCard } from '../StudentCard';
import { getDaysAssigned } from './retry-board-utils';

interface RetryColumnProps {
  stage: RetryStage;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onRemove: (student: Student) => void;
}

export const RetryColumn = memo(function RetryColumn({ stage, students, onStudentClick, onRemove }: RetryColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col w-40 sm:w-44 shrink-0">
      <div className="px-2 py-2 border-b border-gray-200">
        <p className="text-[11px] font-semibold leading-tight truncate text-gray-600">{stage}</p>
        <span className="text-[10px] text-gray-400">{students.length}명</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 p-1.5 flex flex-col gap-1.5 transition-colors ${isOver ? 'bg-blue-50' : ''}`}
      >
        <SortableContext items={students.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {students.map(s => {
            const days = getDaysAssigned(s.retry_assigned_at);
            return (
              <div key={s.id} className="flex flex-col gap-0.5">
                <StudentCard
                  student={s}
                  onClick={() => onStudentClick(s)}
                  onChurn={() => onRemove(s)}
                />
                {days !== null && (
                  <p className="text-[10px] text-gray-400 pl-1">
                    배정 {days === 0 ? '오늘' : `${days}일째`}
                  </p>
                )}
              </div>
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
});
