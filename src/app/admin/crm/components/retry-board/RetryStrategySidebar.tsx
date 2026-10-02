'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { RetryStrategy } from '@/types/crm';
import type { RetryStrategyGroup } from './retry-board-utils';

interface RetryStrategySidebarProps {
  strategies: RetryStrategy[];
  strategyGroups: RetryStrategyGroup[];
  selectedId: string | null;
  creatingStrategy: boolean;
  newStrategyName: string;
  retryCategoryId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
}

export function RetryStrategySidebar({
  strategies,
  strategyGroups,
  selectedId,
  creatingStrategy,
  newStrategyName,
  retryCategoryId,
  onSelect,
  onDelete,
  onStartCreate,
  onCancelCreate,
  onNameChange,
  onCreate,
}: RetryStrategySidebarProps) {
  return (
    <div className="w-48 shrink-0 border-r border-gray-200 pr-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700">전략 목록</p>
        <button
          onClick={onStartCreate}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="새 전략 만들기"
        >
          <Plus size={14} />
        </button>
      </div>

      {creatingStrategy && (
        <div className="mb-2 flex gap-1">
          <input
            autoFocus
            type="text"
            placeholder="전략 이름"
            value={newStrategyName}
            onChange={e => onNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onCreate();
              if (e.key === 'Escape') onCancelCreate();
            }}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={onCreate}
            disabled={!retryCategoryId}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}
      {creatingStrategy && !retryCategoryId && (
        <p className="text-[11px] text-amber-600 mb-2">전략 라이브러리에서 카테고리를 먼저 만드세요.</p>
      )}

      <div className="flex flex-col gap-1">
        {strategies.length === 0 && !creatingStrategy && (
          <p className="text-[11px] text-gray-400 py-2">전략이 없습니다. + 버튼으로 추가하세요.</p>
        )}
        {strategyGroups.map(group => (
          <div key={group.id} className="mb-1">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {group.name}
            </p>
            {group.items.map(s => (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                  selectedId === s.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{s.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                  className={`ml-1 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ${
                    selectedId === s.id ? 'text-gray-300 hover:text-red-400' : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
