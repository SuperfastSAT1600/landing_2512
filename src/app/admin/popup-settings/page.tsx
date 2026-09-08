'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Plus, ExternalLink } from 'lucide-react';

interface Post {
  id: string;
  title: string;
}

interface Rule {
  id: string;
  post_id: string;
  target_post_id: string;
  is_active: boolean;
  source: { id: string; title: string } | null;
  target: { id: string; title: string; featured_image?: string; feature_image?: string } | null;
}

export default function PopupSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('admin_key') || '' : '';

  useEffect(() => {
    Promise.all([fetchRules(), fetchPosts()]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRules() {
    const res = await fetch('/api/admin/popup-rules', {
      headers: { 'x-admin-key': adminKey },
    });
    const data = await res.json();
    if (data.success) setRules(data.rules);
  }

  async function fetchPosts() {
    const res = await fetch('/api/admin/posts', {
      headers: { 'x-admin-key': adminKey },
    });
    const data = await res.json();
    if (data.success) setAllPosts(data.posts.map((p: Post) => ({ id: p.id, title: p.title })));
  }

  async function handleSave() {
    if (!sourceId || !targetId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/popup-rules', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: sourceId, target_post_id: targetId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRules();
        setSourceId('');
        setTargetId('');
        setSourceSearch('');
        setTargetSearch('');
      } else {
        alert('저장 실패: ' + data.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('이 팝업 규칙을 삭제할까요?')) return;
    await fetch(`/api/admin/popup-rules?post_id=${postId}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    await fetchRules();
  }

  async function handleToggle(rule: Rule) {
    await fetch('/api/admin/popup-rules', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: rule.post_id, target_post_id: rule.target_post_id, is_active: !rule.is_active }),
    });
    await fetchRules();
  }

  const filteredSources = allPosts.filter(
    p => p.title.toLowerCase().includes(sourceSearch.toLowerCase()) || p.id.includes(sourceSearch)
  ).slice(0, 10);

  const filteredTargets = allPosts.filter(
    p => (p.title.toLowerCase().includes(targetSearch.toLowerCase()) || p.id.includes(targetSearch)) && p.id !== sourceId
  ).slice(0, 10);

  const sourceName = allPosts.find(p => p.id === sourceId)?.title;
  const targetName = allPosts.find(p => p.id === targetId)?.title;

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">팝업 타겟 설정</h2>
        <p className="text-gray-500 text-sm mt-1">
          특정 포스팅을 읽고 난 뒤 팝업에서 보여줄 "다음 글"을 지정합니다. 미지정 시 관련 글이 자동으로 표시됩니다.
        </p>
      </header>

      {/* Add new rule */}
      <div className="bg-[#1e2023] rounded-xl border border-white/5 p-6 mb-8">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Plus size={16} className="text-blue-400" /> 새 규칙 추가
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Source post */}
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1.5 block">읽고 난 포스팅 (소스)</label>
            <div
              className="bg-[#151719] border border-white/10 rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-2 hover:border-white/20"
              onClick={() => { setSourceOpen(true); setTargetOpen(false); }}
            >
              <Search size={14} className="text-gray-500 flex-shrink-0" />
              <span className={`text-sm truncate ${sourceId ? 'text-white' : 'text-gray-500'}`}>
                {sourceName || '포스팅 검색...'}
              </span>
            </div>
            {sourceOpen && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#151719] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-white/5">
                  <input
                    autoFocus
                    value={sourceSearch}
                    onChange={e => setSourceSearch(e.target.value)}
                    placeholder="제목 또는 ID 검색"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  />
                </div>
                <ul className="max-h-52 overflow-y-auto">
                  {filteredSources.map(p => (
                    <li
                      key={p.id}
                      onClick={() => { setSourceId(p.id); setSourceOpen(false); setSourceSearch(''); }}
                      className="px-3 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer truncate"
                    >
                      <span className="text-gray-500 font-mono text-xs mr-2">{p.id}</span>{p.title}
                    </li>
                  ))}
                  {filteredSources.length === 0 && (
                    <li className="px-3 py-3 text-sm text-gray-600 text-center">결과 없음</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Target post */}
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1.5 block">팝업에 표시할 포스팅 (타겟)</label>
            <div
              className="bg-[#151719] border border-white/10 rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-2 hover:border-white/20"
              onClick={() => { setTargetOpen(true); setSourceOpen(false); }}
            >
              <Search size={14} className="text-gray-500 flex-shrink-0" />
              <span className={`text-sm truncate ${targetId ? 'text-white' : 'text-gray-500'}`}>
                {targetName || '포스팅 검색...'}
              </span>
            </div>
            {targetOpen && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#151719] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-white/5">
                  <input
                    autoFocus
                    value={targetSearch}
                    onChange={e => setTargetSearch(e.target.value)}
                    placeholder="제목 또는 ID 검색"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  />
                </div>
                <ul className="max-h-52 overflow-y-auto">
                  {filteredTargets.map(p => (
                    <li
                      key={p.id}
                      onClick={() => { setTargetId(p.id); setTargetOpen(false); setTargetSearch(''); }}
                      className="px-3 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer truncate"
                    >
                      <span className="text-gray-500 font-mono text-xs mr-2">{p.id}</span>{p.title}
                    </li>
                  ))}
                  {filteredTargets.length === 0 && (
                    <li className="px-3 py-3 text-sm text-gray-600 text-center">결과 없음</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!sourceId || !targetId || saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Existing rules */}
      <div className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">소스 포스팅</div>
          <div className="col-span-5">팝업 타겟</div>
          <div className="col-span-2 text-right">상태 / 삭제</div>
        </div>

        <div className="divide-y divide-white/5">
          {rules.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-sm">설정된 규칙이 없습니다.</div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5">
                <div className="col-span-5 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{rule.source?.title || rule.post_id}</p>
                  <a
                    href={`/blog/${rule.post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-blue-400 font-mono flex items-center gap-1"
                  >
                    {rule.post_id} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="col-span-5 min-w-0">
                  <p className="text-blue-400 text-sm font-medium truncate">{rule.target?.title || rule.target_post_id}</p>
                  <a
                    href={`/blog/${rule.target_post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-blue-400 font-mono flex items-center gap-1"
                  >
                    {rule.target_post_id} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="col-span-2 flex justify-end items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    title={rule.is_active ? '비활성화' : '활성화'}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-opacity hover:opacity-70 ${rule.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}
                  >
                    {rule.is_active ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.post_id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Click-outside to close dropdowns */}
      {(sourceOpen || targetOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => { setSourceOpen(false); setTargetOpen(false); }}
        />
      )}
    </div>
  );
}
