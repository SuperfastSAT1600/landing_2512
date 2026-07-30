'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CrmCandidate } from '@/app/api/admin/srm/crm-candidates/route';

interface Props {
  sfv2ProfileId: string;
  mode?: 'link' | 'relink';
  onLinked: (crmStudentId: string, crmName: string) => void;
}

export function CrmLinkSection({ sfv2ProfileId, mode = 'link', onLinked }: Props) {
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<CrmCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<CrmCandidate | null>(null);

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

  const doLink = async (candidate: CrmCandidate, force = false) => {
    if (linking) return;
    setLinking(true);
    try {
      await srmFetch('/api/admin/srm/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sfv2ProfileId, crmStudentId: candidate.id, force }),
      });
      setConfirmCandidate(null);
      onLinked(candidate.id, candidate.name);
    } finally {
      setLinking(false);
    }
  };

  const handleCandidateClick = (candidate: CrmCandidate) => {
    if (linking) return;
    if (candidate.sfv2_profile_id) {
      // 이미 연결된 후보 → 확인 단계
      setConfirmCandidate(candidate);
    } else {
      doLink(candidate);
    }
  };

  const isRelink = mode === 'relink';
  const headerText = isRelink
    ? 'v2 계정 재연결 — 연결할 CRM 학생을 검색하세요'
    : 'CRM 미연결 — 상담 히스토리를 보려면 연결하세요';

  return (
    <div className={`border rounded-lg p-4 ${isRelink ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
      <p className={`text-xs font-semibold mb-3 ${isRelink ? 'text-blue-700' : 'text-orange-700'}`}>{headerText}</p>

      {confirmCandidate ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">{confirmCandidate.name}</span>은 이미 다른 v2 계정에 연결되어 있습니다.
              재연결 시 기존 연결이 해제됩니다. 계속하시겠습니까?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => doLink(confirmCandidate, true)}
              disabled={linking}
              className="flex-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors"
            >
              {linking ? '처리 중...' : '재연결'}
            </button>
            <button
              onClick={() => setConfirmCandidate(null)}
              disabled={linking}
              className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-semibold rounded-md transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  onClick={() => handleCandidateClick(c)}
                  disabled={linking}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 rounded-md text-sm transition-colors"
                >
                  <span className="text-gray-700">{c.name}</span>
                  <span className={`text-xs ${c.sfv2_profile_id ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                    {c.sfv2_profile_id ? '재연결 가능' : c.grade ?? ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
