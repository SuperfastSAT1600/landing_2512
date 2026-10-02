'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Student, RetryStage, RETRY_STAGES } from '@/types/crm';
import { optimisticUpdate } from '../../lib/optimistic';

interface UseRetryDragOptions {
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  headers: Record<string, string>;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

/** 단계 간 드래그 — 화면을 먼저 옮기고 PATCH 실패 시 optimisticUpdate가 되돌린다. */
export function useRetryDrag({ students, setStudents, headers, onStudentUpdate }: UseRetryDragOptions) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const s = students.find(s => s.id === active.id);
    setActiveStudent(s ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveStudent(null);
    if (!over || active.id === over.id) return;
    const stage = over.id as RetryStage;
    if (!RETRY_STAGES.includes(stage)) return;
    const student = students.find(s => s.id === active.id);
    if (!student || student.retry_stage === stage) return;

    const prevStage = student.retry_stage;
    const setStage = (st: typeof prevStage) =>
      setStudents(prev => prev.map(s => s.id === active.id ? { ...s, retry_stage: st } : s));
    const saved = await optimisticUpdate({
      apply: () => setStage(stage),
      revert: () => setStage(prevStage),
      request: () => fetch(`/api/crm/students/${active.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ retry_stage: stage }),
      }),
      failMessage: '단계 이동 저장에 실패했습니다.',
    });
    if (saved) onStudentUpdate(active.id as string, { retry_stage: stage });
  };

  return { activeStudent, handleDragStart, handleDragEnd };
}
