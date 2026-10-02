'use client';

import { Plus, Search, X, ArrowUpRight } from 'lucide-react';
import type { Student } from '@/types/crm';

interface RetryLeadSearchProps {
  showAddLead: boolean;
  leadSearch: string;
  searchResults: Student[];
  searchingLeads: boolean;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onPick: (student: Student) => void;
  onClose: () => void;
  onNavigateToPool?: () => void;
}

/** 리드 추가 버튼 줄 + 리드풀 이름 검색 드롭다운. */
export function RetryLeadSearch({
  showAddLead,
  leadSearch,
  searchResults,
  searchingLeads,
  onToggle,
  onSearchChange,
  onPick,
  onClose,
  onNavigateToPool,
}: RetryLeadSearchProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <Plus size={12} />
        리드 추가
      </button>
      {onNavigateToPool && (
        <button
          onClick={onNavigateToPool}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
        >
          <ArrowUpRight size={12} />
          전체 리드풀에서 선택
        </button>
      )}

      {showAddLead && (
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder="리드풀에서 이름 검색..."
            value={leadSearch}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {leadSearch && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
              {searchingLeads && (
                <p className="px-3 py-2 text-xs text-gray-400">검색 중...</p>
              )}
              {!searchingLeads && searchResults.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400">검색 결과가 없습니다.</p>
              )}
              {searchResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => onPick(s)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.parent_phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddLead && (
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
