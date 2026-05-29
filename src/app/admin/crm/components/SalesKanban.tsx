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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Student, FunnelStage, FUNNEL_STAGE_LABELS, ChurnType } from '@/types/crm';
import { StudentCard } from './StudentCard';
import { ChurnModal } from './ChurnModal';
import { PaymentModal } from './PaymentModal';

const SALES_STAGES: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];

interface SalesKanbanProps {
  students: Student[];
  followUpCount: number;
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onAddStudent?: () => void;
}

interface KanbanRowProps {
  stage: FunnelStage;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onChurn: (student: Student) => void;
  onPayment: (student: Student) => void;
  onAdd?: () => void;
}

function KanbanColumn({ stage, students, onStudentClick, onChurn, onPayment, onAdd }: KanbanRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col w-44 shrink-0">
      {/* Column header */}
      <div className="px-2 py-2 border-b border-gray-200">
        <p className="text-[11px] font-bold text-gray-600 leading-tight truncate">
          {stage}. {FUNNEL_STAGE_LABELS[stage]}
        </p>
        <span className="text-[10px] text-gray-400">{students.length}명</span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-1.5 min-h-[120px] transition-colors ${isOver ? 'bg-blue-500/10' : ''}`}
      >
        <SortableContext items={students.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={() => onStudentClick(student)}
              onChurn={() => onChurn(student)}
              onPayment={() => onPayment(student)}
            />
          ))}
        </SortableContext>

        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-gray-200 text-[11px] text-gray-400 hover:text-blue-400 hover:border-blue-400/40 hover:bg-blue-500/5 transition-colors"
          >
            <Plus size={11} />
            추가
          </button>
        )}

        {students.length === 0 && !onAdd && (
          <p className="text-[10px] text-gray-300 text-center pt-2">비어 있음</p>
        )}
      </div>
    </div>
  );
}

export function SalesKanban({ students, followUpCount, adminKey, onStudentUpdate, onStudentClick, onAddStudent }: SalesKanbanProps) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getStudentsForStage = useCallback(
    (stage: FunnelStage) => students.filter(s => s.funnel_stage === stage && s.lead_status === 'active'),
    [students]
  );

  const reactivatingStudents = students.filter(s => s.lead_status === 'reactivating');

  const handleDragStart = (event: DragStartEvent) => {
    const student = students.find(s => s.id === event.active.id);
    setActiveStudent(student ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStudent(null);
    const { active, over } = event;
    if (!over) return;

    const student = students.find(s => s.id === active.id);
    if (!student) return;

    const targetStage = SALES_STAGES.includes(over.id as FunnelStage)
      ? (over.id as FunnelStage)
      : students.find(s => s.id === over.id && s.lead_status === 'active')?.funnel_stage;

    if (!targetStage || targetStage === student.funnel_stage) return;

    onStudentUpdate(student.id, { funnel_stage: targetStage });
  };

  return (
    <>
      {followUpCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-700">
            팔로업 필요: {followUpCount}명 — 5일 이상 미연락
          </p>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args);
          return pointerHits.length > 0 ? pointerHits : closestCenter(args);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-max min-w-full">
            {SALES_STAGES.map((stage, i) => (
              <div key={stage} className={`flex ${i < SALES_STAGES.length - 1 ? 'border-r border-gray-200' : ''}`}>
                <KanbanColumn
                  stage={stage}
                  students={getStudentsForStage(stage)}
                  onStudentClick={onStudentClick}
                  onChurn={setChurnTarget}
                  onPayment={setPaymentTarget}
                  onAdd={stage === '1' ? onAddStudent : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeStudent && (
            <div className="w-[200px]">
              <StudentCard
                student={activeStudent}
                onClick={() => {}}
                onChurn={() => {}}
                onPayment={undefined}
                overlay
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Reactivating section */}
      {reactivatingStudents.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <RefreshCw size={13} className="text-amber-500" />
            <p className="text-xs font-bold text-amber-700">재활성화 시도 중</p>
            <span className="text-xs text-amber-500">{reactivatingStudents.length}명</span>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {reactivatingStudents.map(student => (
              <div
                key={student.id}
                onClick={() => onStudentClick(student)}
                className="bg-white border border-amber-200 rounded-lg px-3 py-2 cursor-pointer hover:border-amber-400 transition-colors"
              >
                <p className="text-xs font-medium text-gray-700">{student.name}</p>
                <p className="text-[10px] text-amber-500 mt-0.5">{student.grade}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {paymentTarget && (
        <PaymentModal
          student={paymentTarget}
          adminKey={adminKey}
          onConfirm={(updatedStudent) => {
            onStudentUpdate(paymentTarget.id, { lead_status: updatedStudent.lead_status });
            setPaymentTarget(null);
          }}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </>
  );
}
