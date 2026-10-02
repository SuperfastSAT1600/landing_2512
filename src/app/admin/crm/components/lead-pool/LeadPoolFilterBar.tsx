import type { Dispatch, SetStateAction } from 'react';
import { Search } from 'lucide-react';
import type { ChurnType } from '@/types/crm';
import { DEFAULT_FILTERS, type ChurnStageGroup, type LeadPoolFilters } from './filters';

interface LeadPoolFilterBarProps {
  filters: LeadPoolFilters;
  setFilters: Dispatch<SetStateAction<LeadPoolFilters>>;
  churnStageGroups: ChurnStageGroup[];
  gradeOptions: string[];
}

// Inactive tab 전용 — 이탈 단계 칩 + 필터 셀렉트 행
export function LeadPoolFilterBar({
  filters,
  setFilters,
  churnStageGroups,
  gradeOptions,
}: LeadPoolFilterBarProps) {
  return (
    <>
      {/* Inactive tab: filter bar */}
      {churnStageGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <span className="font-medium text-gray-500">이탈 단계</span>
          {churnStageGroups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, churnStage: f.churnStage === g.key ? '' : g.key }))
              }
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filters.churnStage === g.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {g.label}{' '}
              <b className={filters.churnStage === g.key ? '' : 'text-gray-800'}>{g.count}</b>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="상담 내용 키워드 검색..."
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44"
          />
        </div>

        <select
          value={filters.churnType}
          onChange={(e) =>
            setFilters((f) => ({ ...f, churnType: e.target.value as ChurnType | '' }))
          }
          className="text-xs border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="">이탈 유형 전체</option>
          <option value="potential">잠재 이탈</option>
          <option value="closed">완전 이탈</option>
        </select>

        <select
          value={filters.churnTag}
          onChange={(e) => setFilters((f) => ({ ...f, churnTag: e.target.value }))}
          className="text-xs border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="">이탈 사유 전체</option>
          <option value="회신 없음">회신 없음</option>
          <option value="노쇼">노쇼</option>
          <option value="미응시">미응시</option>
          <option value="미결제">미결제</option>
          <option value="기타">기타</option>
        </select>

        <select
          value={filters.churnStage}
          onChange={(e) => setFilters((f) => ({ ...f, churnStage: e.target.value }))}
          className="text-xs border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="">이탈 단계 전체</option>
          {churnStageGroups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label} ({g.count})
            </option>
          ))}
        </select>

        <select
          value={filters.grade}
          onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}
          className="text-xs border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="">학년 전체</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={filters.daysSinceChurn}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              daysSinceChurn: e.target.value as LeadPoolFilters['daysSinceChurn'],
            }))
          }
          className="text-xs border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="">기간 전체</option>
          <option value="30">30일 이내</option>
          <option value="60">60일 이내</option>
          <option value="90">90일 이내</option>
          <option value="180">180일 이내</option>
        </select>

        {Object.values(filters).some((v) => v !== '') && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            초기화
          </button>
        )}
      </div>
    </>
  );
}
