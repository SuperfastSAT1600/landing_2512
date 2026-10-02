'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, FunnelStage } from '@/types/crm';
import { ReactivationModal } from './ReactivationModal';
import { BulkContactModal } from './BulkContactModal';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { useWinbackPlays } from './winback/hooks/useWinbackPlays';
import { WinbackPlayBar } from './winback/WinbackPlayBar';
import { WinbackPlaysTab } from './winback/WinbackPlaysTab';
import { WinbackPlayModal } from './winback/WinbackPlayModal';
import {
  DEFAULT_FILTERS,
  POOL_PAGE_SIZE,
  buildChurnStageGroups,
  computeSuccessRate,
  filterInactiveStudents,
  listGradeOptions,
  splitByLeadStatus,
  type LeadPoolFilters,
  type PoolTab,
} from './lead-pool/filters';
import { useLeadPoolData } from './lead-pool/useLeadPoolData';
import { useLeadPoolActions } from './lead-pool/useLeadPoolActions';
import { useLeadPoolPlay } from './lead-pool/useLeadPoolPlay';
import { LeadPoolBanners } from './lead-pool/LeadPoolBanners';
import { LeadPoolHeader } from './lead-pool/LeadPoolHeader';
import { LeadPoolFilterBar } from './lead-pool/LeadPoolFilterBar';
import { LeadPoolList } from './lead-pool/LeadPoolList';
import { StrategyPicker } from './lead-pool/StrategyPicker';
import { BulkActionBar } from './lead-pool/BulkActionBar';

// ─── LeadPool ──────────────────────────────────────────────────────────────────

interface LeadPoolProps {
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onRefetch: () => void;
  retryContext?: { id: string; name: string } | null;
  onRetryContextClear?: () => void;
  onRetryAssignSuccess?: () => void;
}

