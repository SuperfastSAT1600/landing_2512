'use client';

import { Student } from '@/types/crm';
import { RetryBoardColumns } from './retry-board/RetryBoardColumns';
import { RetryLeadSearch } from './retry-board/RetryLeadSearch';
import { RetryStrategyHeader } from './retry-board/RetryStrategyHeader';
import { RetryStrategySidebar } from './retry-board/RetryStrategySidebar';
import { useRetryBoard } from './retry-board/useRetryBoard';

interface RetryKanbanProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStrategyChange?: (ctx: { id: string; name: string } | null) => void;
  onNavigateToPool?: () => void;
  enrolledStudentId?: string | null;
  onEnrolledHandled?: () => void;
}

export function RetryKanban({ adminKey, onStudentClick, onStudentUpdate, onStrategyChange, onNavigateToPool, enrolledStudentId, onEnrolledHandled }: RetryKanbanProps) {
  const board = useRetryBoard({ adminKey, onStudentUpdate, onStrategyChange, enrolledStudentId, onEnrolledHandled });
  const { selectedId, search, drag } = board;
  const strategy = board.strategies.find(s => s.id === selectedId);

  return (
    <div className="flex gap-4 h-full">
      {/* Strategy sidebar */}
      <RetryStrategySidebar
        strategies={board.strategies}
        strategyGroups={board.strategyGroups}
        selectedId={selectedId}
        creatingStrategy={board.creatingStrategy}
        newStrategyName={board.newStrategyName}
        retryCategoryId={board.retryCategoryId}
        onSelect={board.setSelectedId}
        onDelete={board.handleDeleteStrategy}
        onStartCreate={() => board.setCreatingStrategy(true)}
        onCancelCreate={() => { board.setCreatingStrategy(false); board.setNewStrategyName(''); }}
        onNameChange={board.setNewStrategyName}
        onCreate={board.handleCreateStrategy}
      />

      {/* Kanban area */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            좌측에서 전략을 선택하거나 새로 만드세요.
          </div>
        ) : (
          <>
            {/* Strategy name & description */}
            {strategy && (
              <RetryStrategyHeader
                strategy={strategy}
                editingDesc={board.editingDesc}
                descDraft={board.descDraft}
                onDescDraftChange={board.setDescDraft}
                onStartEdit={() => { board.setDescDraft(strategy.description ?? ''); board.setEditingDesc(true); }}
                onCancelEdit={() => board.setEditingDesc(false)}
                onSave={board.saveDescription}
              />
            )}

            {/* Add lead button */}
            <RetryLeadSearch
              showAddLead={search.showAddLead}
              leadSearch={search.leadSearch}
              searchResults={search.searchResults}
              searchingLeads={search.searchingLeads}
              onToggle={() => search.setShowAddLead(v => !v)}
              onSearchChange={search.setLeadSearch}
              onPick={s => { board.handleAddLead(s); search.setLeadSearch(''); search.setShowAddLead(false); }}
              onClose={() => { search.setShowAddLead(false); search.setLeadSearch(''); }}
              onNavigateToPool={onNavigateToPool}
            />

            {board.loadingStudents ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : (
              <RetryBoardColumns
                studentsByStage={board.studentsByStage}
                activeStudent={drag.activeStudent}
                onDragStart={drag.handleDragStart}
                onDragEnd={drag.handleDragEnd}
                onStudentClick={onStudentClick}
                onRemove={board.handleRemoveLead}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
