'use client';

import { useEffect, useState } from 'react';
import type { StudentOption } from '@/lib/work-item-students';
import { workLogApi } from '../api';

const DEBOUNCE_MS = 250;

export function StudentPicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let stale = false;
    const timer = setTimeout(() => {
      workLogApi.searchStudents(q)
        .then(found => { if (!stale) { setOptions(found); setFailed(false); } })
        .catch(() => { if (!stale) setFailed(true); });
    }, DEBOUNCE_MS);
    return () => { stale = true; clearTimeout(timer); };
  }, [query]);

  const shown = query.trim() ? options : [];
  return (
    <div className="w-full max-w-xs">
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        placeholder="학생 이름 검색" aria-label="학생 이름 검색"
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs" />
      {failed && <p role="alert" className="mt-1 text-xs text-red-600">검색에 실패했습니다.</p>}
      {shown.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded border border-gray-200 bg-white text-xs">
          {shown.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s.id)} className="block w-full px-2 py-1.5 text-left hover:bg-gray-100">
                <span className="font-medium">{s.name}</span>
                {s.email && <span className="ml-2 text-gray-400">{s.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onCancel} className="mt-1 text-xs text-gray-500 underline">취소</button>
    </div>
  );
}