export function LeadPool({
  adminKey,
  onStudentUpdate,
  onStudentClick,
  onRefetch,
  retryContext,
  onRetryContextClear,
  onRetryAssignSuccess,
}: LeadPoolProps) {
  const data = useLeadPoolData(adminKey);
  const { students, setStudents, nameSearch, fetchPoolStudents } = data;
  const [page, setPage] = useState(1);

  const [poolTab, setPoolTab] = useState<PoolTab>('inactive');
  const [filters, setFilters] = useState<LeadPoolFilters>(DEFAULT_FILTERS);
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [showBulkContactModal, setShowBulkContactModal] = useState(false);

  const { userName } = useAdminAuth();
  const winback = useWinbackPlays(adminKey);

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const totalInactive = data.statsInactive ?? 0;
  const totalReactivating = data.statsReactivating ?? 0;

  const successRate = useMemo(() => computeSuccessRate(students), [students]);

  // ─── Tab base lists ─────────────────────────────────────────────────────────

  const { inactive: inactiveStudents, reactivating: reactivatingStudents } = useMemo(
    () => splitByLeadStatus(students),
    [students]
  );

  // ─── Filtered list (inactive tab only) ─────────────────────────────────────

  const filtered = useMemo(
    () => filterInactiveStudents(inactiveStudents, filters),
    [inactiveStudents, filters]
  );

  // 이탈 단계별 건수 (전체 이탈 학생 기준, 퍼널 순서 + 미상)
  const churnStageGroups = useMemo(
    () => buildChurnStageGroups(inactiveStudents),
    [inactiveStudents]
  );

  // 이탈 단계 수동 지정 — 로컬 목록 즉시 반영 + 서버 저장(PATCH)
  const handleSetChurnStage = useCallback(
    (id: string, stage: FunnelStage) => {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, churn_stage_manual: stage } : s))
      );
      onStudentUpdate(id, { churn_stage_manual: stage });
    },
    [onStudentUpdate, setStudents]
  );

  const currentList = poolTab === 'reactivating' ? reactivatingStudents : filtered;

  const actions = useLeadPoolActions({ adminKey, currentList, onRetryAssignSuccess });
  const { selectedIds, setSelectedIds, setBulkSuccessMessage } = actions;
  const play = useLeadPoolPlay({
    winback,
    selectedIds,
    clearSelection: () => setSelectedIds(new Set()),
    setBulkSuccessMessage,
  });

  // ─── Pagination (client-side) ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(currentList.length / POOL_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedList = currentList.slice((safePage - 1) * POOL_PAGE_SIZE, safePage * POOL_PAGE_SIZE);

  // 필터/검색/탭이 바뀌면 1페이지로
  useEffect(() => {
    // 기존 동작 유지(분할 전과 동일한 effect 기반 리셋)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [filters, nameSearch, poolTab]);

  // ─── Grade options ─────────────────────────────────────────────────────────

  const gradeOptions = useMemo(() => listGradeOptions(inactiveStudents), [inactiveStudents]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <LeadPoolBanners
        bulkSuccessMessage={actions.bulkSuccessMessage}
        onDismissSuccess={() => setBulkSuccessMessage(null)}
        retryContext={retryContext}
        onRetryContextClear={onRetryContextClear}
      />

      <LeadPoolHeader
        totalInactive={totalInactive}
        totalReactivating={totalReactivating}
        successRate={successRate}
        playCount={winback.plays.length}
        nameSearch={nameSearch}
        onNameSearchChange={data.setNameSearch}
        poolTab={poolTab}
        onTabChange={(key) => {
          setPoolTab(key);
          setSelectedIds(new Set());
        }}
      />

      {/* 윈백 플레이 컨텍스트 바 */}
      {poolTab !== 'plays' && (
        <WinbackPlayBar
          plays={winback.plays}
          selectedPlayId={play.selectedPlayId}
          onSelect={play.setSelectedPlayId}
          onNew={() => play.setShowPlayModal(true)}
          onOpenPlays={() => setPoolTab('plays')}
        />
      )}

      {poolTab === 'plays' && (
        <WinbackPlaysTab
          adminKey={adminKey}
          userName={userName}
          winback={winback}
          onStudentClick={(studentId) => {
            const student = students.find((s) => s.id === studentId);
            if (student) onStudentClick(student);
          }}
        />
      )}

      {poolTab === 'inactive' && (
        <LeadPoolFilterBar
          filters={filters}
          setFilters={setFilters}
          churnStageGroups={churnStageGroups}
          gradeOptions={gradeOptions}
        />
      )}

      <LeadPoolList
        poolTab={poolTab}
        poolLoading={data.poolLoading}
        poolError={data.poolError}
        hasSearched={data.hasSearched}
        currentList={currentList}
        pagedList={pagedList}
        selectedIds={selectedIds}
        playTargets={play.playTargets}
        safePage={safePage}
        totalPages={totalPages}
        onToggleAll={actions.toggleAll}
        onToggleStudent={actions.toggleStudent}
        onStudentClick={onStudentClick}
        onSetChurnStage={handleSetChurnStage}
        onPageChange={setPage}
      />

      {actions.showStrategyPicker && !retryContext && (
        <StrategyPicker
          strategies={actions.pickerStrategies}
          loading={actions.pickerLoading}
          assigning={actions.assigning}
          onClose={() => actions.setShowStrategyPicker(false)}
          onAssign={actions.handleAssignToStrategy}
        />
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedPlayId={play.selectedPlayId}
          addingToPlay={play.addingToPlay}
          onAddToPlay={play.handleAddToPlay}
          onOpenBulkContact={() => setShowBulkContactModal(true)}
          onOpenReactivation={() => setShowReactivationModal(true)}
          retryContext={retryContext}
          assigning={actions.assigning}
          onAssignToStrategy={actions.handleAssignToStrategy}
          onToggleStrategyPicker={() =>
            actions.showStrategyPicker
              ? actions.setShowStrategyPicker(false)
              : actions.openStrategyPicker()
          }
        />
      )}

      {/* Bulk contact modal */}
      {showBulkContactModal && (
        <BulkContactModal
          studentCount={selectedIds.size}
          adminKey={adminKey}
          studentIds={Array.from(selectedIds)}
          onClose={() => setShowBulkContactModal(false)}
          onSuccess={(count) => {
            setSelectedIds(new Set());
            setShowBulkContactModal(false);
            setBulkSuccessMessage(`${count}명의 상담 기록이 저장되었습니다.`);
            if (nameSearch.trim()) fetchPoolStudents(nameSearch.trim());
          }}
        />
      )}

      {/* Reactivation modal */}
      {showReactivationModal && (
        <ReactivationModal
          mode="bulk"
          studentIds={Array.from(selectedIds)}
          adminKey={adminKey}
          onClose={() => setShowReactivationModal(false)}
          onSuccess={() => {
            const count = selectedIds.size;
            setSelectedIds(new Set());
            setShowReactivationModal(false);
            setBulkSuccessMessage(
              `${count}명 재활성화 시도 시작 — 칸반 '재활성화 시도 중' 섹션으로 이동됩니다.`
            );
            if (nameSearch.trim()) fetchPoolStudents(nameSearch.trim());
            onRefetch();
          }}
        />
      )}

      {/* 새 플레이 위저드 (리드풀 바에서 진입) */}
      {play.showPlayModal && (
        <WinbackPlayModal
          adminKey={adminKey}
          createdBy={userName}
          onClose={() => play.setShowPlayModal(false)}
          createPlay={winback.createPlay}
          recommend={winback.recommend}
          addTargets={winback.addTargets}
          onCreated={(playId) => {
            play.setShowPlayModal(false);
            play.setSelectedPlayId(playId);
            setPoolTab('plays');
          }}
        />
      )}
    </div>
  );
}
