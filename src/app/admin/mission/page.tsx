'use client';

import { useState, useEffect } from 'react';

export default function AdminMissionPage() {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentPost, setCurrentPost] = useState<{ instagram_url: string; date: string } | null>(null);
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    setAdminKey(localStorage.getItem('admin_key') ?? '');
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    fetch(`/api/admin/mission?date=${date}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((json) => {
        setCurrentPost(json.data);
        if (json.data?.instagram_url) setInstagramUrl(json.data.instagram_url);
        else setInstagramUrl('');
      });
  }, [date, adminKey]);

  async function handleSave() {
    if (!instagramUrl.trim()) return;
    setStatus('saving');

    const res = await fetch('/api/admin/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ date, instagram_url: instagramUrl.trim() }),
    });

    if (res.ok) {
      const json = await res.json();
      setCurrentPost(json.data);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">미션 챌린지 관리</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">인스타그램 게시물 URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="text-xs text-gray-400 mt-1">릴스/피드 게시물 URL을 붙여넣으세요</p>
        </div>

        <button
          onClick={handleSave}
          disabled={status === 'saving' || !instagramUrl.trim()}
          className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {status === 'saving' ? '저장 중...' : status === 'saved' ? '저장됐어요!' : '저장'}
        </button>

        {status === 'error' && (
          <p className="text-sm text-red-500 text-center">저장 중 오류가 발생했어요.</p>
        )}
      </div>

      {currentPost && (
        <div className="mt-4 text-sm text-gray-500">
          현재 설정: <a href={currentPost.instagram_url} target="_blank" rel="noopener noreferrer" className="underline text-orange-500 truncate">
            {currentPost.instagram_url}
          </a>
        </div>
      )}

      <div className="mt-6 text-center">
        <a href="/mission" target="_blank" className="text-sm text-orange-500 underline">
          /mission 페이지 미리보기
        </a>
      </div>
    </div>
  );
}
