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

function StudentRow({ s, onClick }: { s: RosterStudent; onClick: () => void }) {
  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-colors text-left"
      >
        {s.isPaused && <PauseCircle size={11} className="text-gray-500 shrink-0" />}
        <span className={`text-sm font-medium ${s.isPaused ? 'text-gray-500' : 'text-gray-200'}`}>{s.name}</span>
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
  );
}

export function StudentRoster({ onStudentClick }: Props) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pausedOpen, setPausedOpen] = useState(false);

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

  const active = filtered.filter((s) => s.group === 'active');
  const paused = filtered.filter((s) => s.group === 'paused');

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
        <p className="text-xs text-gray-600 py-4">{query ? '검색 결과 없음' : '수업 중인 학생이 없습니다.'}</p>
      ) : (
        <div className="space-y-5">
          {/* 수업 중 */}
          {active.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                수업 중 ({active.length}명)
              </p>
              <div className="space-y-1">
                {active.map((s) => (
                  <StudentRow key={s.crmStudentId} s={s} onClick={() => handleClick(s)} />
                ))}
              </div>
            </div>
          )}

          {/* 휴원 — 접어두기 기본값 */}
          {paused.length > 0 && (
            <div>
              <button
                onClick={() => setPausedOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-400 transition-colors"
              >
                <PauseCircle size={11} />
                휴원 ({paused.length}명)
                <span className="text-gray-600">{pausedOpen ? '▲' : '▼'}</span>
              </button>
              {pausedOpen && (
                <div className="space-y-1">
                  {paused.map((s) => (
                    <StudentRow key={s.crmStudentId} s={s} onClick={() => handleClick(s)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 text-right pt-1">
        {!loading && `수업 중 ${active.length}명 · 휴원 ${paused.length}명`}
      </p>
    </div>
  );
}
