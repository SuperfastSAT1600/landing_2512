'use client';

// 재결제 세일즈 보드.
// 존재 목적은 '주차별 재결제 인원과 결제 전환율' 측정이므로 두 개의 스코프를 갖는다:
//  - 진행 중 전체(기본): 코호트 무관 1~3단계 — 일상 운영 화면
//  - 특정 주차: 그 코호트의 5단계 전부 — 주차별 표의 한 행과 정확히 일치
// 4(결제 완료)·5(미전환)는 터미널. 진입은 버튼으로만, 드래그로는 오갈 수 없다.
// 데이터·변경 로직은 use-renewal-board / renewal-board/ 훅, 화면 조각은 renewal-board/ 컴포넌트.

import { useMemo, useState } from 'react';
import type { RenewalOutcomeQuality, RenewalTarget, Student } from '@/types/crm';
import { getWeekLabel } from '@/lib/week-definitions';
import { RenewalCandidateAdd } from './RenewalCandidateAdd';
import { getRenewalCandidates } from './renewal-candidate-source';
import { RenewalStatsStrip } from './RenewalStatsStrip';
import { RenewalWeeklyStats } from './RenewalWeeklyStats';
import { defaultRenewalScope, useRenewalBoard, type RenewalScope } from './use-renewal-board';
import { RenewalBoardColumns } from './renewal-board/RenewalBoardColumns';
import { RenewalErrorBanner } from './renewal-board/RenewalErrorBanner';
import { RenewalModals } from './renewal-board/RenewalModals';
import { RenewalToolbar } from './renewal-board/RenewalToolbar';
import {
  buildTutoringByStudentId,
  buildWeekOptions,
  groupTargetsByStage,
} from './renewal-board/renewal-board-utils';
import { useRenewalDrag } from './renewal-board/use-renewal-drag';
import { useRenewalMutations } from './renewal-board/use-renewal-mutations';
import { useRenewalPayment } from './renewal-board/use-renewal-payment';

interface RenewalKanbanProps {
  adminKey: string;
  /** 타임라인·슬랙에 남길 작성자. localStorage 의 admin_user_name. */
  userName?: string;
  /** 학생 패널 열기 — 조인된 학생은 부분 필드라 id로 넘겨 부모가 전체를 가져온다. */
  onSelectStudentById: (id: string) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

export function RenewalKanban({
  adminKey,
  userName,
  onSelectStudentById,
  onStudentUpdate,
}: RenewalKanbanProps) {
  const [nowMs] = useState(() => Date.now());
  const [scope, setScope] = useState<RenewalScope>(() => defaultRenewalScope());
  const [dropTarget, setDropTarget] = useState<RenewalTarget | null>(null);
  const [qualityTarget, setQualityTarget] = useState<{
    target: RenewalTarget;
    quality: RenewalOutcomeQuality;
  } | null>(null);
  const [candidatesOpen, setCandidatesOpen] = useState(false);

  const board = useRenewalBoard(adminKey, scope);
  const { targets, setTargets, entries, weekly, error, setError, refresh } = board;

  const mutations = useRenewalMutations({ adminKey, userName, setTargets, setError, refresh });
  const { patchTarget } = mutations;
  const drag = useRenewalDrag({ targets, setTargets, setError, refresh, patchTarget });
  const pay = useRenewalPayment({ adminKey, patchTarget, setError, refresh, onStudentUpdate });

  const tutoringByStudentId = useMemo(() => buildTutoringByStudentId(entries), [entries]);

  // 후보 = 튜터링 중 목록 − 이미 열린 타깃(주차 무관), 급한 순
  const candidates = useMemo(
    () => getRenewalCandidates(entries, board.openTargets),
    [entries, board.openTargets]
  );

  const targetsByStage = useMemo(() => groupTargetsByStage(targets), [targets]);
  const weekOptions = useMemo(() => buildWeekOptions(weekly, nowMs), [weekly, nowMs]);

  const scopeLabel =
    scope.kind === 'open'
      ? '진행 중 전체'
      : (getWeekLabel(scope.weekStart) ?? scope.weekStart);

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  if (board.loading) return <p className="py-12 text-center text-sm text-gray-400">불러오는 중...</p>;

  const activeTarget = drag.activeId ? targets.find((t) => t.id === drag.activeId) : null;

  return (
    <div className="space-y-4">
      {error && (
        <RenewalErrorBanner
          error={error}
          pendingConversion={pay.pendingConversion}
          onRetryConversion={(c) => pay.convertToPaid(c.targetId, c.paymentId, c.studentName)}
          onClose={() => setError(null)}
        />
      )}

      <RenewalToolbar
        scope={scope}
        weekOptions={weekOptions}
        candidatesOpen={candidatesOpen}
        candidatesLoading={board.candidatesLoading}
        candidateCount={candidates.length}
        onScopeChange={setScope}
        onOpenCandidates={() => setCandidatesOpen(true)}
      />

      {candidatesOpen && (
        <RenewalCandidateAdd
          candidates={candidates}
          loading={board.candidatesLoading}
          error={board.candidatesError}
          onAdd={mutations.handleAdd}
          onClose={() => setCandidatesOpen(false)}
          pendingStudentId={mutations.pendingStudentId}
          missingFromEnrolled={board.missingFromEnrolled}
          onSelectStudent={onSelectStudentById}
        />
      )}

      <RenewalStatsStrip
        targets={targets}
        scopeLabel={scopeLabel}
        mode={scope.kind === 'open' ? 'open' : 'cohort'}
      />

      <RenewalBoardColumns
        targetsByStage={targetsByStage}
        activeTarget={activeTarget}
        nowMs={nowMs}
        tutoringByStudentId={tutoringByStudentId}
        showWeekBadge={scope.kind === 'open'}
        onDragStart={drag.handleDragStart}
        onDragEnd={drag.handleDragEnd}
        onCardClick={(t) => onSelectStudentById(t.student_id)}
        onPayment={pay.openPayment}
        onDrop={setDropTarget}
        onRemove={mutations.handleRemove}
        onReopen={(t) =>
          mutations.runPatch(t, { stage: '2', clear_drop_reason: true }, '되돌리기에 실패했습니다.')
        }
        onMemoSave={mutations.handleMemoSave}
        onContactDateSave={mutations.handleContactDateSave}
        onEditQuality={(t, q) => setQualityTarget({ target: t, quality: q })}
      />

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

      <RenewalModals
        adminKey={adminKey}
        userName={userName}
        payment={pay.payment}
        onPaymentConfirm={pay.handlePaymentConfirm}
        onPaymentClose={pay.closePayment}
        dropTarget={dropTarget}
        onDropClose={() => setDropTarget(null)}
        onDropConfirm={mutations.runPatch}
        qualityTarget={qualityTarget}
        onQualityClose={() => setQualityTarget(null)}
        onSaveOutcome={mutations.saveOutcome}
      />
    </div>
  );
}
