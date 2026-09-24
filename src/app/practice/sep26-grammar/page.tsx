'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  label: string;
  text: string;
}

interface Question {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  options: Option[];
  correct_answer: string;
  grammar_rule: string | null;
}

interface PracticeSet {
  setId: string;
  title: string;
  total: number;
  groups: { skill: string; label: string; total: number; questions: Question[] }[];
}

type Phase = 'gate' | 'test' | 'result';

const DIFF_COLOR: Record<string, string> = {
  hard: '#ef4444',
  medium: '#f59e0b',
  easy: '#22c55e',
};

const TEST_ID = 'sep26-grammar-100';

export default function Sep26GrammarPage() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [instagramId, setInstagramId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // answers: selected label per question id
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // revealed: whether feedback is shown for this question
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const prefetchRef = useRef<Promise<PracticeSet> | null>(null);
  const igRef = useRef('');

  useEffect(() => {
    prefetchRef.current = fetch('/api/practice/sep26-grammar').then((r) => r.json());
  }, []);

  function saveProgress(ig: string, idx: number, ans: Record<string, string>) {
    fetch('/api/practice/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: TEST_ID, instagramId: ig, currentIndex: idx, answers: ans }),
    }).catch(() => {/* fire-and-forget */});
  }

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = accessCode.trim();
    const cleanIg = instagramId.trim();
    if (!cleanCode || !cleanIg) return;

    setLoading(true);
    setGateError('');

    try {
      const res = await fetch('/api/test-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, instagramId: cleanIg, testId: TEST_ID }),
      });
      const result = await res.json();
      if (!result.valid) {
        const msgs: Record<string, string> = {
          invalid_code: 'Invalid access code.',
          code_inactive: 'This code is no longer active.',
          code_expired: 'This code has expired.',
          capacity_exceeded: 'This code has reached its limit. Please get a new code.',
        };
        setGateError(msgs[result.error] ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const normalizedIg = cleanIg.startsWith('@') ? cleanIg : `@${cleanIg}`;
      setInstagramId(normalizedIg);
      igRef.current = normalizedIg;

      const [practiceData, progressRes] = await Promise.all([
        prefetchRef.current ?? fetch('/api/practice/sep26-grammar').then((r) => r.json()),
        fetch(`/api/practice/progress?testId=${TEST_ID}&instagramId=${encodeURIComponent(normalizedIg)}`).then((r) => r.json()),
      ]);

      const flat = practiceData.groups.flatMap((g: PracticeSet['groups'][number]) => g.questions);
      setQuestions(flat);

      if (progressRes.progress) {
        const { current_index, answers: savedAnswers } = progressRes.progress;
        setCurrentIndex(current_index);
        setAnswers(savedAnswers);
        const restoredRevealed: Record<string, boolean> = {};
        Object.keys(savedAnswers).forEach((id) => { restoredRevealed[id] = true; });
        setRevealed(restoredRevealed);
      }

      setLoading(false);
      setPhase('test');
    } catch {
      setGateError('Network error. Please try again.');
      setLoading(false);
    }
  }

  function handleSelect(qId: string, label: string) {
    if (revealed[qId]) return;
    const newAnswers = { ...answers, [qId]: label };
    setAnswers(newAnswers);
    setRevealed((prev) => ({ ...prev, [qId]: true }));
    saveProgress(igRef.current, currentIndex, newAnswers);
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveProgress(igRef.current, nextIndex, answers);
    } else {
      setPhase('result');
    }
  }

  function goPrev() {
    const prevIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
    saveProgress(igRef.current, prevIndex, answers);
  }

  async function handleSubmitScore() {
    if (submitting || submitted) return;
    setSubmitting(true);
    const correct = questions.filter((q) => answers[q.id] === q.correct_answer).length;
    const total = questions.length;
    const questionResults: Record<string, boolean> = {};
    questions.forEach((q) => {
      questionResults[q.id] = answers[q.id] === q.correct_answer;
    });
    try {
      const res = await fetch('/api/practice/sep26-grammar/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId,
          answers,
          correctCount: correct,
          totalCount: total,
          questionResults,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        fetch(`/api/practice/progress?testId=${TEST_ID}&instagramId=${encodeURIComponent(igRef.current)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Gate ────────────────────────────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 40px', width: 380, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>9월 SAT 신유형 문법</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>FSS · Boundaries 100문제 — 이전 시험 미등장 유형</p>
          <form onSubmit={handleGateSubmit}>
            <input
              type="text"
              placeholder="Access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', letterSpacing: '0.05em' }}
            />
            <input
              type="text"
              placeholder="@instagram_id"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
            />
            {gateError && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'left', marginBottom: 8 }}>{gateError}</div>}
            <button
              type="submit"
              disabled={loading || !accessCode.trim() || !instagramId.trim()}
              style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading || !accessCode.trim() || !instagramId.trim() ? 0.4 : 1 }}
            >
              {loading ? '문제 불러오는 중...' : '연습 시작'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const correct = questions.filter((q) => answers[q.id] === q.correct_answer).length;
    const total = questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 40px', width: 380, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>{pct}%</div>
          <p style={{ fontSize: 16, color: '#374151', marginBottom: 4 }}>{correct} / {total} correct</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32 }}>9월 SAT 신유형 문법 100문제</p>
          {!submitted ? (
            <button
              onClick={handleSubmitScore}
              disabled={submitting}
              style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? '제출 중...' : '결과 제출'}
            </button>
          ) : (
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 15 }}>제출 완료 ✓</p>
          )}
        </div>
      </div>
    );
  }

  // ── Test ─────────────────────────────────────────────────────────────────────
  const currentQ = questions[currentIndex];
  const isAtStart = currentIndex === 0;
  const isLastQ = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const selectedLabel = answers[currentQ?.id ?? ''];
  const isRevealed = revealed[currentQ?.id ?? ''];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Section 1: Reading and Writing — Standard English Conventions
        </span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          {answeredCount} / {questions.length} answered
        </span>
      </div>

      {/* Bluebook split layout */}
      <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {currentQ?.passage && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div
                  className="test-passage-content"
                  dangerouslySetInnerHTML={{ __html: currentQ.passage }}
                />
              </div>
            </div>
            <div className="test-resizer" />
          </>
        )}

        <div className={`test-question-panel ${currentQ?.passage ? 'has-passage' : ''}`}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
            {currentQ && (
              <>
                {/* Question number + meta badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    {currentIndex + 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>
                    {currentQ.skill === 'Form, Structure, and Sense' ? 'FSS' : 'Boundaries'}
                  </span>
                  {currentQ.difficulty && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#f8fafc', color: DIFF_COLOR[currentQ.difficulty] ?? '#64748b' }}>
                      {currentQ.difficulty}
                    </span>
                  )}
                  {currentQ.grammar_rule && (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#eff6ff', color: '#3b82f6', fontWeight: 600 }}>
                      {currentQ.grammar_rule}
                    </span>
                  )}
                </div>

                {/* Question text */}
                <div
                  style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: currentQ.question ?? '' }}
                />

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(currentQ.options ?? []).map((opt) => {
                    const isSelected = selectedLabel === opt.label;
                    const isCorrect = opt.label === currentQ.correct_answer;
                    const showCorrect = isRevealed && isCorrect;
                    const showWrong = isRevealed && isSelected && !isCorrect;

                    const optionClass = `bluebook-option btn-press${
                      showCorrect ? ' correct-answer' : showWrong ? ' wrong-answer' : isSelected ? ' selected' : ''
                    }`;

                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSelect(currentQ.id, opt.label)}
                        disabled={isRevealed}
                        className={optionClass}
                        style={
                          showCorrect
                            ? { borderColor: '#22c55e', background: '#f0fdf4' }
                            : showWrong
                            ? { borderColor: '#ef4444', background: '#fef2f2' }
                            : undefined
                        }
                      >
                        <span
                          className="bluebook-option-label"
                          style={
                            showCorrect
                              ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' }
                              : showWrong
                              ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                              : undefined
                          }
                        >
                          {opt.label}
                        </span>
                        <span
                          className="bluebook-option-text"
                          dangerouslySetInnerHTML={{ __html: opt.text }}
                        />
                        {showCorrect && (
                          <span style={{ fontSize: 18, color: '#22c55e', flexShrink: 0 }}>✓</span>
                        )}
                        {showWrong && (
                          <span style={{ fontSize: 18, color: '#ef4444', flexShrink: 0 }}>✗</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback message */}
                {isRevealed && (
                  <div style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: selectedLabel === currentQ.correct_answer ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${selectedLabel === currentQ.correct_answer ? '#bbf7d0' : '#fecaca'}`,
                    fontSize: 13,
                    color: selectedLabel === currentQ.correct_answer ? '#166534' : '#991b1b',
                    fontWeight: 600,
                  }}>
                    {selectedLabel === currentQ.correct_answer
                      ? '정답입니다!'
                      : `오답 — 정답: ${currentQ.correct_answer}`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bluebook-footer">
        <button
          onClick={goPrev}
          disabled={isAtStart}
          className="bluebook-next-btn"
          style={{ opacity: isAtStart ? 0 : 1, pointerEvents: isAtStart ? 'none' : 'auto' }}
        >
          Back
        </button>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {currentIndex + 1} / {questions.length}
        </span>
        <button onClick={goNext} className="bluebook-next-btn">
          {isLastQ ? '결과 보기' : 'Next'}
        </button>
      </div>
    </div>
  );
}
