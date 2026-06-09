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
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Student, FunnelStage, FUNNEL_STAGE_LABELS, ChurnType } from '@/types/crm';
import { StudentCard } from './StudentCard';
import { ChurnModal } from './ChurnModal';
import { PaymentModal } from './PaymentModal';

const SALES_STAGES: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];
// 결제 완료(수업 중) — 표시 전용 컬럼. 드래그 대상이 아니며 enrolled 리드를 별도 조회해 보여준다.
const ENROLLED_STAGE: FunnelStage = '8';
// 이번 달 이탈 — 표시 전용 컬럼. churned 리드를 별도 조회해 현재 달력 월 이탈 건만 보여준다.
const CHURNED_STAGE: FunnelStage = 'churned';
const ALL_COLUMNS: FunnelStage[] = [...SALES_STAGES, ENROLLED_STAGE, CHURNED_STAGE];
// 표시 전용 컬럼 헤더 표기 (stage 키와 무관한 별도 라벨)
const COLUMN_TITLES: Partial<Record<FunnelStage, string>> = {
  [CHURNED_STAGE]: '9. 이탈 (이번 달)',
};

/** 이탈 시점: stage_history의 마지막 churned 엔트리 entered_at (없으면 funnel_stage_updated_at). */
function churnedAt(s: Student): string | null {
  const history = s.stage_history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].stage === 'churned') return history[i].entered_at;
  }
  return s.funnel_stage_updated_at;
}

interface SalesKanbanProps {
  students: Student[];
  followUpStudents: Student[];
  adminKey: string;
  searchQuery?: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
}

type ReadOnlyTone = 'enrolled' | 'churned';

interface KanbanRowProps {
  stage: FunnelStage;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onChurn: (student: Student) => void;
  onPayment: (student: Student) => void;
  onAdd?: () => void;
  isSearchMatch?: boolean;
  readOnly?: boolean;
  readOnlyTone?: ReadOnlyTone;
  paidAmounts?: Record<string, number>;
}

// 오늘 날짜 기준 팔로업 완료 체크 저장 키 (자정 지나면 새 키 → 목록 자동 리셋)
function followUpDoneKey(): string {
  return `crm-followup-done-${new Date().toISOString().slice(0, 10)}`;
}

