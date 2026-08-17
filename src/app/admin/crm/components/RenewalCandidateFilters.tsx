'use client';

// 후보 목록 좌측 필터 — 플랫폼 Payment 페이지의 SUBJECT / STATUS 사이드바와 같은 배치.
// 담당자가 그 페이지에서 쓰던 조작을 그대로 옮겨 학습 비용을 없앤다.

import { Search } from 'lucide-react';
import {
  isAllSelected,
  type CandidateFilters,
  type FilterOption,
} from './renewal-candidate-filters';

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
      />
      <span className={`text-xs ${checked ? 'text-gray-800' : 'text-gray-400'} group-hover:text-gray-900`}>
        {label}
      </span>
      <span className="ml-auto text-[10px] text-gray-400 tabular-nums">{count}</span>
    </label>
  );
}

function Group({
  title,
  options,
  selected,
  onToggle,
  onToggleAll,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onToggleAll: (next: boolean) => void;
}) {
  if (options.length === 0) return null;
  const all = isAllSelected(options, selected);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{title}</p>
        <button
          type="button"
          onClick={() => onToggleAll(!all)}
          className="text-[10px] text-gray-400 hover:text-blue-600 transition-colors"
        >
          {all ? '전체 해제' : '전체 선택'}
        </button>
      </div>
      {options.map((o) => (
        <CheckboxRow
          key={o.value}
          label={o.label}
          count={o.count}
          checked={selected.includes(o.value)}
          onChange={() => onToggle(o.value)}
        />
      ))}
    </div>
  );
}

interface Props {
  subjectOpts: FilterOption[];
  statusOpts: FilterOption[];
  filters: CandidateFilters;
  onChange: (next: CandidateFilters) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  /** 사이드바 하단 요약 — 필터 적용 후 인원. */
  visibleCount: number;
  totalCount: number;
  onReset: () => void;
}

export function RenewalCandidateFilters({
  subjectOpts,
  statusOpts,
  filters,
  onChange,
  searchQuery,
  onSearchChange,
  visibleCount,
  totalCount,
  onReset,
}: Props) {
  const toggle = (key: keyof CandidateFilters, value: string) => {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  };

  const toggleAll = (key: keyof CandidateFilters, options: FilterOption[], next: boolean) => {
    onChange({ ...filters, [key]: next ? options.map((o) => o.value) : [] });
  };

  const narrowed = visibleCount !== totalCount;

  return (
    <aside className="w-44 shrink-0 border-r border-gray-100 pr-4 space-y-4">
      <div>
        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Search</p>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="학생 이름"
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <Group
        title="Subject"
        options={subjectOpts}
        selected={filters.subjects}
        onToggle={(v) => toggle('subjects', v)}
        onToggleAll={(next) => toggleAll('subjects', subjectOpts, next)}
      />

      <Group
        title="결제 상태"
        options={statusOpts}
        selected={filters.paymentStatuses}
        onToggle={(v) => toggle('paymentStatuses', v)}
        onToggleAll={(next) => toggleAll('paymentStatuses', statusOpts, next)}
      />

      <div className="pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-500">
          <b className="font-semibold text-gray-800 tabular-nums">{visibleCount}</b>
          <span className="text-gray-400"> / {totalCount}명</span>
        </p>
        {narrowed && (
          <button
            type="button"
            onClick={onReset}
            className="mt-1 text-[10px] text-blue-600 hover:underline"
          >
            필터 초기화
          </button>
        )}
      </div>
    </aside>
  );
}
