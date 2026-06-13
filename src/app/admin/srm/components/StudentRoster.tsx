'use client';

import { useState, useEffect } from 'react';
import { Search, ExternalLink } from 'lucide-react';

interface RosterStudent {
  id: string;
  name: string;
  sfv2ProfileId: string | null;
  grade: string | null;
}

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

  useEffect(() => {
    fetch('/api/admin/srm/roster')
      .then((r) => r.json())
      .then(setStudents)
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? students.filter((s) => s.name.includes(query.trim()))
    : students;

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
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-600 py-4">
          {query ? '검색 결과 없음' : '수업 중인 학생이 없습니다.'}
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() =>
                  onStudentClick(
                    s.sfv2ProfileId
                      ? { id: s.sfv2ProfileId, name: s.name }
                      : { crmStudentId: s.id, name: s.name }
                  )
                }
                className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200">{s.name}</span>
                  {s.grade && <span className="text-[11px] text-gray-500">{s.grade}</span>}
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    s.sfv2ProfileId
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-gray-600'
                  }`}
                >
                  {s.sfv2ProfileId ? 'v2 연결' : 'CRM만'}
                </span>
              </button>
              <a
                href={`/coach-prep/${s.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="코치 뷰 열기"
                className="p-2 text-gray-600 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 text-right">
        {loading ? '' : `총 ${filtered.length}명`}
      </p>
    </div>
  );
}
