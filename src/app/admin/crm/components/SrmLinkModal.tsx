'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { CrmUnlinkedStudent, TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

interface Props {
  crmStudent: CrmUnlinkedStudent;
  sfv2Unlinked: TutoringUser[];
  adminKey: string;
  onLinked: () => void;
  onClose: () => void;
}

export function SrmLinkModal({ crmStudent, sfv2Unlinked, adminKey, onLinked, onClose }: Props) {
  const [query, setQuery] = useState(crmStudent.name);
  const [selected, setSelected] = useState<TutoringUser | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const filtered = sfv2Unlinked.filter(u =>
    !query.trim() || u.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const doLink = async () => {
    if (!selected || linking) return;
    setLinking(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/srm/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ sfv2ProfileId: selected.sfv2ProfileId, crmStudentId: crmStudent.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? '연결 실패');
      }
      onLinked();
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결에 실패했습니다.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[400px] max-h-[560px] flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">SFv2 계정 연결</p>
            <p className="text-xs text-gray-500 mt-0.5">{crmStudent.name} · {crmStudent.grade ?? ''}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); }}
              placeholder="SFv2 이름 검색"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {sfv2Unlinked.length === 0
                ? 'SFv2에 미연결 유저가 없습니다.'
                : '검색 결과가 없습니다.'}
            </div>
          ) : (
            filtered.map(u => {
              const isSelected = selected?.sfv2ProfileId === u.sfv2ProfileId;
              return (
                <button
                  key={u.sfv2ProfileId}
                  onClick={() => setSelected(isSelected ? null : u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    {u.grade && <p className="text-xs text-gray-400">{u.grade}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500">잔여 {u.remainingHours}h</p>
                    <p className="text-[10px] text-gray-400">{u.status}</p>
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 text-blue-600" />}
                </button>
              );
            })
          )}
        </div>

        {/* 에러 */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-t border-red-100">
            <AlertTriangle size={12} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* 연결 버튼 */}
        <div className="px-4 py-3 border-t border-gray-100">
          {selected ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{selected.name}</span> (SFv2) →{' '}
                <span className="font-semibold text-gray-700">{crmStudent.name}</span> (CRM) 으로 연결합니다.
              </p>
              <button
                onClick={doLink}
                disabled={linking}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {linking && <Loader2 size={13} className="animate-spin" />}
                {linking ? '연결 중...' : '연결 확정'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">위 목록에서 SFv2 계정을 선택하세요</p>
          )}
        </div>
      </div>
    </div>
  );
}
