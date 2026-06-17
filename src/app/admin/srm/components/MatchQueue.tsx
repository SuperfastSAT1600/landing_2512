import { srmFetch } from '../lib/srm-fetch';
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CheckCircle, Link, Search } from 'lucide-react';
import type { UnlinkedStudent } from '@/app/api/admin/srm/match-queue/route';
import type { V2Profile } from '@/app/api/admin/srm/v2-search/route';

interface Props {
  onLinked?: () => void;
}

const REASON_LABEL = { phone: '전화번호 일치', email: '이메일 일치', both: '전화번호+이메일 일치', name: '이름 일치' };

function ManualSearch({ crmStudentId, onLinked }: { crmStudentId: string; onLinked: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<V2Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      const res = await srmFetch(`/api/admin/srm/v2-search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(Array.isArray(json.data) ? json.data : []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const handleLink = async (profileId: string) => {
    if (linking) return;
    setLinking(true);
    await srmFetch('/api/admin/srm/link', {
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
              <span className="text-gray-500">{r.phone ?? r.email ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchQueue({ onLinked }: Props) {
  const [students, setStudents] = useState<UnlinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const res = await srmFetch('/api/admin/srm/match-queue');
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAutoLink = async (s: UnlinkedStudent) => {
    if (!s.autoMatch || linking) return;
    setLinking(s.crmStudentId);
    await srmFetch('/api/admin/srm/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfv2ProfileId: s.autoMatch.sfv2ProfileId, crmStudentId: s.crmStudentId }),
    });
    await fetchStudents();
    setLinking(null);
    onLinked?.();
  };

  const handleManualLinked = async (crmStudentId: string) => {
    await fetchStudents();
    setExpanded((prev) => { const next = new Set(prev); next.delete(crmStudentId); return next; });
    onLinked?.();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="mt-8 text-sm text-gray-500">수업 중인 학생이 없습니다.</div>
    );
  }

  const linked = students.filter((s) => s.sfv2ProfileId);
  const withMatch = students.filter((s) => !s.sfv2ProfileId && s.autoMatch);
  const withoutMatch = students.filter((s) => !s.sfv2ProfileId && !s.autoMatch);

  return (
    <div className="mt-4 space-y-6">

      {/* 자동 매칭 후보 */}
      {withMatch.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-300 mb-2">자동 매칭 후보 ({withMatch.length}명)</p>
          <div className="space-y-2">
            {withMatch.map((s) => (
              <div key={s.crmStudentId} className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{s.crmName}</span>
                    <span className="text-gray-600 text-xs">→</span>
                    <span className="text-sm text-gray-300">{s.autoMatch!.sfv2Name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {REASON_LABEL[s.autoMatch!.matchReason]} · {s.autoMatch!.matchScore}점
                  </p>
                </div>
                <button
                  onClick={() => handleAutoLink(s)}
                  disabled={linking === s.crmStudentId}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors"
                >
                  <Link size={12} />
                  연결
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수동 연결 필요 */}
      {withoutMatch.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">수동 연결 필요 ({withoutMatch.length}명)</p>
          <div className="space-y-2">
            {withoutMatch.map((s) => (
              <div key={s.crmStudentId} className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{s.crmName}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {[s.phone, s.email].filter(Boolean).join(' · ') || '연락처 없음'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpand(s.crmStudentId)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
          <p className="text-xs font-semibold text-gray-600 mb-2">연결 완료 ({linked.length}명)</p>
          <div className="space-y-1.5">
            {linked.map((s) => (
              <div key={s.crmStudentId} className="px-4 py-3 bg-white/[0.03] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-green-500 shrink-0" />
                    <span className="text-sm text-gray-400">{s.crmName}</span>
                  </div>
                  <button
                    onClick={() => toggleExpand(s.crmStudentId)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {expanded.has(s.crmStudentId) ? '닫기' : '재연결'}
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

      {/* 총계 */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-2 border-t border-white/5">
        <Check size={12} className="text-green-500" />
        {linked.length}/{students.length}명 연결 완료
      </div>
    </div>
  );
}
