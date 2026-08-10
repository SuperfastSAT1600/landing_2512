'use client';

import { useState, useCallback, useEffect } from 'react';
import { ConceptAutocompleteInput } from './ConceptAutocompleteInput';
import { ProblemTable } from './ProblemTable';
import { ImagePasteZone } from './ImagePasteZone';

interface Problem {
  id: string;
  title: string | null;
  question_image_url: string;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  concepts: { id: string; name: string; slug: string }[];
}

export default function MathWebAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);

  const [qFile, setQFile] = useState<File | null>(null);
  const [aFile, setAFile] = useState<File | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [memo, setMemo] = useState('');
  const [concepts, setConcepts] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('admin_key') ?? '';
    setAdminKey(key);
  }, []);

  const fetchProblems = useCallback(async (key: string) => {
    if (!key) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/mathweb/problems?limit=50', { headers: { 'x-admin-key': key } });
      const json = await res.json();
      setProblems(json.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (adminKey) fetchProblems(adminKey); }, [adminKey, fetchProblems]);

  const handleKeySubmit = () => {
    localStorage.setItem('admin_key', keyInput);
    setAdminKey(keyInput);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!qFile) { setError('문제 이미지를 선택해주세요.'); return; }
    if (concepts.length === 0) { setError('개념을 1개 이상 입력해주세요.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('question_image', qFile);
      if (aFile) fd.append('answer_image', aFile);
      if (answerText.trim()) fd.append('answer_text', answerText.trim());
      if (memo.trim()) fd.append('memo', memo.trim());
      if (title.trim()) fd.append('title', title.trim());
      fd.append('concepts', JSON.stringify(concepts));

      const res = await fetch('/api/admin/mathweb/problems', {
        method: 'POST', headers: { 'x-admin-key': adminKey }, body: fd,
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? '등록 실패'); return; }

      setSuccess('등록 완료!'); setQFile(null); setAFile(null);
      setAnswerText(''); setMemo(''); setConcepts([]); setTitle('');
      fetchProblems(adminKey);
    } finally { setSubmitting(false); }
  };

  if (!adminKey) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 16, padding: '32px 40px', width: 360 }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Math Web 관리자</h1>
          <input
            type="password" value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
            placeholder="Admin Key"
            style={{ width: '100%', padding: '10px 14px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={handleKeySubmit} style={{ marginTop: 12, width: '100%', padding: '10px', background: '#071be9', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            입력
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e4e4e7' }}>
      <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>Math Web 관리자</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>문제 이미지 업로드 · 개념 태깅 · 배포</p>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* 업로드 폼 */}
        <form onSubmit={handleSubmit} style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 14, padding: '24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>새 문제 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ImagePasteZone label="문제 이미지" required value={qFile} onChange={setQFile} isDefaultPasteTarget />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ImagePasteZone label="답 이미지 (선택)" value={aFile} onChange={setAFile} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>답 텍스트 (선택)</span>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  rows={3}
                  placeholder="이미지 대신 텍스트로 답 입력..."
                  style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>제목 (선택)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이차방정식 — 2024 QB Math #12"
              style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>개념 태그 *</span>
            <ConceptAutocompleteInput value={concepts} onChange={setConcepts} adminKey={adminKey} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>메모 (선택)</span>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
              placeholder="수업 중 강조한 포인트나 오답 패턴 메모..."
              style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {success && <p style={{ color: '#22c55e', fontSize: 13, marginBottom: 12 }}>{success}</p>}

          <button type="submit" disabled={submitting}
            style={{ padding: '10px 24px', background: '#071be9', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
            {submitting ? '등록 중...' : '문제 등록'}
          </button>
        </form>

        {/* 문제 목록 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#71717a' }}>총 {problems.length}개 문제</div>
            <button onClick={() => fetchProblems(adminKey)}
              style={{ padding: '6px 14px', background: '#141416', border: '1px solid #27272a', borderRadius: 6, color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>
              새로고침
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#52525b', padding: '48px 0' }}>로딩 중...</div>
          ) : (
            <ProblemTable problems={problems} adminKey={adminKey} onRefresh={() => fetchProblems(adminKey)} />
          )}
        </div>
      </div>
    </div>
  );
}
