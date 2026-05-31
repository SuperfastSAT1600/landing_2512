'use client';

import { useEffect, useState, useCallback } from 'react';

interface Choice {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface Question {
  id: string;
  difficulty: string;
  passage: string;
  question: string;
  choices: Choice;
  correct_answer: string;
  rationale: string;
}

interface Group {
  skill: string;
  label: string;
  total: number;
  questions: Question[];
}

interface PracticeSet {
  setId: string;
  title: string;
  total: number;
  groups: Group[];
}

type Phase = 'loading' | 'gate' | 'test';

const DIFFICULTY_COLOR: Record<string, string> = {
  Hard: '#ef4444',
  Medium: '#f59e0b',
  Easy: '#22c55e',
};

const SKILL_ORDER = [
  'Standard English Conventions Boundaries',
  'Standard English Conventions Form, Structure, and Sense',
  'Expression of Ideas Rhetorical Synthesis',
  'Expression of Ideas Transitions',
  'Craft and Structure Words in Context',
  'Craft and Structure Cross-Text Connections',
];

const LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function JunePracticePage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [instagramId, setInstagramId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [data, setData] = useState<PracticeSet | null>(null);
  const [activeSkill, setActiveSkill] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/practice/june-2026')
      .then((r) => r.json())
      .then((d: PracticeSet) => {
        const sorted = [...d.groups].sort(
          (a, b) => SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill)
        );
        setData({ ...d, groups: sorted });
        if (sorted.length > 0) setActiveSkill(sorted[0].skill);
        setPhase('gate');
      })
      .catch(() => setPhase('gate'));
  }, []);

  // Reset question index when skill changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeSkill]);

  const handleAnswer = useCallback((qId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
    setRevealed((prev) => ({ ...prev, [qId]: true }));
  }, []);

  function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = instagramId.trim();
    if (!cleaned) return;
    setInstagramId(cleaned);
    setPhase('test');
  }

  async function handleResultSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const allQuestions = data?.groups.flatMap((g) => g.questions) ?? [];
      const correct = Object.entries(answers).filter(([qId, ans]) => {
        const q = allQuestions.find((q) => q.id === qId);
        return q?.correct_answer === ans;
      }).length;
      const total = Object.keys(answers).length;

      const res = await fetch('/api/practice/june-2026/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId: instagramId.startsWith('@') ? instagramId : `@${instagramId}`,
          studentName: studentName.trim() || undefined,
          answers,
          correctCount: correct,
          totalCount: total,
        }),
      });

      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
      setToast('제출 완료! 결과가 저장되었습니다.');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('제출 중 오류가 발생했습니다.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
          <p style={{ fontSize: 14 }}>300문제 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (phase === 'gate') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 40px', width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            SuperfastSAT
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            6월 대비 연습 300
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 36 }}>
            Instagram ID를 입력하면 시작할 수 있어요
          </p>
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="@instagram_id"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              type="text"
              placeholder="이름 (선택)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!instagramId.trim()}
              style={{ width: '100%', padding: '13px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: instagramId.trim() ? 'pointer' : 'not-allowed', opacity: instagramId.trim() ? 1 : 0.4, marginTop: 4 }}
            >
              연습 시작하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentGroup = data.groups.find((g) => g.skill === activeSkill);
  const groupQuestions = currentGroup?.questions ?? [];
  const currentQuestion = groupQuestions[currentIndex] ?? null;
  const hasPassage = !!currentQuestion?.passage;
  const isRevealed = currentQuestion ? !!revealed[currentQuestion.id] : false;
  const userAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === groupQuestions.length - 1;

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.entries(answers).filter(([qId, ans]) => {
    const q = data.groups.flatMap((g) => g.questions).find((q) => q.id === qId);
    return q?.correct_answer === ans;
  }).length;
  const canSubmit = answeredCount >= 10 && !submitted;

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: submitted ? '#1e293b' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SuperfastSAT</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>6월 SAT 대비 연습 300</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
              {answeredCount > 0 ? `${correctCount}/${answeredCount}` : `${data.total}문제`}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {answeredCount > 0 ? `${Math.round((correctCount / answeredCount) * 100)}% 정답` : 'RW 전체'}
            </div>
          </div>
          <button
            onClick={handleResultSubmit}
            disabled={!canSubmit || submitting}
            style={{ padding: '7px 14px', background: canSubmit ? '#3b82f6' : '#334155', color: canSubmit ? '#fff' : '#64748b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
          >
            {submitting ? '제출 중...' : submitted ? '제출 완료' : '결과 제출'}
          </button>
        </div>
      </div>

      {/* Skill tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ display: 'flex', minWidth: 'max-content', padding: '0 16px' }}>
          {data.groups.map((g) => {
            const gAnswered = g.questions.filter((q) => answers[q.id]).length;
            const active = activeSkill === g.skill;
            return (
              <button
                key={g.skill}
                onClick={() => setActiveSkill(g.skill)}
                style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: active ? '2px solid #1e293b' : '2px solid transparent', color: active ? '#1e293b' : '#64748b', fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {g.label}
                <span style={{ marginLeft: 6, color: active ? '#3b82f6' : '#94a3b8', fontSize: 11 }}>
                  {gAnswered}/{g.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bluebook split layout */}
      <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {hasPassage && currentQuestion && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                  {currentQuestion.passage}
                </div>
              </div>
            </div>
            <div className="test-resizer" />
          </>
        )}

        <div className={`test-question-panel${hasPassage ? ' has-passage' : ''}`}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
            {currentQuestion && (
              <>
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    {currentIndex + 1}
                  </span>
                  <span style={{ fontSize: 11, color: DIFFICULTY_COLOR[currentQuestion.difficulty] ?? '#94a3b8', fontWeight: 600 }}>
                    {currentQuestion.difficulty}
                  </span>
                </div>

                {/* Question text */}
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                  {currentQuestion.question}
                </div>

                {/* Answer choices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {LETTERS.map((letter) => {
                    const text = currentQuestion.choices[letter];
                    const isSelected = userAnswer === letter;
                    const isCorrectChoice = letter === currentQuestion.correct_answer;

                    // Inline style overrides for revealed state
                    let revealedStyle: React.CSSProperties = {};
                    if (isRevealed) {
                      if (isCorrectChoice) {
                        revealedStyle = { background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.5)' };
                      } else if (isSelected) {
                        revealedStyle = { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.4)' };
                      } else {
                        revealedStyle = { opacity: 0.5 };
                      }
                    }

                    const labelColor = isRevealed
                      ? isCorrectChoice ? '#22c55e' : isSelected ? '#ef4444' : '#94a3b8'
                      : isSelected ? '#3b82f6' : '#64748b';

                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => !isRevealed && handleAnswer(currentQuestion.id, letter)}
                        disabled={isRevealed}
                        className={`bluebook-option btn-press${!isRevealed && isSelected ? ' selected' : ''}`}
                        style={revealedStyle}
                      >
                        <span className="bluebook-option-label" style={{ color: labelColor, borderColor: labelColor }}>
                          {letter}
                        </span>
                        <span className="bluebook-option-text">{text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Rationale (shown after reveal) */}
                {isRevealed && currentQuestion.rationale && (
                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>해설 </span>
                    <span style={{ fontSize: 13, lineHeight: 1.7, color: '#475569' }}>{currentQuestion.rationale}</span>
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
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirstQuestion}
          className="bluebook-next-btn"
          style={{ opacity: isFirstQuestion ? 0 : 1, pointerEvents: isFirstQuestion ? 'none' : 'auto' }}
        >
          Back
        </button>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {currentIndex + 1} / {groupQuestions.length}
        </span>
        <button
          onClick={() => setCurrentIndex((i) => i + 1)}
          disabled={isLastQuestion}
          className="bluebook-next-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}
