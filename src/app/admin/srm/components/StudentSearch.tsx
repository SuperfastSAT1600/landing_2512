'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { RosterStudent } from '@/app/api/admin/srm/roster/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
}

interface Props {
  onSelect: (student: SelectedStudent) => void;
}

export function StudentSearch({ onSelect }: Props) {
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/srm/roster')
      .then((r) => r.json())
      .then((data) => setRoster(Array.isArray(data) ? data : []));
  }, []);

  const filtered = query.trim().length < 1
    ? []
    : roster.filter((s) => s.name.includes(query.trim()));

  const handleSelect = (s: RosterStudent) => {
    onSelect(
      s.sfv2ProfileId
        ? { id: s.sfv2ProfileId, name: s.name }
        : { crmStudentId: s.id, name: s.name }
    );
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative mb-6">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-blue-500/50 transition-colors">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="학생 이름으로 검색 후 상담 기록..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-[#1e2124] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onMouseDown={() => handleSelect(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors text-left"
              >
                <span className="font-medium">{s.name}</span>
                {!s.sfv2ProfileId && (
                  <span className="text-[11px] text-gray-600 ml-auto">v2 미연결</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
