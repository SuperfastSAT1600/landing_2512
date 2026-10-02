'use client';

import type { RetryStrategy } from '@/types/crm';

interface RetryStrategyHeaderProps {
  strategy: RetryStrategy;
  editingDesc: boolean;
  descDraft: string;
  onDescDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}

/** 선택된 전략의 이름과 설명(인라인 편집). */
export function RetryStrategyHeader({
  strategy,
  editingDesc,
  descDraft,
  onDescDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
}: RetryStrategyHeaderProps) {
  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-3 bg-gray-50">
      <p className="text-sm font-semibold text-gray-800 mb-1">{strategy.name}</p>
      {editingDesc ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            autoFocus
            rows={3}
            value={descDraft}
            onChange={e => onDescDraftChange(e.target.value)}
            placeholder="전략 내용을 입력하세요..."
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-1.5">
            <button
              onClick={onSave}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
            >저장</button>
            <button
              onClick={onCancelEdit}
              className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-100"
            >취소</button>
          </div>
        </div>
      ) : (
        <button
          onClick={onStartEdit}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-700 min-h-[28px]"
        >
          {strategy.description || <span className="text-gray-300 italic">전략 내용 추가...</span>}
        </button>
      )}
    </div>
  );
}
