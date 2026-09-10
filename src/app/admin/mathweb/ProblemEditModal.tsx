'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ConceptAutocompleteInput } from './ConceptAutocompleteInput';

interface Concept { id: string; name: string; slug: string; }
interface Problem {
  id: string;
  title: string | null;
  memo: string | null;
  concepts: Concept[];
}

interface Props {
  problem: Problem;
  adminKey: string;
  onSave: () => void;
  onClose: () => void;
}

export function ProblemEditModal({ problem, adminKey, onSave, onClose }: Props) {
  const [title, setTitle] = useState(problem.title ?? '');
  const [memo, setMemo] = useState(problem.memo ?? '');
  const [answerText, setAnswerText] = useState('');
  const [concepts, setConcepts] = useState<string[]>(problem.concepts.map(c => c.name));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // fetch answer_text separately since ProblemTable doesn't carry it
  useEffect(() => {
    fetch(`/api/admin/mathweb/problems/${problem.id}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(json => {
        if (json.data?.answer_text) setAnswerText(json.data.answer_text);
      })
      .catch(() => {});
  }, [problem.id, adminKey]);

  const handleSave = useCallback(async () => {
    if (concepts.length === 0) { setError('개념을 1개 이상 입력해주세요.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/mathweb/problems/${problem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          title: title.trim() || null,
          memo: memo.trim() || null,
          answer_text: answerText.trim() || null,
          concepts,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? '저장 실패'); return; }
      onSave();
      onClose();
    } finally { setSaving(false); }
  }, [problem.id, adminKey, title, memo, answerText, concepts, onSave, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 4 }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e4e4e7', marginBottom: 24 }}>문제 수정</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>제목 (선택)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이차방정식 — 2024 QB Math #12"
              style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>개념 태그 *</span>
            <ConceptAutocompleteInput value={concepts} onChange={setConcepts} adminKey={adminKey} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>메모 (선택)</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="수업 중 강조한 포인트나 오답 패턴 메모..."
              style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>답 텍스트 (선택)</span>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={3}
              placeholder="텍스트로 된 답..."
              style={{ padding: '9px 12px', background: '#000', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #27272a', borderRadius: 8, color: '#a1a1aa', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '9px 20px', background: '#6085FF', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
