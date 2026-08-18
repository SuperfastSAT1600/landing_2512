'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import {
  TRAFFIC_SOURCE_OPTIONS,
  GRADE_OPTIONS,
  TrafficSource,
} from '@/types/crm';

export interface KanbanFilters {
  grade: string;
  trafficSource: string;
  desiredSubjects: string;
  leadType: string;
}

export const DEFAULT_FILTERS: KanbanFilters = {
  grade: '',
  trafficSource: '',
  desiredSubjects: '',
  leadType: '',
};

interface KanbanFilterProps {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
}

const DESIRED_SUBJECTS_OPTIONS = ['RW', 'Math', 'Both'];
const LEAD_TYPE_OPTIONS = ['B2C', 'B2B'];

export function KanbanFilter({ filters, onChange }: KanbanFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasActiveFilter = Object.values(filters).some(v => v !== '');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleReset() {
    onChange(DEFAULT_FILTERS);
  }

  function set(key: keyof KanbanFilters, value: string) {
    onChange({ ...filters, [key]: filters[key] === value ? '' : value });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <Filter size={13} className="text-gray-500" />
        <span className="text-gray-600">필터</span>
        {hasActiveFilter && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-4">
          {/* Grade */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">학년</p>
            <div className="flex flex-wrap gap-1">
              {GRADE_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => set('grade', g)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    filters.grade === g
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Traffic source */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">유입소스</p>
            <div className="flex flex-wrap gap-1">
              {TRAFFIC_SOURCE_OPTIONS.map((src: TrafficSource) => (
                <button
                  key={src}
                  onClick={() => set('trafficSource', src)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    filters.trafficSource === src
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Desired subjects */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">희망과목</p>
            <div className="flex gap-1">
              {DESIRED_SUBJECTS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => set('desiredSubjects', s)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    filters.desiredSubjects === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Lead type */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">리드유형</p>
            <div className="flex gap-1">
              {LEAD_TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => set('leadType', t)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    filters.leadType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          {hasActiveFilter && (
            <button
              onClick={handleReset}
              className="w-full text-[11px] text-gray-500 hover:text-red-500 transition-colors text-center pt-1 border-t border-gray-100"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
