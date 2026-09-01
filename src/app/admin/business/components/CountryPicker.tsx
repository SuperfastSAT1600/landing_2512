'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { countryLabelFull, searchCountries } from '@/lib/countries';

interface Props {
  value: string | null;
  onChange: (code: string | null) => void;
  /** 툴팁 문구 — 버튼의 이름은 선택된 국가명이 된다. */
  label: string;
  placeholder?: string;
  /** "미지정으로 두기"를 허용할지 */
  allowClear?: boolean;
  /** 마운트하자마자 열린 상태로 시작(목록 셀에서 바로 고칠 때) */
  autoOpen?: boolean;
  /** Escape·바깥 클릭으로 닫혔을 때 */
  onClose?: () => void;
  className?: string;
}

/**
 * 240개국을 타이핑으로 좁혀 고르는 선택기.
 * 한글명·영문명·국가 코드 어느 쪽으로도 검색되고, 결과는 한글·영문을 병기한다.
 * native select로는 원하는 국가를 찾을 수 없어 대체했다.
 */
export function CountryPicker({
  value,
  onChange,
  label,
  placeholder = '국가 선택',
  allowClear = false,
  autoOpen = false,
  onClose,
  className = '',
}: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = open ? searchCountries(query) : [];

  function close() {
    setOpen(false);
    setQuery('');
    setHighlight(-1);
    onClose?.();
  }

  function pick(code: string | null) {
    onChange(code);
    setOpen(false);
    setQuery('');
    setHighlight(-1);
  }

  // 바깥 클릭으로 닫기 — 목록 셀에서 열었을 때 편집 상태를 빠져나가는 유일한 경로다.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  });

  // 방향키로 옮긴 항목이 스크롤 밖으로 나가지 않게 따라간다.
  useEffect(() => {
    if (highlight < 0) return;
    const el = listRef.current?.children[highlight];
    // jsdom에는 scrollIntoView가 없다 — 테스트 환경에서는 스크롤 추적만 건너뛴다.
    if (el instanceof HTMLElement && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = results[highlight] ?? results[0];
      if (picked) pick(picked.code);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        title={label}
        onClick={() => (open ? close() : setOpen(true))}
        className={`rounded px-1 -mx-1 text-left hover:bg-blue-50 ${value ? 'text-gray-600' : 'text-gray-300'}`}
      >
        {value ? countryLabelFull(value) : placeholder}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-2.5 py-2">
            <Search size={13} className="text-gray-300 shrink-0" />
            <input
              autoFocus
              role="combobox"
              aria-label="국가 검색"
              aria-expanded="true"
              aria-controls="country-picker-list"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="국가명 또는 코드 (예: 파키스탄, Pakistan, PK)"
              className="w-full text-xs bg-transparent focus:outline-none placeholder:text-gray-300"
            />
          </div>

          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다.</p>
          ) : (
            <ul id="country-picker-list" ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {results.map((c, i) => (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={c.code === value}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(c.code)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs cursor-pointer ${
                    i === highlight ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="truncate text-gray-700">{countryLabelFull(c.code)}</span>
                  {c.code === value && <Check size={12} className="shrink-0 text-blue-500" />}
                </li>
              ))}
            </ul>
          )}

          {allowClear && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full border-t border-gray-100 px-2.5 py-2 text-left text-[11px] text-gray-400 hover:bg-gray-50"
            >
              미지정으로 두기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
