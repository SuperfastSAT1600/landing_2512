'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ExternalLink, PauseCircle } from 'lucide-react';
import type { RosterStudent } from '@/app/api/admin/srm/roster/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
}

interface Props {
  onStudentClick: (student: SelectedStudent) => void;
}

export function StudentRoster({ onStudentClick }: Props) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/srm/roster');
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = query.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : students;

  const handleClick = (s: RosterStudent) => {
    if (s.sfv2ProfileId) {
      onStudentClick({ id: s.sfv2ProfileId, crmStudentId: s.crmStudentId, name: s.name });
    } else {
      onStudentClick({ crmStudentId: s.crmStudentId, name: s.name });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
          className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-600 py-4">{query ? '검색 결과 없음' : '휴원 중인 학생이 없습니다.'}</p>
      ) : (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            휴원 ({filtered.length}명)
          </p>
          <div className="space-y-1">
            {filtered.map((s) => (
              <div key={s.crmStudentId} className="flex items-center gap-1 group">
                <button
                  onClick={() => handleClick(s)}
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-colors text-left"
                >
                  <PauseCircle size={11} className="text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-300 font-medium">{s.name}</span>
                  {s.grade && <span className="text-[11px] text-gray-600">{s.grade}</span>}
                </button>
                <a
                  href={`/coach-prep/${s.crmStudentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="코치 포털"
                  className="p-2 text-gray-600 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600 text-right pt-1">
        {!loading && `휴원 ${filtered.length}명`}
      </p>
    </div>
  );
}
