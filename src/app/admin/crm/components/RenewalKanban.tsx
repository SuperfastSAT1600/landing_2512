'use client';

// 재결제 세일즈 보드.
// 존재 목적은 '주차별 재결제 인원과 결제 전환율' 측정이므로 두 개의 스코프를 갖는다:
//  - 진행 중 전체(기본): 코호트 무관 1~3단계 — 일상 운영 화면
//  - 특정 주차: 그 코호트의 5단계 전부 — 주차별 표의 한 행과 정확히 일치
// 4(결제 완료)·5(미전환)는 터미널. 진입은 버튼으로만, 드래그로는 오갈 수 없다.

import { useCallback, useMemo, useState } from 'react';
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
  type RenewalStage,
  type RenewalTarget,
  type Student,
} from '@/types/crm';
import { UserPlus } from 'lucide-react';
import { getCurrentWeekDef, getWeekLabel } from '@/lib/week-definitions';
import { PaymentModal } from './PaymentModal';
import { RenewalCandidateAdd } from './RenewalCandidateAdd';
import { getRenewalCandidates } from './renewal-candidate-source';
import { RenewalCard, type RenewalCardTutoring } from './RenewalCard';
import { RenewalDropModal } from './RenewalDropModal';
import { RenewalKanbanColumn } from './RenewalKanbanColumn';
import { RenewalStatsStrip } from './RenewalStatsStrip';
import { RenewalWeeklyStats } from './RenewalWeeklyStats';
import { defaultRenewalScope, useRenewalBoard, type RenewalScope } from './use-renewal-board';

