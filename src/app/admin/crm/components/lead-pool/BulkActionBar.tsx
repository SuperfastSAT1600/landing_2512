import { ChevronDown, ArrowRight, Target } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  selectedPlayId: string | null;
  addingToPlay: boolean;
  onAddToPlay: () => void;
  onOpenBulkContact: () => void;
  onOpenReactivation: () => void;
  retryContext?: { id: string; name: string } | null;
  assigning: boolean;
  onAssignToStrategy: (strategyId: string, strategyName: string) => void;
  onToggleStrategyPicker: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedPlayId,
  addingToPlay,
  onAddToPlay,
  onOpenBulkContact,
  onOpenReactivation,
  retryContext,
  assigning,
  onAssignToStrategy,
  onToggleStrategyPicker,
}: BulkActionBarProps) {
  return (
    <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-2 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">{selectedCount}명 선택됨</span>
      <div className="flex flex-wrap gap-2">
        {selectedPlayId && (
          <button
            type="button"
            onClick={onAddToPlay}
            disabled={addingToPlay}
            className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Target size={13} />
            {addingToPlay ? '추가 중...' : `캠페인에 추가 (${selectedCount})`}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenBulkContact}
          className="text-sm font-medium bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-400 transition-colors"
        >
          연락 기록
        </button>
        <button
          type="button"
          onClick={onOpenReactivation}
          className="text-sm font-semibold bg-white text-gray-900 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          재활성화 시작
        </button>
        {/* 재시도 세일즈 배정 */}
        {retryContext ? (
          <button
            type="button"
            onClick={() => onAssignToStrategy(retryContext.id, retryContext.name)}
            disabled={assigning}
            className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            <ArrowRight size={13} />
            {assigning ? '배정 중...' : `"${retryContext.name}" 배정`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleStrategyPicker}
            className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            재시도 배정
            <ChevronDown size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
