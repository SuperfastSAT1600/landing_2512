'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, RefreshCw } from 'lucide-react';
import {
  Student,
  FunnelStage,
  FUNNEL_STAGE_LABELS,
  ChurnType,
  daysInStage,
  isStageStalled,
  effectiveLeadTier,
} from '@/types/crm';
import { StudentCard } from './StudentCard';
import { ChurnModal } from './ChurnModal';
import { PaymentModal } from './PaymentModal';

// 최초 세일즈 칸반: 진행 중(0~7) + 결제완료·가입대기(8).
// 8번은 결제 완료 후 회원가입/카톡 단톡방 개설을 추적하는 컬럼 — 회원가입 완료 시 칸반에서 제거.
// 이탈(churned)은 "이탈 리드풀" 탭에서만 본다.
const SALES_STAGES: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7', '8'];

// 8번 컬럼 헤더는 결제완료 의미로 표시한다(FUNNEL_STAGE_LABELS['8']='수업 중'은 수업중 탭 전용).
const KANBAN_STAGE_LABEL = (stage: FunnelStage) =>
  stage === '8' ? '결제 완료' : FUNNEL_STAGE_LABELS[stage];

interface SalesKanbanProps {
  students: Student[];
  adminKey: string;
  searchQuery?: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
}

interface KanbanRowProps {
  stage: FunnelStage;
  students: Student[];
  nowMs: number;
  onStudentClick: (student: Student) => void;
  onChurn: (student: Student) => void;
  onPayment: (student: Student) => void;
  onToggleSignup: (student: Student) => void;
  onKakaoCreate: (student: Student) => void;
  onAdd?: () => void;
  isSearchMatch?: boolean;
}

function KanbanColumn({ stage, students, nowMs, onStudentClick, onChurn, onPayment, onToggleSignup, onKakaoCreate, onAdd, isSearchMatch }: KanbanRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const isEnrollmentStage = stage === '8';

  const header = (
    <div className={`px-2 py-2 border-b ${isSearchMatch ? 'border-blue-400 bg-blue-50' : isEnrollmentStage ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
      <p className={`text-[11px] font-bold leading-tight truncate ${isSearchMatch ? 'text-blue-600' : isEnrollmentStage ? 'text-emerald-700' : 'text-gray-600'}`}>
        {stage}. {KANBAN_STAGE_LABEL(stage)}
      </p>
      <span className={`text-[10px] ${isSearchMatch ? 'text-blue-400' : isEnrollmentStage ? 'text-emerald-500' : 'text-gray-400'}`}>{students.length}명</span>
    </div>
  );

  return (
    <div className="flex flex-col w-44 shrink-0">
      {header}

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
              stalledDays={isEnrollmentStage ? null : (isStageStalled(student, nowMs) ? daysInStage(student, nowMs) : null)}
              leadTier={isEnrollmentStage ? null : effectiveLeadTier(student, nowMs)}
              onClick={() => onStudentClick(student)}
              onChurn={() => onChurn(student)}
              onPayment={isEnrollmentStage ? undefined : () => onPayment(student)}
              enrollmentMode={isEnrollmentStage}
              onToggleSignup={() => onToggleSignup(student)}
              onKakaoCreate={() => onKakaoCreate(student)}
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

export function SalesKanban({ students, adminKey, searchQuery, onStudentUpdate, onStudentClick }: SalesKanbanProps) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);
  // 경과 일수 계산 기준 시각 — 마운트 시 1회 캡처 (render 중 Date.now 직접 호출 회피)
  const [nowMs] = useState(() => Date.now());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!searchQuery?.trim()) return;

    const targetStage = SALES_STAGES.find(stage =>
      students.some(s => s.funnel_stage === stage && s.lead_status === 'active')
    );
    if (!targetStage) return;

    const columnEl = columnRefs.current[targetStage];
    const containerEl = scrollContainerRef.current;
    if (!columnEl || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const columnRect = columnEl.getBoundingClientRect();
    const scrollLeft = columnRect.left - containerRect.left + containerEl.scrollLeft;
    containerEl.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [searchQuery, students]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getStudentsForStage = useCallback(
    (stage: FunnelStage) => {
      const list = students.filter(s =>
        s.funnel_stage === stage && !s.retry_strategy_id &&
        // 8번(결제완료)은 단톡방 개설 전(미완료) 학생만 — lead_status 무관(enrolled). 그 외는 active 리드.
        // 온보딩 순서: 회원가입 확인(signup_done_at) → 단톡방 개설(kakao_chat_created, 완료 시 제거)
        (stage === '8' ? !s.kakao_chat_created : s.lead_status === 'active')
      );
      return [...list].sort((a, b) => {
        const ao = a.sort_order ?? Infinity;
        const bo = b.sort_order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
    [students]
  );

  const reactivatingStudents = students.filter(s => s.lead_status === 'reactivating' && !s.retry_strategy_id);

  // 8번 컬럼 온보딩: 회원가입 확인 토글 → 단톡방 개설(칸반에서 제거)
  const handleToggleSignup = useCallback(
    (student: Student) => onStudentUpdate(student.id, { signup_done_at: student.signup_done_at ? null : new Date().toISOString() }),
    [onStudentUpdate]
  );
  const handleKakaoCreate = useCallback(
    (student: Student) => onStudentUpdate(student.id, { kakao_chat_created: true }),
    [onStudentUpdate]
  );

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

    if (!targetStage) return;

    // 8번(결제완료)은 드래그 진입/이탈 금지 — 진입은 결제로만, 퇴장은 '회원가입 완료' 버튼으로만.
    if (targetStage === '8' || student.funnel_stage === '8') return;

    // 컬럼 간 이동
    if (targetStage !== student.funnel_stage) {
      onStudentUpdate(student.id, { funnel_stage: targetStage, funnel_stage_updated_at: new Date().toISOString() });
      return;
    }

    // 같은 컬럼 내 순서 변경
    const columnStudents = getStudentsForStage(student.funnel_stage);
    const oldIndex = columnStudents.findIndex(s => s.id === active.id);
    const newIndex = columnStudents.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(columnStudents, oldIndex, newIndex);
    reordered.forEach((s, i) => {
      if (s.sort_order !== i) {
        onStudentUpdate(s.id, { sort_order: i });
      }
    });
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
        <div ref={scrollContainerRef} className="w-full overflow-x-auto pt-2" style={{ transform: 'rotateX(180deg)' }}>
          <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-max min-w-full" style={{ transform: 'rotateX(180deg)' }}>
            {SALES_STAGES.map((stage, i) => (
              <div
                key={stage}
                ref={el => { columnRefs.current[stage] = el; }}
                className={`flex ${i < SALES_STAGES.length - 1 ? 'border-r border-gray-200' : ''}`}
              >
                <KanbanColumn
                  stage={stage}
                  students={getStudentsForStage(stage)}
                  nowMs={nowMs}
                  onStudentClick={onStudentClick}
                  onChurn={setChurnTarget}
                  onPayment={setPaymentTarget}
                  onToggleSignup={handleToggleSignup}
                  onKakaoCreate={handleKakaoCreate}
                  onAdd={undefined}
                  isSearchMatch={!!searchQuery?.trim() && getStudentsForStage(stage).length > 0}
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
