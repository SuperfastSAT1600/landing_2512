'use client';

import { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { inputCls } from './StudentInfoEdit';

/** name_search API가 실제 반환하는 필드만 — 전체 Student 아님(route.ts의 select와 일치). */
interface ReferrerResult {
  id: string;
  name: string;
  grade: string;
  inquiry_date: string | null;
  parent_phone: string;
}

/** naive/ISO 날짜 문자열 → "YYYY.MM.DD". 없으면 ''. */
function fmtDate(s: string | null): string {
  if (!s) return '';
  const [y, m, d] = s.replace(' ', 'T').split('T')[0].split('-');
  return y && m && d ? `${y}.${m}.${d}` : '';
}

interface Props {
  adminKey: string;
  /** 현재 소개자 이름(자유 텍스트 겸 검색어). editForm.referral_student_name */
  name: string;
  /** 현재 연결된 학생 id(editForm.referral_student_id). 있으면 '학생 연결됨' 표시 */
  linkedId: string;
  /** 현재 리드 id — 자기 자신을 소개자 결과에서 제외 */
  selfId: string;
  /** 선택/입력 시 호출. 기존 학생 선택이면 id 전달, 직접 입력이면 id=null */
  onChange: (name: string, studentId: string | null) => void;
}

/**
 * 소개자 검색 + 직접 입력 폴백. 이름 타이핑 시 학생을 검색해 드롭다운으로 선택(id 링크),
 * 검색에 없는 외부 소개자는 입력 텍스트 그대로 저장(id=null). RetryKanban 검색 패턴 재사용.
 */
export function ReferrerPicker({ adminKey, name, linkedId, selfId, onChange }: Props) {
  const [results, setResults] = useState<ReferrerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // 디바운스 검색. cleanup의 cancelled 가드로 늦게 도착한 stale 응답이 최신 결과를 덮어쓰지 않게 한다.
  useEffect(() => {
    if (!open) return;
    const q = name.trim();
    if (!q) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        // name_search: lead_status 무관 전체 학생 이름 검색(수업중·이탈 학생도 소개자가 될 수 있음).
        const res = await fetch(`/api/crm/students?name_search=${encodeURIComponent(q)}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (!cancelled) {
          setResults((json.data ?? []).filter((s: ReferrerResult) => s.id !== selfId).slice(0, 8));
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [name, open, adminKey, selfId]);

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
      {!open && name.trim() && (
        linkedId ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600"><Check size={11} />학생 연결됨</p>
        ) : (
          <p className="mt-1 text-[11px] text-gray-400">직접 입력 (검색에서 학생 미선택)</p>
        )
      )}
      {open && name.trim() && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-44 overflow-y-auto">
          {searching && <p className="px-3 py-2 text-xs text-gray-400">검색 중...</p>}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">검색 결과 없음 — 입력한 이름이 그대로 저장됩니다</p>
          )}
          {results.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s.name, s.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-0.5"
            >
              <span className="text-xs font-medium text-gray-700">
                {s.name}
                {s.grade && <span className="ml-1 text-[11px] text-gray-400">{s.grade}</span>}
              </span>
              <span className="text-[11px] text-gray-400">
                {[fmtDate(s.inquiry_date) && `인입 ${fmtDate(s.inquiry_date)}`, s.parent_phone].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
