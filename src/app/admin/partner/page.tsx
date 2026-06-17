'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Plus, RotateCcw } from 'lucide-react';

interface PartnerPortal {
  id: string;
  token: string;
  name: string;
  studentNames: string[];
  hasPasscode: boolean;
  createdAt: string;
  url: string;
}

export default function AdminPartnerPage() {
  const [portals, setPortals] = useState<PartnerPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudents, setNewStudents] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/srm/partner-portals');
    if (res.ok) setPortals(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/partner/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleResetPasscode(token: string, name: string) {
    if (!window.confirm(`"${name}" 포털의 비밀번호를 초기화할까요?\n파트너가 다음 접속 시 새 비밀번호를 설정하게 됩니다.`)) return;
    const res = await fetch(`/api/admin/srm/partner-portals/${token}/reset-passcode`, { method: 'POST' });
    if (res.ok) { load(); }
    else alert('초기화에 실패했습니다.');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    const studentNames = newStudents.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/api/admin/srm/partner-portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), studentNames }),
    });
    setCreateLoading(false);
    if (res.ok) {
      setNewName('');
      setNewStudents('');
      setCreating(false);
      load();
    } else {
      alert('생성에 실패했습니다.');
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">파트너 센터</h1>
          <p className="text-sm text-gray-400 mt-0.5">B2B 파트너 포털 관리</p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} />
          새 파트너 포털
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">새 파트너 포털 생성</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">파트너 이름</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="예: 공부하는 아이들"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">학생 이름 (쉼표로 구분)</label>
              <input
                type="text"
                value={newStudents}
                onChange={e => setNewStudents(e.target.value)}
                placeholder="예: 홍길동, 김철수, Jane Kim"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim() || createLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {createLoading ? '생성 중...' : '생성하기'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Portal list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-gray-800/40 rounded-xl animate-pulse" />)}
        </div>
      ) : portals.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-sm">생성된 파트너 포털이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portals.map(portal => (
            <div key={portal.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-white">{portal.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      portal.hasPasscode
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {portal.hasPasscode ? '비밀번호 설정됨' : '설정 대기'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    생성일: {new Date(portal.createdAt).toLocaleDateString('ko-KR')}
                  </p>

                  {/* Student tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {portal.studentNames.length > 0 ? (
                      portal.studentNames.map(name => (
                        <span key={name} className="text-xs bg-gray-700/60 text-gray-300 border border-gray-600/50 px-2 py-0.5 rounded-full">
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-600">학생 없음</span>
                    )}
                  </div>

                  {/* URL */}
                  <code className="text-xs text-gray-500 bg-gray-900/60 px-2 py-1 rounded">
                    /partner/{portal.token}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(portal.token)}
                    title="링크 복사"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    {copied === portal.token ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied === portal.token ? '복사됨' : '링크 복사'}
                  </button>
                  <a
                    href={`/partner/${portal.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="포털 열기"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} />
                    열기
                  </a>
                  {portal.hasPasscode && (
                    <button
                      onClick={() => handleResetPasscode(portal.token, portal.name)}
                      title="비밀번호 초기화"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} />
                      비번 초기화
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