interface RenewalKanbanProps {
  adminKey: string;
  /** 학생 패널 열기 — 조인된 학생은 부분 필드라 id로 넘겨 부모가 전체를 가져온다. */
  onSelectStudentById: (id: string) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

/** 결제는 성공했는데 단계 전환 PATCH가 실패한 상태 — 재시도 대상. */
interface PendingConversion {
  targetId: string;
  paymentId?: string;
  studentName: string;
}

export function RenewalKanban({
  adminKey,
  onSelectStudentById,
  onStudentUpdate,
}: RenewalKanbanProps) {
  const [nowMs] = useState(() => Date.now());
  const [scope, setScope] = useState<RenewalScope>(() => defaultRenewalScope());
  const [activeId, setActiveId] = useState<string | null>(null);
  // PaymentModal은 B2B 파트너·가입 여부까지 보므로 조인된 부분 학생으로는 열 수 없다.
  // 결제 버튼을 누른 순간 전체 학생을 받아온다.
  const [payment, setPayment] = useState<{ target: RenewalTarget; student: Student } | null>(null);
  const [dropTarget, setDropTarget] = useState<RenewalTarget | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [pendingConversion, setPendingConversion] = useState<PendingConversion | null>(null);
  const [candidatesOpen, setCandidatesOpen] = useState(false);

  const board = useRenewalBoard(adminKey, scope);
  const { targets, setTargets, entries, weekly, error, setError, refresh } = board;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const patchTarget = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await fetch(`/api/crm/renewal-targets/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('단계 변경에 실패했습니다.');
    },
    [adminKey]
  );

  const tutoringByStudentId = useMemo(() => {
    const map = new Map<string, RenewalCardTutoring>();
    for (const e of entries) {
      map.set(e.student.id, {
        displayStatus: e.displayStatus,
        // 카드는 0으로 깎지 않은 값을 쓴다 — 초과 사용(-3h)이 재결제 시급도의 핵심 신호다.
        remainingHours: e.hours ? e.hours.remaining : null,
        scheduledHours: e.hours?.scheduled ?? null,
        overscheduledHours: e.hours?.overscheduled ?? null,
      });
    }
    return map;
  }, [entries]);

  // 후보 = 튜터링 중 목록 − 이미 열린 타깃(주차 무관), 급한 순
  const candidates = useMemo(
    () => getRenewalCandidates(entries, board.openTargets),
    [entries, board.openTargets]
  );

  const targetsByStage = useMemo(() => {
    const map = new Map<RenewalStage, RenewalTarget[]>();
    for (const stage of RENEWAL_STAGES) map.set(stage, []);
    for (const target of targets) map.get(target.stage)?.push(target);
    return map;
  }, [targets]);

  // 주차 셀렉터 후보 — 이번 주차 + 데이터가 있는 최근 주차
  const weekOptions = useMemo(() => {
    const thisWeek = getCurrentWeekDef(new Date(nowMs))?.start;
    const starts = new Set(weekly.map((w) => w.week_start));
    if (thisWeek) starts.add(thisWeek);
    return [...starts].sort((a, b) => b.localeCompare(a));
  }, [weekly, nowMs]);

  const scopeLabel =
    scope.kind === 'open'
      ? '진행 중 전체'
      : (getWeekLabel(scope.weekStart) ?? scope.weekStart);

  // ── 액션 ────────────────────────────────────────────────────────────────────

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const target = targets.find((t) => t.id === active.id);
    if (!target) return;

    const overStage = RENEWAL_STAGES.includes(over.id as RenewalStage)
      ? (over.id as RenewalStage)
      : targets.find((t) => t.id === over.id)?.stage;
    if (!overStage || overStage === target.stage) return;
    // 터미널 단계는 드래그로 오갈 수 없다 — 결제/미전환 버튼만이 진입 경로다.
    if (!RENEWAL_OPEN_STAGES.includes(overStage) || !RENEWAL_OPEN_STAGES.includes(target.stage)) {
      return;
    }

    const previous = target;
    setTargets((current) =>
      current.map((t) =>
        t.id === target.id
          ? { ...t, stage: overStage, stage_updated_at: new Date().toISOString() }
          : t
      )
    );
    try {
      await patchTarget(target.id, { stage: overStage });
      await refresh();
    } catch (e) {
      setTargets((current) => current.map((t) => (t.id === previous.id ? previous : t)));
      setError(e instanceof Error ? e.message : '이동에 실패했습니다.');
    }
  };

  const handleAdd = async (studentId: string) => {
    setPendingStudentId(studentId);
    try {
      const res = await fetch('/api/crm/renewal-targets', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? '추가에 실패했습니다.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했습니다.');
    } finally {
      setPendingStudentId(null);
    }
  };

  const runPatch = async (target: RenewalTarget, body: Record<string, unknown>, failMsg: string) => {
    try {
      await patchTarget(target.id, body);
      await refresh();
    } catch {
      setError(failMsg);
    }
  };

  const handleRemove = async (target: RenewalTarget) => {
    try {
      const res = await fetch(`/api/crm/renewal-targets/${target.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  /** 결제는 이미 기록됐다. 단계 전환만 실패하면 재시도로 복구한다(PATCH는 멱등). */
  const convertToPaid = async (targetId: string, paymentId: string | undefined, name: string) => {
    try {
      await patchTarget(targetId, { stage: '4', converted_payment_id: paymentId ?? null });
      setPendingConversion(null);
      await refresh();
    } catch {
      setPendingConversion({ targetId, paymentId, studentName: name });
      setError(`${name} 결제는 기록됐지만 '결제 완료' 단계 이동이 실패했습니다.`);
    }
  };

  /** 결제 모달 진입 — 전체 학생을 받아온 뒤 연다. */
  const openPayment = async (target: RenewalTarget) => {
    try {
      const res = await fetch(`/api/crm/students/${target.student_id}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) throw new Error();
      setPayment({ target, student: json.data as Student });
    } catch {
      setError('학생 정보를 불러오지 못해 결제 창을 열 수 없습니다.');
    }
  };

  const handlePaymentConfirm = async (updatedStudent: Student, paymentId?: string) => {
    if (!payment) return;
    const { target } = payment;
    setPayment(null);
    onStudentUpdate(updatedStudent.id, updatedStudent);
    await convertToPaid(target.id, paymentId, updatedStudent.name);
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  if (board.loading) return <p className="py-12 text-center text-sm text-gray-400">불러오는 중...</p>;

  const activeTarget = activeId ? targets.find((t) => t.id === activeId) : null;
  const showWeekBadge = scope.kind === 'open';

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <span>{error}</span>
          <div className="flex shrink-0 items-center gap-2">
            {pendingConversion && (
              <button
                type="button"
                onClick={() =>
                  convertToPaid(
                    pendingConversion.targetId,
                    pendingConversion.paymentId,
                    pendingConversion.studentName
                  )
                }
                className="px-2 py-1 rounded-md font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors"
              >
                결제 완료로 이동 재시도
              </button>
            )}
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
              aria-label="오류 닫기"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 스코프 셀렉터 + 대상 추가 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={scope.kind === 'open' ? 'open' : scope.weekStart}
          onChange={(e) =>
            setScope(e.target.value === 'open' ? { kind: 'open' } : { kind: 'week', weekStart: e.target.value })
          }
          className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-800 outline-none focus:border-gray-400"
        >
          <option value="open">진행 중 전체</option>
          {weekOptions.map((start) => (
            <option key={start} value={start}>
              {getWeekLabel(start) ?? start}
            </option>
          ))}
        </select>
        {!candidatesOpen && (
          <button
            type="button"
            onClick={() => setCandidatesOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <UserPlus size={13} />
            재결제 대상 추가
            {!board.candidatesLoading && (
              <span className="text-blue-400 font-medium">{candidates.length}명</span>
            )}
          </button>
        )}
      </div>

      {candidatesOpen && (
        <RenewalCandidateAdd
          candidates={candidates}
          loading={board.candidatesLoading}
          error={board.candidatesError}
          onAdd={handleAdd}
          onClose={() => setCandidatesOpen(false)}
          pendingStudentId={pendingStudentId}
          missingFromEnrolled={board.missingFromEnrolled}
          onSelectStudent={onSelectStudentById}
        />
      )}

      <RenewalStatsStrip
        targets={targets}
        scopeLabel={scopeLabel}
        mode={scope.kind === 'open' ? 'open' : 'cohort'}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const hits = pointerWithin(args);
          return hits.length > 0 ? hits : closestCenter(args);
        }}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
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
                  onCardClick={(t) => onSelectStudentById(t.student_id)}
                  onPayment={stage === '3' ? openPayment : undefined}
                  onDrop={RENEWAL_OPEN_STAGES.includes(stage) ? setDropTarget : undefined}
                  onRemove={RENEWAL_OPEN_STAGES.includes(stage) ? handleRemove : undefined}
                  onReopen={
                    stage === '5'
                      ? (t) => runPatch(t, { stage: '2', clear_drop_reason: true }, '되돌리기에 실패했습니다.')
                      : undefined
                  }
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

      <RenewalWeeklyStats
        rows={weekly}
        loading={false}
        error={null}
        selectedWeek={scope.kind === 'week' ? scope.weekStart : null}
        onSelectWeek={(weekStart) =>
          setScope((current) =>
            current.kind === 'week' && current.weekStart === weekStart
              ? { kind: 'open' }
              : { kind: 'week', weekStart }
          )
        }
      />

      {payment && (
        <PaymentModal
          student={payment.student}
          adminKey={adminKey}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPayment(null)}
          defaultPaymentType="재결제"
        />
      )}

      {dropTarget && (
        <RenewalDropModal
          target={dropTarget}
          onConfirm={(dropReason) => {
            const target = dropTarget;
            setDropTarget(null);
            runPatch(target, { stage: '5', drop_reason: dropReason }, '미전환 처리에 실패했습니다.');
          }}
          onClose={() => setDropTarget(null)}
        />
      )}
    </div>
  );
}
