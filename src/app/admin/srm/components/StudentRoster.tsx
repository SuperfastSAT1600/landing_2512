'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, CheckCircle, Link, ExternalLink } from 'lucide-react';
import type { UnlinkedStudent } from '@/app/api/admin/srm/match-queue/route';
import type { V2Profile } from '@/app/api/admin/srm/v2-search/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
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
      const res = await fetch(`/api/admin/srm/v2-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setSearching(false);
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
    <div className="mt-2 space-y-1.5">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="v2 이름으로 검색..."
          className="w-full bg-white/5 border border-white/10 rounded-md pl-7 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500"
        />
      </div>
      {searching && <p className="text-xs text-gray-600 px-1">검색 중...</p>}
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
              <span className="text-gray-500">{r.email ?? r.phone ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentRoster({ onStudentClick }: Props) {
  const [students, setStudents] = useState<UnlinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/srm/match-queue');
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAutoLink = async (s: UnlinkedStudent) => {
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

  const handleManualLinked = async (crmStudentId: string) => {
    await fetchStudents();
    setExpanded((prev) => { const next = new Set(prev); next.delete(crmStudentId); return next; });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = query.trim()
    ? students.filter((s) => s.crmName.includes(query.trim()))
    : students;

  const linked = filtered.filter((s) => s.sfv2ProfileId);
  const withMatch = filtered.filter((s) => !s.sfv2ProfileId && s.autoMatch);
  const withoutMatch = filtered.filter((s) => !s.sfv2ProfileId && !s.autoMatch);

  return (
    <div className="space-y-4">
      {/* 검색 */}
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

          {/* 자동 연결 후보 */}
          {withMatch.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-yellow-400 mb-2 uppercase tracking-wide">자동 연결 후보 ({withMatch.length}명)</p>
              <div className="space-y-1.5">
                {withMatch.map((s) => (
                  <div key={s.crmStudentId} className="px-3 py-2.5 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onStudentClick({ crmStudentId: s.crmStudentId, name: s.crmName })}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="text-sm text-gray-200 font-medium">{s.crmName}</span>
                        {s.grade && <span className="text-[11px] text-gray-500">{s.grade}</span>}
                        <span className="text-gray-600 text-xs">→</span>
                        <span className="text-sm text-gray-400">{s.autoMatch!.sfv2Name}</span>
                      </button>
                      <button
                        onClick={() => handleAutoLink(s)}
                        disabled={linking === s.crmStudentId}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors"
                      >
                        <Link size={11} />
                        연결
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수동 연결 필요 */}
          {withoutMatch.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">v2 미연결 ({withoutMatch.length}명)</p>
              <div className="space-y-1.5">
                {withoutMatch.map((s) => (
                  <div key={s.crmStudentId} className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onStudentClick({ crmStudentId: s.crmStudentId, name: s.crmName })}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="text-sm text-gray-200 font-medium">{s.crmName}</span>
                        {s.grade && <span className="text-[11px] text-gray-500">{s.grade}</span>}
                      </button>
                      <button
                        onClick={() => toggleExpand(s.crmStudentId)}
                        className="shrink-0 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {expanded.has(s.crmStudentId) ? '닫기' : 'v2 검색'}
                      </button>
                    </div>
                    {expanded.has(s.crmStudentId) && (
                      <ManualSearch
                        crmStudentId={s.crmStudentId}
                        onLinked={() => handleManualLinked(s.crmStudentId)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 연결 완료 */}
          {linked.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">v2 연결됨 ({linked.length}명)</p>
              <div className="space-y-1">
                {linked.map((s) => (
                  <div key={s.crmStudentId} className="flex items-center gap-1">
                    <button
                      onClick={() => onStudentClick({ id: s.sfv2ProfileId!, name: s.crmName })}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/10 transition-colors text-left"
                    >
                      <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-sm text-gray-300">{s.crmName}</span>
                      {s.grade && <span className="text-[11px] text-gray-600">{s.grade}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(s.crmStudentId); }}
                        className="ml-auto text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                      >
                        {expanded.has(s.crmStudentId) ? '닫기' : '재연결'}
                      </button>
                    </button>
                    <a
                      href={`/coach-prep/${s.crmStudentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="코치 포털"
                      className="p-2 text-gray-600 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
                {linked.map((s) => expanded.has(s.crmStudentId) && (
                  <div key={`expand-${s.crmStudentId}`} className="px-3 pb-2">
                    <ManualSearch
                      crmStudentId={s.crmStudentId}
                      onLinked={() => handleManualLinked(s.crmStudentId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 text-right pt-1">
        {!loading && `총 ${filtered.length}명 · v2 연결 ${linked.length}명`}
      </p>
    </div>
  );
}
