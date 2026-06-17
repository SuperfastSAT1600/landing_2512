'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ExternalLink, PauseCircle, Link, CheckCircle2, XCircle } from 'lucide-react';
import type { RosterStudent } from '@/app/api/admin/srm/roster/route';
import type { UnlinkedStudent } from '@/app/api/admin/srm/match-queue/route';
import type { V2Profile } from '@/app/api/admin/srm/v2-search/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
}

interface MergedStudent extends RosterStudent {
  autoMatch: UnlinkedStudent['autoMatch'];
}

interface Props {
  onStudentClick: (student: SelectedStudent) => void;
}

function ManualSearch({ crmStudentId, onLinked }: { crmStudentId: string; onLinked: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<V2Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/srm/v2-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const handleLink = async (profileId: string) => {
    if (linking) return;
    setLinking(true);
    await fetch('/api/admin/srm/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfv2ProfileId: profileId, crmStudentId }),
    });
    setLinking(false);
    onLinked();
  };

  return (
    <div className="mt-2 space-y-1.5 pl-1">
      <div className="relative">
        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="v2 이름으로 검색..."
          className="w-full bg-white/5 border border-white/10 rounded-md pl-7 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500"
        />
      </div>
      {searching && <p className="text-[11px] text-gray-600 px-1">검색 중...</p>}
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleLink(r.id)}
              disabled={linking}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded text-xs transition-colors"
            >
              <span className="text-gray-200">{r.full_name}</span>
              <span className="text-gray-500">{r.phone ?? r.email ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRow({
  s,
  expanded,
  linking,
  onStudentClick,
  onAutoLink,
  onToggleExpand,
  onLinked,
}: {
  s: MergedStudent;
  expanded: boolean;
  linking: boolean;
  onStudentClick: () => void;
  onAutoLink: () => void;
  onToggleExpand: () => void;
  onLinked: () => void;
}) {
  const hasV2 = !!s.sfv2ProfileId;

  return (
    <div className={`rounded-lg border transition-colors ${
      hasV2
        ? 'bg-white/[0.03] border-white/10'
        : s.autoMatch
        ? 'bg-yellow-500/5 border-yellow-500/15'
        : 'bg-white/[0.02] border-white/[0.07]'
    }`}>
      <div className="flex items-center gap-1 group px-3 py-2.5">
        {/* 이름 버튼 */}
        <button onClick={onStudentClick} className="flex-1 flex items-center gap-2 text-left min-w-0">
          {s.isPaused && <PauseCircle size={11} className="text-gray-500 shrink-0" />}
          <span className={`text-sm font-medium truncate ${s.isPaused ? 'text-gray-500' : 'text-gray-200'}`}>
            {s.name}
          </span>
          {s.grade && <span className="text-[11px] text-gray-600 shrink-0">{s.grade}</span>}
          {s.hasSummerProgram && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium shrink-0">특강</span>
          )}
        </button>

        {/* 연결 상태 배지 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* CRM 배지 — 항상 연결됨 */}
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
            <CheckCircle2 size={9} />
            CRM
          </span>

          {/* v2 배지 */}
          {hasV2 ? (
            <button
              onClick={onToggleExpand}
              title="재연결"
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium hover:bg-blue-500/25 transition-colors"
            >
              <CheckCircle2 size={9} />
              v2
            </button>
          ) : s.autoMatch ? (
            <button
              onClick={onAutoLink}
              disabled={linking}
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium hover:bg-yellow-500/30 disabled:opacity-40 transition-colors"
            >
              <Link size={9} />
              {s.autoMatch.sfv2Name} 연결
            </button>
          ) : (
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
            >
              <XCircle size={9} />
              v2
            </button>
          )}
        </div>

        {/* 코치 포털 링크 */}
        <a
          href={`/coach-prep/${s.crmStudentId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="코치 포털"
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-gray-600 hover:text-blue-400 transition-colors rounded opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* 인라인 v2 검색 (미연결 수동 / 재연결) */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-2">
          <ManualSearch crmStudentId={s.crmStudentId} onLinked={onLinked} />
        </div>
      )}
    </div>
  );
}

export function StudentRoster({ onStudentClick }: Props) {
  const [students, setStudents] = useState<MergedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState<string | null>(null);
  const [pausedOpen, setPausedOpen] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const [rosterRes, matchRes] = await Promise.all([
      fetch('/api/admin/srm/roster'),
      fetch('/api/admin/srm/match-queue'),
    ]);
    const rosterData: RosterStudent[] = await rosterRes.json().then((d) => Array.isArray(d) ? d : []);
    const matchData: UnlinkedStudent[] = await matchRes.json().then((d) => Array.isArray(d) ? d : []);

    const matchById = new Map(matchData.map((m) => [m.crmStudentId, m]));

    const merged: MergedStudent[] = rosterData.map((r) => ({
      ...r,
      autoMatch: matchById.get(r.crmStudentId)?.autoMatch ?? null,
    }));

    setStudents(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAutoLink = async (s: MergedStudent) => {
    if (!s.autoMatch || linking) return;
    setLinking(s.crmStudentId);
    await fetch('/api/admin/srm/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfv2ProfileId: s.autoMatch.sfv2ProfileId, crmStudentId: s.crmStudentId }),
    });
    await fetchStudents();
    setLinking(null);
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleLinked = async (id: string) => {
    await fetchStudents();
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleClick = (s: MergedStudent) => {
    if (s.sfv2ProfileId) {
      onStudentClick({ id: s.sfv2ProfileId, crmStudentId: s.crmStudentId, name: s.name });
    } else {
      onStudentClick({ crmStudentId: s.crmStudentId, name: s.name });
    }
  };

  const filtered = query.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : students;

  const active = filtered.filter((s) => s.group === 'active');
  const paused = filtered.filter((s) => s.group === 'paused');

  const v2LinkedCount = filtered.filter((s) => s.sfv2ProfileId).length;

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
          {active.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                수업 중 ({active.length}명)
              </p>
              <div className="space-y-1">
                {active.map((s) => (
                  <StudentRow
                    key={s.crmStudentId}
                    s={s}
                    expanded={expanded.has(s.crmStudentId)}
                    linking={linking === s.crmStudentId}
                    onStudentClick={() => handleClick(s)}
                    onAutoLink={() => handleAutoLink(s)}
                    onToggleExpand={() => toggleExpand(s.crmStudentId)}
                    onLinked={() => handleLinked(s.crmStudentId)}
                  />
                ))}
              </div>
            </div>
          )}

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
                    <StudentRow
                      key={s.crmStudentId}
                      s={s}
                      expanded={expanded.has(s.crmStudentId)}
                      linking={linking === s.crmStudentId}
                      onStudentClick={() => handleClick(s)}
                      onAutoLink={() => handleAutoLink(s)}
                      onToggleExpand={() => toggleExpand(s.crmStudentId)}
                      onLinked={() => handleLinked(s.crmStudentId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 text-right pt-1">
        {!loading && `수업 중 ${active.filter((s) => s.group === 'active').length}명 · 휴원 ${paused.length}명 · v2 연결 ${v2LinkedCount}/${filtered.length}`}
      </p>
    </div>
  );
}
