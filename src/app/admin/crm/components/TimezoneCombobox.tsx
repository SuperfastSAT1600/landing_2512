'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { buildTimezoneOptions, getTimezoneLabel } from '@/lib/all-timezones';

interface Props {
  /** 저장 값 — IANA 문자열(예: 'Asia/Seoul'). */
  value: string;
  onChange: (iana: string) => void;
  /** 트리거(닫힘 상태 버튼) 스타일 — 호출부 폼 테마에 맞춘다. */
  className?: string;
  disabled?: boolean;
}

const MAX_RESULTS = 60;

/**
 * 전 세계 IANA 타임존을 국가명(한/영)·도시·UTC오프셋으로 검색해 고르는 콤보박스.
 * 검색어가 없으면 상단 "빠른 선택"이 먼저 보인다. 선택은 onMouseDown 으로 처리해
 * 검색 input blur 와의 경합을 피한다(ReferrerPicker 패턴).
 */
export function TimezoneCombobox({ value, onChange, className, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => buildTimezoneOptions(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.keywords.includes(q)) : options;
    return list.slice(0, MAX_RESULTS);
  }, [options, query]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const select = (iana: string) => {
    onChange(iana);
    setOpen(false);
    setQuery('');
  };

  const total = query.trim() ? options.filter((o) => o.keywords.includes(query.trim().toLowerCase())).length : options.length;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`${className ?? ''} flex items-center justify-between gap-2 text-left disabled:opacity-50`}
      >
        <span className={value ? 'truncate' : 'truncate text-gray-400'}>
          {value ? getTimezoneLabel(value) : '시간대 선택'}
        </span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[16rem] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="relative border-b border-gray-100 p-2">
            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder="국가·도시·시간대 검색 (예: 베트남, Ho Chi Minh, UTC+7)"
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                if (e.key === 'Enter' && filtered[0]) { e.preventDefault(); select(filtered[0].iana); }
              }}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-md pl-7 pr-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">검색 결과 없음</li>
            )}
            {filtered.map((o) => (
              <li key={o.iana}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.iana === value}
                  onMouseDown={(e) => { e.preventDefault(); select(o.iana); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${o.iana === value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {total > filtered.length && (
              <li className="px-3 py-1.5 text-[11px] text-gray-400">
                {total - filtered.length}개 더 있음 — 검색어를 좁혀보세요
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