function loadFollowUpDone(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(followUpDoneKey());
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function formatMan(amount: number): string {
  return `${Math.round(amount / 10000).toLocaleString()}만원`;
}

function formatChurnDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getMonth() + 1}/${d.getDate()} 이탈`;
}

function KanbanColumn({ stage, students, onStudentClick, onChurn, onPayment, onAdd, isSearchMatch, readOnly, readOnlyTone = 'enrolled', paidAmounts }: KanbanRowProps) {
  // 표시 전용 컬럼(8·9단계)은 드롭 타깃이 아니다.
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: readOnly });
  const isChurned = readOnlyTone === 'churned';

  const readOnlyHeaderColor = isChurned ? 'text-rose-600' : 'text-emerald-600';
  const header = (
    <div className={`px-2 py-2 border-b ${isSearchMatch ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
      <p className={`text-[11px] font-bold leading-tight truncate ${isSearchMatch ? 'text-blue-600' : readOnly ? readOnlyHeaderColor : 'text-gray-600'}`}>
        {COLUMN_TITLES[stage] ?? `${stage}. ${FUNNEL_STAGE_LABELS[stage]}`}
      </p>
      <span className={`text-[10px] ${isSearchMatch ? 'text-blue-400' : 'text-gray-400'}`}>{students.length}명</span>
    </div>
  );

  // 표시 전용: 드래그/인라인 액션 없는 단순 클릭 카드
  if (readOnly) {
    return (
      <div className={`flex flex-col w-44 shrink-0 ${isChurned ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
        {header}
        <div className="flex-1 p-2 space-y-1.5 min-h-[120px]">
          {students.map((student) => {
            const amount = paidAmounts?.[student.id] ?? (student.name ? paidAmounts?.[student.name] : undefined);
            const churnLabel = isChurned ? formatChurnDate(churnedAt(student)) : null;
            return (
              <button
                key={student.id}
                onClick={() => onStudentClick(student)}
                className={`w-full text-left bg-white border rounded-lg px-3 py-2 transition-colors ${isChurned ? 'border-rose-100 hover:border-rose-300' : 'border-emerald-100 hover:border-emerald-300'}`}
              >
                <p className="text-xs font-medium text-gray-800 truncate">{student.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  {student.grade && <span className="text-[10px] text-gray-400">{student.grade}</span>}
                  {isChurned
                    ? churnLabel && <span className="text-[10px] font-semibold text-rose-500">{churnLabel}</span>
                    : typeof amount === 'number' && amount > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600">{formatMan(amount)}</span>
                      )}
                </div>
              </button>
            );
          })}
          {students.length === 0 && (
            <p className="text-[10px] text-gray-300 text-center pt-2">비어 있음</p>
          )}
        </div>
      </div>
    );
  }

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

export function SalesKanban({ students, followUpStudents, adminKey, searchQuery, onStudentUpdate, onStudentClick }: SalesKanbanProps) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [churnTarget, setChurnTarget] = useState<Student | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);
  // 오늘 체크해서 지운 팔로업 액션 id — 날짜별로 localStorage에 보존 (자정 지나면 자동 초기화)
  const [doneActions, setDoneActions] = useState<Set<string>>(loadFollowUpDone);
  // 미연락 일수 계산 기준 시각 — 마운트 시 1회 캡처 (render 중 Date.now 직접 호출 회피)
  const [nowMs] = useState(() => Date.now());
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  // 이번 달 이탈 리드 — 표시 전용 9단계 컬럼용
  const [churnedStudents, setChurnedStudents] = useState<Student[]>([]);
  // 학생별 총 결제액 (id 우선, 없으면 이름) — 환불(음수) 포함 순액
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({});

  // 결제 완료(수업 중) 리드 + 결제액 — 표시 전용 8단계 컬럼용 별도 조회
  useEffect(() => {
    if (!adminKey) return;
    const headers = { 'x-admin-key': adminKey };
    Promise.all([
      fetch('/api/crm/students?lead_status=enrolled', { headers }).then(r => (r.ok ? r.json() : { data: [] })),
      fetch('/api/crm/payments', { headers }).then(r => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([studentsJson, paymentsJson]) => {
        setEnrolledStudents((studentsJson.data ?? []).filter((s: Student) => s.funnel_stage === '8'));
        const map: Record<string, number> = {};
        for (const p of (paymentsJson.data ?? []) as { student_id?: string | null; student_name?: string | null; amount?: number }[]) {
          const key = p.student_id || p.student_name;
          if (!key || typeof p.amount !== 'number') continue;
          map[key] = (map[key] ?? 0) + p.amount;
        }
        setPaidAmounts(map);
      })
      .catch(() => {});
  }, [adminKey]);

  // 이번 달 이탈 리드 — 표시 전용 9단계 컬럼용 별도 조회 (현재 달력 월 이탈 건만)
  useEffect(() => {
    if (!adminKey) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    fetch('/api/crm/students?lead_status=inactive&stage=churned', { headers: { 'x-admin-key': adminKey } })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(({ data }) => {
        const thisMonth = ((data ?? []) as Student[]).filter((s) => {
          const at = churnedAt(s);
          return !!at && new Date(at).getTime() >= monthStart;
        });
        setChurnedStudents(thisMonth);
      })
      .catch(() => {});
  }, [adminKey]);

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
      // 8단계는 표시 전용 — 결제 완료(enrolled) 리드를 별도 목록에서 가져온다
      if (stage === ENROLLED_STAGE) {
        return [...enrolledStudents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      // 9단계는 표시 전용 — 이번 달 이탈 리드를 이탈일 최신순으로 가져온다
      if (stage === CHURNED_STAGE) {
        return [...churnedStudents].sort(
          (a, b) => new Date(churnedAt(b) ?? 0).getTime() - new Date(churnedAt(a) ?? 0).getTime()
        );
      }
      const list = students.filter(
        s => s.funnel_stage === stage && s.lead_status === 'active' && !s.retry_strategy_id
      );
      return [...list].sort((a, b) => {
        const ao = a.sort_order ?? Infinity;
        const bo = b.sort_order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
    [students, enrolledStudents, churnedStudents]
  );

  const markActionDone = useCallback((id: string) => {
    setDoneActions(prev => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(followUpDoneKey(), JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  // 우선순위 순(가장 오래 미연락 = 최우선)으로 나래비, 체크 완료한 건은 제외
  const followUpActions = [...followUpStudents]
    .map(s => ({
      student: s,
      days: s.last_contacted_at
        ? Math.floor((nowMs - new Date(s.last_contacted_at).getTime()) / 86400000)
        : null,
    }))
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
    .filter(a => !doneActions.has(a.student.id));

  const reactivatingStudents = students.filter(s => s.lead_status === 'reactivating' && !s.retry_strategy_id);

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
    // 결제 완료(enrolled) 리드는 8단계 표시 전용 — 드래그로 빼낼 수 없다
    if (student.lead_status === 'enrolled') return;

    const targetStage = SALES_STAGES.includes(over.id as FunnelStage)
      ? (over.id as FunnelStage)
      : students.find(s => s.id === over.id && s.lead_status === 'active')?.funnel_stage;

    if (!targetStage) return;
    // 8단계(수업 중)로는 드롭 불가 — 결제로만 진입 (active 리드가 8단계로 가면 데이터 불일치)
    if (targetStage === ENROLLED_STAGE) return;

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
      {followUpActions.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <p className="flex-1 text-sm font-medium text-amber-700">
              오늘 팔로업 액션: {followUpActions.length}건 — 우선순위 순 (5일 이상 미연락)
            </p>
          </div>
          <ol className="divide-y divide-amber-100">
            {followUpActions.map(({ student: s, days }, idx) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-amber-100/60 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => markActionDone(s.id)}
                  className="w-4 h-4 shrink-0 rounded border-amber-300 accent-amber-600 cursor-pointer"
                  aria-label={`${s.name} 팔로업 완료`}
                  title="완료로 체크하면 목록에서 사라집니다"
                />
                <span className="w-5 shrink-0 text-center text-xs font-bold text-amber-400">
                  {idx + 1}
                </span>
                <button
                  onClick={() => onStudentClick(s)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-amber-800">{s.name}</span>
                  <span className="text-xs text-amber-500">
                    {days !== null ? `${days}일 전 연락` : '연락 기록 없음'}
                  </span>
                </button>
              </li>
            ))}
          </ol>
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
        <div ref={scrollContainerRef} className="w-full overflow-x-auto pt-2" style={{ transform: 'rotateX(180deg)' }}>
          <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-max min-w-full" style={{ transform: 'rotateX(180deg)' }}>
            {ALL_COLUMNS.map((stage, i) => (
              <div
                key={stage}
                ref={el => { columnRefs.current[stage] = el; }}
                className={`flex ${i < ALL_COLUMNS.length - 1 ? 'border-r border-gray-200' : ''}`}
              >
                <KanbanColumn
                  stage={stage}
                  students={getStudentsForStage(stage)}
                  onStudentClick={onStudentClick}
                  onChurn={setChurnTarget}
                  onPayment={setPaymentTarget}
                  onAdd={undefined}
                  isSearchMatch={!!searchQuery?.trim() && stage !== ENROLLED_STAGE && stage !== CHURNED_STAGE && getStudentsForStage(stage).length > 0}
                  readOnly={stage === ENROLLED_STAGE || stage === CHURNED_STAGE}
                  readOnlyTone={stage === CHURNED_STAGE ? 'churned' : 'enrolled'}
                  paidAmounts={stage === ENROLLED_STAGE ? paidAmounts : undefined}
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
