import { Search, X } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import type { PoolTab } from './filters';

interface LeadPoolHeaderProps {
  totalInactive: number;
  totalReactivating: number;
  successRate: number | null;
  playCount: number;
  nameSearch: string;
  onNameSearchChange: (value: string) => void;
  poolTab: PoolTab;
  onTabChange: (tab: PoolTab) => void;
}

export function LeadPoolHeader({
  totalInactive,
  totalReactivating,
  successRate,
  playCount,
  nameSearch,
  onNameSearchChange,
  poolTab,
  onTabChange,
}: LeadPoolHeaderProps) {
  return (
    <>
      {/* Summary cards */}
      <div className="flex gap-3 flex-wrap">
        <SummaryCard label="총 이탈" value={totalInactive} sub="inactive 학생" />
        <SummaryCard label="재활성화 시도 중" value={totalReactivating} sub="reactivating 학생" />
        <SummaryCard
          label="성공률"
          value={successRate !== null ? `${successRate}%` : '-'}
          sub={successRate !== null ? '결과 확인 기준' : '기록 없음'}
        />
      </div>

      {/* Name search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          placeholder="이름으로 검색..."
          className="w-full pl-8 pr-7 py-2 text-sm border border-gray-100 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
        />
        {nameSearch && (
          <button
            onClick={() => onNameSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { key: 'inactive', label: `이탈 학생 (${totalInactive})` },
            { key: 'reactivating', label: `재활성화 시도 중 (${totalReactivating})` },
            { key: 'plays', label: `캠페인 (${playCount})` },
          ] as { key: PoolTab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              poolTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
