'use client';

import { useState, useEffect, useCallback } from 'react';

interface DailyPost {
  id: string;
  instagram_url: string;
  date: string;
  teacher_rep_count?: number;
}

interface Submission {
  id: string;
  date: string;
  display_name: string;
  instagram_username: string;
  rep_count: number;
  photo_url?: string;
  created_at: string;
}

function getLocalDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminMissionPage() {
  const [adminKey, setAdminKey] = useState('');
  const [date, setDate] = useState(() => getLocalDate(0));

  // 포스팅 폼
  const [instagramUrl, setInstagramUrl] = useState('');
  const [teacherRepCount, setTeacherRepCount] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentPost, setCurrentPost] = useState<DailyPost | null>(null);

  // 학생 인증 목록
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 전체 시작 횟수
  const [baseReps, setBaseReps] = useState('');
  const [baseStatus, setBaseStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 미션 이름
  const [missionTitle, setMissionTitle] = useState('');
  const [titleStatus, setTitleStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setAdminKey(localStorage.getItem('admin_key') ?? '');
  }, []);

  const headers = useCallback(() => ({ 'x-admin-key': adminKey }), [adminKey]);

  // 날짜 변경 시 포스팅 로드
  useEffect(() => {
    if (!adminKey) return;
    fetch(`/api/admin/mission?date=${date}`, { headers: headers() })
      .then(r => r.json())
      .then(json => {
        const post = json.data as DailyPost | null;
        setCurrentPost(post);
        setInstagramUrl(post?.instagram_url ?? '');
        setTeacherRepCount(post?.teacher_rep_count?.toString() ?? '');
      });
  }, [date, adminKey, headers]);

  // 날짜 변경 시 학생 인증 로드
  useEffect(() => {
    if (!adminKey) return;
    fetch(`/api/admin/mission/submissions?date=${date}`, { headers: headers() })
      .then(r => r.json())
      .then(json => setSubmissions(json.data ?? []));
  }, [date, adminKey, headers]);

  // 전체 시작 횟수 + 미션 이름 로드 (한번만)
  useEffect(() => {
    if (!adminKey) return;
    fetch('/api/admin/mission/config', { headers: headers() })
      .then(r => r.json())
      .then(json => {
        setBaseReps(json.data?.base_reps?.toString() ?? '0');
        setMissionTitle(json.data?.mission_title ?? '10월 SAT 미션');
      });
  }, [adminKey, headers]);

  function goDate(delta: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  const dateLabel = (() => {
    const today = getLocalDate(0);
    const yesterday = getLocalDate(-1);
    if (date === today) return '오늘';
    if (date === yesterday) return '어제';
    const [, m, d] = date.split('-');
    return `${parseInt(m)}월 ${parseInt(d)}일`;
  })();

  async function handleSavePost() {
    if (!instagramUrl.trim()) return;
    setSaveStatus('saving');
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
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
    }
  }

  async function handleDeletePost() {
    if (!currentPost || !confirm(`${date} 포스팅을 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/mission?date=${date}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (res.ok) {
      setCurrentPost(null);
      setInstagramUrl('');
      setTeacherRepCount('');
    }
  }

  async function handleDeleteSubmission(id: string, name: string) {
    if (!confirm(`${name}의 인증을 삭제할까요?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/mission/submissions?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (res.ok) {
      setSubmissions(prev => prev.filter(s => s.id !== id));
    }
    setDeletingId(null);
  }

  async function handleSaveMissionTitle() {
    if (!missionTitle.trim()) return;
    setTitleStatus('saving');
    const res = await fetch('/api/admin/mission/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ mission_title: missionTitle.trim() }),
    });
    if (res.ok) {
      setTitleStatus('saved');
      setTimeout(() => setTitleStatus('idle'), 2000);
    } else {
      setTitleStatus('error');
    }
  }

  async function handleSaveBaseReps() {
    const val = parseInt(baseReps, 10);
    if (isNaN(val) || val < 0) return;
    setBaseStatus('saving');
    const res = await fetch('/api/admin/mission/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ base_reps: val }),
    });
    if (res.ok) {
      setBaseStatus('saved');
      setTimeout(() => setBaseStatus('idle'), 2000);
    } else {
      setBaseStatus('error');
    }
  }

  const isEditing = !!currentPost;
  const isStory = instagramUrl.includes('/stories/');

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">미션 관리</h1>

      {/* ── 포스팅 등록/수정 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">날짜별 포스팅</p>
          {isEditing && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-[#3182F6] rounded-full">수정 중</span>
          )}
        </div>

        {/* 날짜 네비게이터 */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
          <button onClick={() => goDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors" aria-label="이전 날">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{dateLabel}</p>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
          <button onClick={() => goDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors" aria-label="다음 날">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">인스타그램 URL</label>
          <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
          {isStory && <p className="text-xs text-amber-600 mt-1">⚠️ 스토리 URL은 임베드 불가 — 링크 버튼으로 표시됩니다.</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">선생님 횟수</label>
          <input type="number" value={teacherRepCount} onChange={e => setTeacherRepCount(e.target.value)}
            placeholder="예: 50" min={1}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSavePost} disabled={saveStatus === 'saving' || !instagramUrl.trim()}
            className="flex-1 py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
            {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '저장됐어요!' : isEditing ? '수정하기' : '등록하기'}
          </button>
          {isEditing && (
            <button onClick={handleDeletePost}
              className="px-4 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
              삭제
            </button>
          )}
        </div>
        {saveStatus === 'error' && <p className="text-sm text-red-500 text-center">저장 오류가 발생했어요.</p>}
      </div>

      {/* ── 학생 인증 목록 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-semibold text-gray-800">학생 인증 목록</p>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{submissions.length}건</span>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">이 날짜에 인증이 없어요.</p>
        ) : (
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 px-3 bg-gray-50 rounded-xl">
                {s.photo_url && (
                  <img src={s.photo_url} alt={s.display_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.display_name}</p>
                  <p className="text-xs text-gray-400">@{s.instagram_username} · {s.rep_count}개</p>
                </div>
                <button
                  onClick={() => handleDeleteSubmission(s.id, s.display_name)}
                  disabled={deletingId === s.id}
                  className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors px-2 py-1"
                >
                  {deletingId === s.id ? '...' : '삭제'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 미션 이름 설정 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-0.5">미션 이름</p>
          <p className="text-xs text-gray-400">페이지 상단에 표시되는 미션 이름입니다. 예: 10월 SAT 미션, 11월 SAT 미션</p>
        </div>
        <div className="flex gap-2">
          <input type="text" value={missionTitle} onChange={e => setMissionTitle(e.target.value)}
            placeholder="10월 SAT 미션"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
          <button onClick={handleSaveMissionTitle} disabled={titleStatus === 'saving' || !missionTitle.trim()}
            className="px-4 py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
            {titleStatus === 'saving' ? '...' : titleStatus === 'saved' ? '저장됨!' : '저장'}
          </button>
        </div>
        {titleStatus === 'error' && <p className="text-xs text-red-500">저장 오류가 발생했어요.</p>}
      </div>

      {/* ── 전체 시작 횟수 설정 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-0.5">전체 시작 횟수</p>
          <p className="text-xs text-gray-400">앱 이전에 쌓인 횟수를 포함하려면 여기에 입력하세요. 전체 합산에 더해집니다.</p>
        </div>
        <div className="flex gap-2">
          <input type="number" value={baseReps} onChange={e => setBaseReps(e.target.value)}
            placeholder="0" min={0}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
          <button onClick={handleSaveBaseReps} disabled={baseStatus === 'saving'}
            className="px-4 py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
            {baseStatus === 'saving' ? '...' : baseStatus === 'saved' ? '저장됨!' : '저장'}
          </button>
        </div>
        {baseStatus === 'error' && <p className="text-xs text-red-500">저장 오류가 발생했어요.</p>}
      </div>

      <div className="text-center">
        <a href="/mission" target="_blank" className="text-sm text-[#3182F6] underline">/mission 페이지 미리보기</a>
      </div>
    </div>
  );
}
