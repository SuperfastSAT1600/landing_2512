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

export default function JunePracticePage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [instagramId, setInstagramId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [data, setData] = useState<PracticeSet | null>(null);
  const [activeSkill, setActiveSkill] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [activeQ, setActiveQ] = useState<string | null>(null);
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

      if (!res.ok) {
        throw new Error('Submit failed');
      }

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
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#71717a' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
          <p style={{ fontSize: 14 }}>300문제 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (phase === 'gate') {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          background: '#141416',
          border: '1px solid #27272a',
          borderRadius: 14,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 400,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#6085FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            SuperfastSAT
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            6월 대비 연습 300
          </h1>
          <p style={{ fontSize: 14, color: '#71717a', marginBottom: 36 }}>
            Instagram ID를 입력하면 시작할 수 있어요
          </p>
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="@instagram_id"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 8,
                border: '1px solid #3f3f46',
                background: '#0f0f11',
                color: '#fff',
                fontSize: 15,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <input
              type="text"
              placeholder="이름 (선택)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 8,
                border: '1px solid #3f3f46',
                background: '#0f0f11',
                color: '#fff',
                fontSize: 15,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!instagramId.trim()}
              style={{
                width: '100%',
                padding: '13px 0',
                background: '#071be9',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: instagramId.trim() ? 'pointer' : 'not-allowed',
                opacity: instagramId.trim() ? 1 : 0.5,
                marginTop: 4,
              }}
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
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.entries(answers).filter(([qId, ans]) => {
    const q = data.groups.flatMap((g) => g.questions).find((q) => q.id === qId);
    return q?.correct_answer === ans;
  }).length;
  const canSubmit = answeredCount >= 10 && !submitted;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: submitted ? '#071be9' : '#ef4444',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#09090b', borderBottom: '1px solid #27272a', padding: '12px 16px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SuperfastSAT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>6월 SAT 대비 연습 300</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                {answeredCount > 0 ? `${correctCount}/${answeredCount}` : `${data.total}문제`}
              </div>
              <div style={{ fontSize: 11, color: '#71717a', marginTop: 1 }}>
                {answeredCount > 0 ? `${Math.round((correctCount / answeredCount) * 100)}% 정답` : 'RW 전체'}
              </div>
            </div>
            <button
              onClick={handleResultSubmit}
              disabled={!canSubmit || submitting}
              style={{
                padding: '8px 16px',
                background: canSubmit ? '#071be9' : '#1e2023',
                color: canSubmit ? '#fff' : '#52525b',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {submitting ? '제출 중...' : submitted ? '제출 완료' : '결과 제출'}
            </button>
          </div>
        </div>
      </div>

      {/* Skill Tabs */}
      <div style={{ borderBottom: '1px solid #27272a', overflowX: 'auto', background: '#0f0f11' }}>
        <div style={{ display: 'flex', minWidth: 'max-content', padding: '0 16px', maxWidth: 720, margin: '0 auto' }}>
          {data.groups.map((g) => {
            const gAnswered = g.questions.filter((q) => answers[q.id]).length;
            const active = activeSkill === g.skill;
            return (
              <button
                key={g.skill}
                onClick={() => { setActiveSkill(g.skill); setActiveQ(null); }}
                style={{
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #071be9' : '2px solid transparent',
                  color: active ? '#fff' : '#71717a',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {g.label}
                <span style={{ marginLeft: 6, color: active ? '#6085FF' : '#52525b', fontSize: 11 }}>
                  {gAnswered}/{g.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question List */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px' }}>
        {currentGroup?.questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isRevealed = revealed[q.id];
          const isExpanded = activeQ === q.id;
          const isCorrect = userAnswer === q.correct_answer;

          return (
            <div
              key={q.id}
              style={{
                marginBottom: 10,
                border: isRevealed
                  ? `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                  : '1px solid #27272a',
                borderRadius: 10,
                background: '#141416',
                overflow: 'hidden',
              }}
            >
              {/* Question Header */}
              <button
                onClick={() => setActiveQ(isExpanded ? null : q.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  minWidth: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: isRevealed
                    ? (isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                    : '#1e2023',
                  color: isRevealed ? (isCorrect ? '#22c55e' : '#ef4444') : '#71717a',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: 13, color: '#d4d4d8', flex: 1, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
                  {q.question}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: DIFFICULTY_COLOR[q.difficulty] ?? '#71717a', fontWeight: 600 }}>
                    {q.difficulty}
                  </span>
                  {isRevealed && (
                    <span style={{ fontSize: 11, color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                      {isCorrect ? '정답' : `${userAnswer}→${q.correct_answer}`}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #27272a', padding: '14px' }}>
                  {q.passage && (
                    <div style={{
                      background: '#0f0f11',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      padding: '12px 14px',
                      marginBottom: 14,
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: '#a1a1aa',
                    }}>
                      {q.passage}
                    </div>
                  )}

                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#e4e4e7', marginBottom: 14 }}>
                    {q.question}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const text = q.choices[letter];
                      const isSelected = userAnswer === letter;
                      const isCorrectChoice = letter === q.correct_answer;
                      let bg = '#0f0f11';
                      let border = '1px solid #27272a';
                      let color = '#d4d4d8';

                      if (isRevealed) {
                        if (isCorrectChoice) { bg = 'rgba(34,197,94,0.1)'; border = '1.5px solid rgba(34,197,94,0.5)'; color = '#86efac'; }
                        else if (isSelected) { bg = 'rgba(239,68,68,0.1)'; border = '1.5px solid rgba(239,68,68,0.4)'; color = '#fca5a5'; }
                      } else if (isSelected) {
                        bg = 'rgba(7,27,233,0.12)'; border = '1.5px solid #071be9'; color = '#e4e4e7';
                      }

                      return (
                        <button
                          key={letter}
                          onClick={() => !isRevealed && handleAnswer(q.id, letter)}
                          disabled={isRevealed}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 12px', background: bg, border, borderRadius: 8,
                            cursor: isRevealed ? 'default' : 'pointer', textAlign: 'left',
                            opacity: 1,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: isRevealed ? (isCorrectChoice ? '#22c55e' : isSelected ? '#ef4444' : '#52525b') : '#6085FF', minWidth: 18, paddingTop: 1, fontSize: 13 }}>
                            {letter}
                          </span>
                          <span style={{ fontSize: 13, lineHeight: 1.6, color }}>{text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {isRevealed && (
                    <div style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      background: '#0f0f11',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: '#a1a1aa',
                    }}>
                      <span style={{ color: '#6085FF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>해설 </span>
                      {q.rationale}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px', textAlign: 'center' }}>
        {answeredCount >= 10 && !submitted && (
          <button
            onClick={handleResultSubmit}
            disabled={submitting}
            style={{
              padding: '12px 32px',
              background: '#071be9',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginBottom: 16,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? '제출 중...' : '결과 제출하기'}
          </button>
        )}
        <p style={{ fontSize: 13, color: '#52525b' }}>
          SuperfastSAT · 5월 SAT 분석 기반 선별 300문제
        </p>
      </div>
    </div>
  );
}
