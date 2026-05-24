'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Send } from 'lucide-react';
import { Student, CoachAssignment, MatchingStage, MATCHING_STAGE_LABELS, ChurnType } from '@/types/crm';
import { StudentCard } from './StudentCard';
import { ChurnModal } from './ChurnModal';
import { CoachOfferModal } from './CoachOfferModal';

const MATCHING_STAGES: MatchingStage[] = [
  'schedule_pending',
  'schedule_done',
  'offer_sent',
  'awaiting_response',
  'matched',
];

interface MatchingKanbanProps {
  students: Student[];
  assignments: CoachAssignment[];
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onSendOffer: (student: Student) => void;
}

interface MatchingRowProps {
  stage: MatchingStage;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onChurn: (student: Student) => void;
  onSendOffer: (student: Student) => void;
}

function MatchingRow({ stage, students, onStudentClick, onChurn, onSendOffer }: MatchingRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const showOfferButton = stage === 'schedule_done';

  return (
    <div className="flex items-stretch gap-0 border-b border-gray-200 last:border-b-0">
      {/* Stage label */}
      <div className="w-44 shrink-0 flex flex-col justify-center px-3 py-3 border-r border-gray-200">
        <p className="text-xs font-bold text-gray-600 leading-tight">
          {MATCHING_STAGE_LABELS[stage]}
        </p>
        <span className="mt-1 text-[11px] text-gray-400">{students.length}명</span>
      </div>

      {/* Cards row */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 flex items-start gap-2 overflow-x-auto px-3 py-3 min-h-[88px] transition-colors
          ${isOver ? 'bg-blue-500/10' : ''}
        `}
      >
        <SortableContext items={students.map(s => s.id)} strategy={horizontalListSortingStrategy}>
          {students.map((student) => (
            <div key={student.id} className="shrink-0 w-[200px] space-y-1">
              <StudentCard
                student={student}
                onClick={() => onStudentClick(student)}
                onChurn={() => onChurn(student)}
              />
              {showOfferButton && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendOffer(student);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/20 hover:border-blue-500/40 rounded text-xs font-medium text-blue-300 transition-all"
                >
                  <Send size={10} />
                  오퍼 발송
                </button>
              )}
            </div>
          ))}
        </SortableContext>

        {students.length === 0 && (
          <p className="text-xs text-gray-300 self-center">비어 있음</p>
        )}
      </div>
    </div>
  );
}

export function MatchingKanban({
  students,
  assignments,
  adminKey,
  onStudentUpdate,
  onStudentClick,
  onSendOffer,
}: MatchingKanbanProps) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [offerTarget, setOfferTarget] = useState<Student | null>(null);

  const eligibleStudents = students.filter(s => s.lead_status === 'enrolled');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getStudentsForStage = useCallback(
    (stage: MatchingStage) =>
      eligibleStudents.filter(s =>
        stage === 'schedule_pending'
          ? s.matching_stage === stage || s.matching_stage === null
          : s.matching_stage === stage
      ),
    [eligibleStudents]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const student = eligibleStudents.find(s => s.id === event.active.id);
    setActiveStudent(student ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStudent(null);
    const { active, over } = event;
    if (!over) return;

    const student = eligibleStudents.find(s => s.id === active.id);
    if (!student) return;

    const targetStage = MATCHING_STAGES.includes(over.id as MatchingStage)
      ? (over.id as MatchingStage)
      : eligibleStudents.find(s => s.id === over.id)?.matching_stage;

    if (!targetStage || targetStage === student.matching_stage) return;

    onStudentUpdate(student.id, { matching_stage: targetStage });
  };

  const handleSendOffer = (student: Student) => {
    setOfferTarget(student);
    onSendOffer(student);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args);
          return pointerHits.length > 0 ? pointerHits : closestCenter(args);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {eligibleStudents.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-sm">결제 완료(Stage 9) 학생이 없습니다.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {MATCHING_STAGES.map((stage) => (
              <MatchingRow
                key={stage}
                stage={stage}
                students={getStudentsForStage(stage)}
                onStudentClick={onStudentClick}
                onChurn={setChurnTarget}
                onSendOffer={handleSendOffer}
              />
            ))}
          </div>
        )}

        <DragOverlay>
          {activeStudent && (
            <div className="w-[200px]">
              <StudentCard
                student={activeStudent}
                onClick={() => {}}
                onChurn={() => {}}
                overlay
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {churnTarget && (
        <ChurnModal
          student={churnTarget}
          onConfirm={(churnTag: string, churnType: ChurnType) => {
            onStudentUpdate(churnTarget.id, {
              funnel_stage: 'churned',
              lead_status: 'inactive',
              churn_tag: churnTag,
              churn_type: churnType,
            });
            setChurnTarget(null);
          }}
          onClose={() => setChurnTarget(null)}
        />
      )}

      {offerTarget && (
        <CoachOfferModal
          student={offerTarget}
          adminKey={adminKey}
          onSent={() => {
            onStudentUpdate(offerTarget.id, { matching_stage: 'offer_sent' });
            setOfferTarget(null);
          }}
          onClose={() => setOfferTarget(null)}
        />
      )}
    </>
  );
}
