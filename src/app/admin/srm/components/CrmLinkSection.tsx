'use client';

import { useState, useEffect } from 'react';
import type { CrmCandidate } from '@/app/api/admin/srm/crm-candidates/route';

interface Props {
  sfv2ProfileId: string;
  onLinked: (crmStudentId: string, crmName: string) => void;
}

export function CrmLinkSection({ sfv2ProfileId, onLinked }: Props) {
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<CrmCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (q.length < 1) { setCandidates([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/srm/crm-candidates?q=${encodeURIComponent(q)}`);
        setCandidates(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const handleLink = async (candidate: CrmCandidate) => {
    if (linking) return;
    setLinking(true);
    try {
      await fetch('/api/admin/srm/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sfv2ProfileId, crmStudentId: candidate.id }),
      });
      onLinked(candidate.id, candidate.name);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
      <p className="text-xs font-semibold text-orange-300 mb-3">CRM 미연결 — 상담 히스토리를 보려면 연결하세요</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="CRM에서 이름 검색..."
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 mb-2"
      />
      {searching && <p className="text-xs text-gray-500">검색 중...</p>}
      {candidates.length > 0 && (
        <div className="space-y-1">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => handleLink(c)}
              disabled={linking || !!c.sfv2_profile_id}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-md text-sm transition-colors"
            >
              <span className="text-gray-200">{c.name}</span>
              <span className="text-xs text-gray-500">
                {c.sfv2_profile_id ? '이미 연결됨' : c.grade ?? ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
