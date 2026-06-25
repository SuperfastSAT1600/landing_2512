'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import type { Student } from '@/types/crm';
import { inputCls } from './StudentInfoEdit';

interface Props {
  adminKey: string;
  /** 현재 소개자 이름(자유 텍스트 겸 검색어). editForm.referral_student_name */
  name: string;
  /** 현재 리드 id — 자기 자신을 소개자 결과에서 제외 */
  selfId: string;
  /** 선택/입력 시 호출. 기존 학생 선택이면 id 전달, 직접 입력이면 id=null */
  onChange: (name: string, studentId: string | null) => void;
}

/**
 * 소개자 검색 + 직접 입력 폴백. 이름 타이핑 시 학생을 검색해 드롭다운으로 선택(id 링크),
 * 검색에 없는 외부 소개자는 입력 텍스트 그대로 저장(id=null). RetryKanban 검색 패턴 재사용.
 */
export function ReferrerPicker({ adminKey, name, selfId, onChange }: Props) {
  const [results, setResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      // name_search: lead_status 무관 전체 학생 이름 검색(수업중·이탈 학생도 소개자가 될 수 있음).
      const res = await fetch(`/api/crm/students?name_search=${encodeURIComponent(q.trim())}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setResults((json.data ?? []).filter((s: Student) => s.id !== selfId).slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [adminKey, selfId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(name), 300);
    return () => clearTimeout(t);
  }, [name, open, search]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={name}
          placeholder="이름 검색 또는 직접 입력"
          onChange={e => { onChange(e.target.value, null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`${inputCls} pl-7 ${name ? 'pr-7' : ''}`}
        />
        {name && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange('', null); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && name.trim() && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-44 overflow-y-auto">
          {searching && <p className="px-3 py-2 text-xs text-gray-400">검색 중...</p>}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">검색 결과 없음 — 입력한 이름이 그대로 저장됩니다</p>
          )}
          {results.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s.name, s.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
            >
              <span className="font-medium text-gray-700">{s.name}</span>
              <span className="text-gray-400">{s.parent_phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
