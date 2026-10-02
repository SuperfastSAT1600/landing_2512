import { Loader2, AlertCircle, Target } from 'lucide-react';
import type { Student, FunnelStage } from '@/types/crm';
import { StudentPoolCard } from './StudentPoolCard';
import { POOL_PAGE_SIZE, type PoolTab } from './filters';
import type { PlayTarget } from './useLeadPoolPlay';

interface LeadPoolListProps {
  poolTab: PoolTab;
  poolLoading: boolean;
  poolError: string | null;
  hasSearched: boolean;
  currentList: Student[];
  pagedList: Student[];
  selectedIds: Set<string>;
  playTargets: Map<string, PlayTarget>;
  safePage: number;
  totalPages: number;
  onToggleAll: () => void;
  onToggleStudent: (id: string) => void;
  onStudentClick: (student: Student) => void;
  onSetChurnStage: (id: string, stage: FunnelStage) => void;
  onPageChange: (updater: (page: number) => number) => void;
}

export function LeadPoolList({
  poolTab,
  poolLoading,
  poolError,
  hasSearched,
  currentList,
  pagedList,
  selectedIds,
  playTargets,
  safePage,
  totalPages,
  onToggleAll,
  onToggleStudent,
  onStudentClick,
  onSetChurnStage,
  onPageChange,
}: LeadPoolListProps) {
  return (
    <>
      {/* Select all row */}
      {poolTab !== 'plays' && currentList.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === currentList.length && currentList.length > 0}
            onChange={onToggleAll}
            className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
          />
          <span className="text-xs text-gray-500">전체 선택 ({currentList.length}명)</span>
        </div>
      )}

      {/* Student list */}
      {poolTab === 'plays' ? null : poolLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm">검색 중...</span>
        </div>
      ) : poolError ? (
        <div className="flex items-center gap-2 py-8 justify-center text-red-500">
          <AlertCircle size={16} />
          <p className="text-sm">{poolError}</p>
        </div>
      ) : !hasSearched ? (
        <div className="py-16 text-center text-sm text-gray-400">
          이름을 입력하면 리드풀 학생을 검색합니다.
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          {poolTab === 'inactive'
            ? '조건에 맞는 이탈 학생이 없습니다.'
            : '재활성화 시도 중인 학생이 없습니다.'}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pagedList.map((s) => {
              const target = playTargets.get(s.id);
              return (
                <div key={s.id}>
                  <StudentPoolCard
                    student={s}
                    selected={selectedIds.has(s.id)}
                    onToggle={(e) => {
                      e.stopPropagation();
                      onToggleStudent(s.id);
                    }}
                    onClick={() => onStudentClick(s)}
                    onSetChurnStage={onSetChurnStage}
                  />
                  {target && (
                    <div className="flex items-center gap-1.5 mt-1 px-2">
                      <Target size={11} className="text-blue-400 shrink-0" />
                      <p className="text-[11px] text-blue-600">
                        이 캠페인 타겟
                        {target.rank != null ? ` · #${target.rank}` : ''}
                        {target.score != null ? ` · ${Math.round(target.score)}점` : ''}
                        {target.sent ? ' · 발송됨' : ' · 미발송'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentList.length > POOL_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4 pb-2">
              <button
                onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-40 disabled:hover:border-gray-200"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">
                {safePage} / {totalPages} 페이지 · 총 {currentList.length}명
              </span>
              <button
                onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-40 disabled:hover:border-gray-200"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
