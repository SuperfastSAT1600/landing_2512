'use client';

import { useState, useEffect } from 'react';

interface DailyPost {
  instagram_url: string;
  date: string;
  teacher_rep_count?: number;
}

export default function AdminMissionPage() {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [teacherRepCount, setTeacherRepCount] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentPost, setCurrentPost] = useState<DailyPost | null>(null);
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
        const post = json.data as DailyPost | null;
        setCurrentPost(post);
        setInstagramUrl(post?.instagram_url ?? '');
        setTeacherRepCount(post?.teacher_rep_count?.toString() ?? '');
      });
  }, [date, adminKey]);

  async function handleSave() {
    if (!instagramUrl.trim()) return;
    setStatus('saving');

    const res = await fetch('/api/admin/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({
        date,
        instagram_url: instagramUrl.trim(),
        teacher_rep_count: teacherRepCount ? parseInt(teacherRepCount, 10) : null,
      }),
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

  const isEditing = !!currentPost;
  const isStory = instagramUrl.includes('/stories/');

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">미션 챌린지 관리</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        {/* 날짜 + 수정 뱃지 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">날짜</label>
            {isEditing && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-[#3182F6] rounded-full">
                수정 중
              </span>
            )}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
        </div>

        {/* 인스타그램 URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">인스타그램 게시물 URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          {isStory ? (
            <p className="text-xs text-amber-600 mt-1">⚠️ 스토리 URL은 임베드가 안 됩니다. 미션 페이지에 링크 버튼으로 표시돼요.</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">릴스/피드 게시물 URL을 붙여넣으세요</p>
          )}
        </div>

        {/* 선생님 횟수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">선생님 횟수</label>
          <input
            type="number"
            value={teacherRepCount}
            onChange={(e) => setTeacherRepCount(e.target.value)}
            placeholder="예: 50"
            min={1}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={status === 'saving' || !instagramUrl.trim()}
          className="w-full py-3 bg-[#3182F6] hover:bg-[#1B6AE0] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          {status === 'saving'
            ? '저장 중...'
            : status === 'saved'
            ? '저장됐어요!'
            : isEditing
            ? '수정하기'
            : '등록하기'}
        </button>

        {status === 'error' && (
          <p className="text-sm text-red-500 text-center">저장 중 오류가 발생했어요.</p>
        )}
      </div>

      {/* 현재 등록 내용 미리보기 */}
      {currentPost && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[#3182F6] mb-1">현재 등록된 포스팅</p>
          <a
            href={currentPost.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-[#3182F6] underline truncate"
          >
            {currentPost.instagram_url}
          </a>
          {currentPost.teacher_rep_count != null && (
            <p className="text-sm text-gray-600">선생님 횟수: <strong className="text-[#3182F6]">{currentPost.teacher_rep_count}개</strong></p>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <a href="/mission" target="_blank" className="text-sm text-[#3182F6] underline">
          /mission 페이지 미리보기
        </a>
      </div>
    </div>
  );
}
