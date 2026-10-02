import { X, Loader2 } from 'lucide-react';
import type { RetryStrategy } from '@/types/crm';

interface StrategyPickerProps {
  strategies: RetryStrategy[];
  loading: boolean;
  assigning: boolean;
  onClose: () => void;
  onAssign: (strategyId: string, strategyName: string) => void;
}

// Strategy picker dropdown (위치: bulk action bar 바로 위)
export function StrategyPicker({
  strategies,
  loading,
  assigning,
  onClose,
  onAssign,
}: StrategyPickerProps) {
  return (
    <div className="fixed bottom-20 right-6 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-2 min-w-[200px]">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <p className="text-xs font-semibold text-gray-700">전략 선택</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={14} className="animate-spin text-gray-400" />
        </div>
      ) : strategies.length === 0 ? (
        <p className="text-xs text-gray-400 px-2 py-2">
          전략이 없습니다.
          <br />
          재시도 세일즈 탭에서 먼저 만드세요.
        </p>
      ) : (
        strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => onAssign(s.id, s.name)}
            disabled={assigning}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {s.name}
          </button>
        ))
      )}
    </div>
  );
}
