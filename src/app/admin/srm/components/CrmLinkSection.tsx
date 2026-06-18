'use client';
import { srmFetch } from '../lib/srm-fetch';

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
        const res = await srmFetch(`/api/admin/srm/crm-candidates?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setCandidates(json.data ?? []);
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
      await srmFetch('/api/admin/srm/link', {
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
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-orange-700 mb-3">CRM 미연결 — 상담 히스토리를 보려면 연결하세요</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="CRM에서 이름 검색..."
        className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500 mb-2"
      />
      {searching && <p className="text-xs text-gray-500">검색 중...</p>}
      {candidates.length > 0 && (
        <div className="space-y-1">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => handleLink(c)}
              disabled={linking || !!c.sfv2_profile_id}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 rounded-md text-sm transition-colors"
            >
              <span className="text-gray-700">{c.name}</span>
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
