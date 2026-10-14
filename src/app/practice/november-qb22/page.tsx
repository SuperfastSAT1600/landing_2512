'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';
import { BluebookPageShell } from '@/components/shared/BluebookPageShell';
import { BluebookQuestionUnit } from '@/components/shared/BluebookQuestionUnit';

// HTML + 내부 LaTeX를 통째로 렌더링 — 테이블 셀 안의 \(...\)가 ContentRenderer에서 쪼개지는 문제 방지
function MathHTMLContent({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    const el = ref.current;
    el.innerHTML = html;
    // Tailwind preflight이 border 어트리뷰트를 reset하므로 테이블에 직접 스타일 주입
    el.querySelectorAll<HTMLTableElement>('table').forEach(t => {
      t.style.borderCollapse = 'collapse';
      t.style.width = '100%';
      t.style.fontSize = '14px';
      t.style.marginBottom = '12px';
    });
    el.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
      cell.style.border = '1px solid #cbd5e1';
      cell.style.padding = '7px 12px';
      cell.style.textAlign = cell.tagName === 'TH' ? 'center' : cell.style.textAlign || 'center';
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tryTypeset = () => { const mj = (window as any).MathJax; if (mj?.typesetPromise) { mj.typesetPromise([el]).catch(() => {}); return true; } return false; };
    if (!tryTypeset()) {
      const t = setInterval(() => { if (tryTypeset()) clearInterval(t); }, 100);
      return () => clearInterval(t);
    }
  }, [html]);
  return <div ref={ref} className={className} style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }} />;
}

const TEST_ID = 'november-qb22';
const TEST_LABEL = '11월 SAT 예상 56문항';
const TEST_DESC = 'CB 문제은행 8월 18일 추가분 56문항';

const CONFIDENCE_LEVELS = [
  { value: 0,   label: '0%',   desc: "No idea — completely guessing" },
  { value: 25,  label: '25%',  desc: "2 other choices also seem correct" },
  { value: 50,  label: '50%',  desc: "Torn between this and one other choice" },
  { value: 75,  label: '75%',  desc: "One confusing alternative, but I'd want an explanation if this is wrong" },
  { value: 100, label: '100%', desc: "Completely sure this is the answer" },
];
const CONF_COLOR: Record<number, string> = { 0: '#ef4444', 25: '#f97316', 50: '#f59e0b', 75: '#3b82f6', 100: '#22c55e' };

const DIFF_COLOR: Record<string, string> = { Hard: '#ef4444', Medium: '#f59e0b', Easy: '#22c55e' };
const DOMAIN_COLOR: Record<string, string> = {
  RW: '#8b5cf6', Math: '#3b82f6',
  Algebra: '#3b82f6', 'Advanced Math': '#0ea5e9', PSDA: '#f59e0b', Geometry: '#10b981',
};

type QuestionType = 'spr' | 'mcq';
interface MCQOption { label: string; text: string; }
interface Question {
  id: string;
  skill: string;
  difficulty: string;
  domain: string;
  passage: string;
  question: string;
  type: QuestionType;
  answers?: string[];
  options?: MCQOption[];
  correctOption?: string;
}

interface DBRow {
  id: string;
  passage: string | null;
  question: string;
  options: MCQOption[] | null;
  correct_answer: string;
  section: string | null;
  type: string;
  skill?: string;
  difficulty?: string;
}

function mapRow(row: DBRow): Question {
  const type: QuestionType = row.type === 'short_answer' ? 'spr' : 'mcq';
  const domain = row.section === 'reading_and_writing' ? 'RW' : 'Math';
  let answers: string[] | undefined;
  let correctOption: string | undefined;
  if (type === 'spr') {
    try {
      const parsed = JSON.parse(row.correct_answer);
      answers = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      answers = [row.correct_answer];
    }
  } else {
    correctOption = row.correct_answer;
  }
  return {
    id: `qb56-${row.id}`,
    skill: row.skill ?? '',
    difficulty: row.difficulty ?? 'Medium',
    domain,
    passage: row.passage ?? '',
    question: row.question ?? '',
    type,
    options: row.options ?? undefined,
    correctOption,
    answers,
  };
}

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase();
}

function checkSPR(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (accepted.some(a => normalizeAnswer(a) === norm)) return true;
  const n = parseFloat(input.replace(/,/g, ''));
  if (isNaN(n)) return false;
  return accepted.some(a => {
    const m = parseFloat(a.replace(/,/g, ''));
    return !isNaN(m) && Math.abs(n - m) < 0.001;
  });
}

function checkAnswer(q: Question, userAnswer: string): boolean {
  if (q.type === 'mcq') return userAnswer === q.correctOption;
  return checkSPR(userAnswer, q.answers ?? []);
}

type Phase = 'gate' | 'leaderboard' | 'test' | 'result';
interface LeaderboardEntry { rank: number; maskedId: string; correctCount: number; totalCount: number; score: number; }
interface Stats { leaderboard: LeaderboardEntry[]; questionStats: Record<string, { correct: number; total: number }>; }

export default function NovemberQB22Page() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [phase, setPhase] = useState<Phase>('gate');
  const [accessCode, setAccessCode] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuestionNav, setShowQuestionNav] = useState(false);

  useEffect(() => {
    // MathJax 선제 로드 — 테이블 내 LaTeX 렌더링에 필요
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).MathJax) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).MathJax = { tex: { inlineMath: [['\\(','\\)']], displayMath: [['\\[','\\]']] }, svg: { fontCache: 'global' }, options: { skipHtmlTags: ['script','noscript','style','textarea','pre'], enableMenu: false } };
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      s.async = true;
      document.head.appendChild(s);
    }
    fetch('/api/practice/november-qb56/questions')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setFetchError(data.error); return; }
        setQuestions((data.questions as DBRow[]).map(mapRow));
      })
      .catch(() => setFetchError('Failed to load questions. Please refresh.'))
      .finally(() => setLoadingQ(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingQ) return;
    const cleanCode = accessCode.trim().toUpperCase();
    const cleanIg = instagramId.trim();
    if (!cleanCode || !cleanIg) return;
    setValidating(true);
    setGateError('');
    try {
      const res = await fetch('/api/test-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, instagramId: cleanIg, testId: TEST_ID }),
      });
      const data = await res.json();
      if (!data.valid) {
        const msgs: Record<string, string> = {
          invalid_code: 'Invalid access code.',
          code_inactive: 'This code is no longer active.',
          code_expired: 'This code has expired.',
          capacity_exceeded: 'This code has reached its limit.',
        };
        setGateError(msgs[data.error] ?? 'Something went wrong. Please try again.');
        return;
      }
      setInstagramId(cleanIg.startsWith('@') ? cleanIg : `@${cleanIg}`);
      const statsRes = await fetch(`/api/practice/stats?testId=${TEST_ID}`);
      if (statsRes.ok) setStats(await statsRes.json());
      setPhase('leaderboard');
    } catch {
      setGateError('Network error. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }, []);

  const handleReveal = useCallback((qId: string) => {
    setRevealed(prev => ({ ...prev, [qId]: true }));
  }, []);

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < 1) { showToast('Solve at least 1 question before submitting.'); return; }
    setSubmitting(true);
    const correct = questions.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;
    setCorrectCount(correct);
    const questionResults = Object.fromEntries(
      questions.map(q => [q.id, checkAnswer(q, answers[q.id] ?? '')])
    );
    try {
      await fetch('/api/practice/november-qb22/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramId, answers, correctCount: correct, totalCount: answeredCount, questionResults, confidence }),
      });
      setSubmitted(true);
      const updatedStats = await fetch(`/api/practice/stats?testId=${TEST_ID}`).then(r => r.json()).catch(() => null);
      if (updatedStats) setStats(updatedStats);
      setPhase('result');
    } catch {
      showToast('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Gate ── */
  if (phase === 'gate') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 40px', width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>SuperfastSAT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{TEST_LABEL}</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>{TEST_DESC}</p>
          {fetchError ? (
            <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{fetchError}</p>
          ) : loadingQ ? (
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Loading questions…</p>
          ) : (
            <p style={{ fontSize: 13, color: '#10b981', marginBottom: 16, fontWeight: 600 }}>{questions.length} questions loaded</p>
          )}
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <input type="text" placeholder="@instagram_id" value={instagramId} onChange={e => setInstagramId(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
            {gateError && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{gateError}</p>}
            <button type="submit" disabled={!accessCode.trim() || !instagramId.trim() || validating || loadingQ || !!fetchError}
              style={{ width: '100%', padding: '13px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: !accessCode.trim() || !instagramId.trim() || validating || loadingQ ? 'not-allowed' : 'pointer', opacity: !accessCode.trim() || !instagramId.trim() || validating || loadingQ ? 0.4 : 1, marginTop: 4 }}>
              {validating ? 'Checking...' : loadingQ ? 'Loading...' : 'Start Practice'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Leaderboard ── */
  if (phase === 'leaderboard') {
    const lb = stats?.leaderboard ?? [];
    const rankColor = (i: number) => i === 0 ? '#1e293b' : i === 1 ? '#475569' : i === 2 ? '#64748b' : '#94a3b8';
    const scoreColor = (i: number) => i === 0 ? '#3b82f6' : i < 3 ? '#64748b' : '#94a3b8';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '36px 24px 20px', textAlign: 'center', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Leaderboard</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>{TEST_LABEL}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {lb.length > 0 ? `${lb.length} students completed this set` : 'No submissions yet. Be the first.'}
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 480, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => (
            <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
              <span style={{ width: 22, fontSize: 12, fontWeight: 700, color: rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
              <span style={{ flex: 1, fontSize: 13, color: i < 3 ? '#1e293b' : '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.maskedId}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
            </div>
          ))}
          {lb.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 60, fontSize: 13 }}>No data</div>}
        </div>
        <div style={{ width: '100%', maxWidth: 480, padding: '20px 24px 32px', flexShrink: 0, borderTop: '1px solid #f1f5f9' }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '0 0 14px', letterSpacing: '0.02em' }}>Can you break into the top 3?</p>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '14px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
            Start →
          </button>
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (phase === 'result') {
    const lb = stats?.leaderboard ?? [];
    const myMasked = '@' + instagramId.replace(/^@/, '')[0] + '***';
    const myEntry = lb.find(e => e.maskedId === myMasked);
    const rankColor = (i: number) => i === 0 ? '#1e293b' : i === 1 ? '#475569' : i === 2 ? '#64748b' : '#94a3b8';
    const scoreColor = (i: number) => i === 0 ? '#3b82f6' : i < 3 ? '#64748b' : '#94a3b8';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '28px 24px 16px', textAlign: 'center', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Your Result</h2>
          {myEntry ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Rank</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.03em' }}>#{myEntry.rank}</span>
              <span style={{ width: 1, height: 24, background: '#e2e8f0' }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.03em' }}>{myEntry.score}%</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{myEntry.correctCount}/{myEntry.totalCount}</span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{correctCount} / {questions.length}</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>{questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%</span>
            </div>
          )}
        </div>
        <div style={{ width: '100%', maxWidth: 480, padding: '4px 24px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>— {lb.length} students —</div>
        </div>
        <div style={{ width: '100%', maxWidth: 480, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => {
            const isMe = entry.maskedId === myMasked;
            return (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 8px', borderRadius: isMe ? 8 : 0, marginBottom: isMe ? 2 : 0, borderBottom: isMe ? 'none' : '1px solid #f1f5f9', gap: 12, background: isMe ? '#eff6ff' : 'transparent', border: isMe ? '1px solid #bfdbfe' : undefined }}>
                <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: isMe ? '#3b82f6' : rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? '#1e40af' : i < 3 ? '#1e293b' : '#64748b', fontFamily: 'monospace', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.maskedId}{isMe && <span style={{ fontSize: 10, color: '#3b82f6', marginLeft: 6 }}>← you</span>}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#3b82f6' : scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
              </div>
            );
          })}
        </div>
        <div style={{ width: '100%', maxWidth: 480, padding: '16px 24px 28px', flexShrink: 0, borderTop: '1px solid #f1f5f9' }}>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '13px 0', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  /* ── Test ── */
  const currentQ = questions[currentIndex] ?? null;
  const isRevealed = currentQ ? !!revealed[currentQ.id] : false;
  const userAnswer = currentQ ? (answers[currentQ.id] ?? '') : '';
  const isCorrect = isRevealed && currentQ ? checkAnswer(currentQ, userAnswer) : false;
  const isWrong = isRevealed && !!userAnswer && !isCorrect;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
  const totalCorrect = questions.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / {questions.length} &nbsp;({totalCorrect} correct)</span>
      <button onClick={handleSubmit} disabled={submitting || submitted || answeredCount < 1}
        style={{ padding: '6px 14px', background: submitted ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitted || submitting || answeredCount < 1 ? 'default' : 'pointer', opacity: answeredCount < 1 ? 0.4 : 1 }}>
        {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit Results'}
      </button>
    </div>
  );

  const passageNode = currentQ?.passage && currentQ.passage.trim() ? (
    <div className="test-passage-content">
      <MathHTMLContent html={currentQ.passage} />
    </div>
  ) : undefined;

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
      {showQuestionNav && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowQuestionNav(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 20px 36px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{TEST_LABEL}</div>
                <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: '#1e293b', display: 'inline-block' }} /> Current
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: '2px dashed #cbd5e1', display: 'inline-block' }} /> Unanswered
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: '#3b82f6', display: 'inline-block' }} /> Answered
                  </span>
                </div>
              </div>
              <button onClick={() => setShowQuestionNav(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.id];
                const conf = confidence[q.id];
                const bg = isCurrent ? '#1e293b' : isAnswered ? (conf !== undefined ? CONF_COLOR[conf] : '#3b82f6') : '#fff';
                const border = !isAnswered && !isCurrent ? '2px dashed #cbd5e1' : '2px solid transparent';
                return (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setShowQuestionNav(false); }}
                    style={{
                      padding: '10px 0', borderRadius: 8, border, background: bg,
                      color: isAnswered || isCurrent ? '#fff' : '#94a3b8',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                    }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BluebookPageShell
        sectionTitle={TEST_LABEL}
        headerRight={headerRight}
        passage={passageNode}
        onPrev={() => setCurrentIndex(i => i - 1)}
        prevHidden={isFirst}
        onNext={() => setCurrentIndex(i => i + 1)}
        nextDisabled={isLast}
        footerCenter={
          <button className="bluebook-footer-center" onClick={() => setShowQuestionNav(v => !v)}>
            Question {currentIndex + 1} of {questions.length} {showQuestionNav ? '∧' : '∨'}
          </button>
        }
      >
        {currentQ && (
          <>
            <BluebookQuestionUnit
              questionNumber={currentIndex + 1}
              question={<MathHTMLContent html={currentQ.question} />}
              skill={currentQ.skill}
              difficulty={currentQ.difficulty}
              difficultyColor={DIFF_COLOR[currentQ.difficulty]}
              {...(currentQ.type === 'spr' ? {
                shortAnswer: userAnswer,
                onShortAnswer: (val) => handleAnswer(currentQ.id, val),
                shortAnswerPlaceholder: 'Enter answer',
                shortAnswerFeedback: isRevealed ? { isCorrect, correctAnswer: isWrong ? (currentQ.answers?.[0] ?? '') : undefined } : null,
              } : {
                options: currentQ.options?.map(opt => ({
                  label: opt.label,
                  text: <ContentRenderer content={opt.text} />,
                })),
                selectedAnswer: userAnswer,
                onSelect: (val: string) => {
                  handleAnswer(currentQ.id, val);
                },
                feedback: isRevealed && userAnswer ? { selectedLabel: userAnswer, correctLabel: currentQ.correctOption ?? '' } : null,
              })}
            >
            </BluebookQuestionUnit>

            {/* Confidence Level Selector */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Confidence Level
                </div>
                {userAnswer && !isRevealed && (
                  <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
                    ← select to reveal answer
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {CONFIDENCE_LEVELS.map(lvl => {
                  const selected = confidence[currentQ.id] === lvl.value;
                  const disabled = !userAnswer;
                  return (
                    <button
                      key={lvl.value}
                      disabled={disabled}
                      onClick={() => {
                        setConfidence(prev => ({ ...prev, [currentQ.id]: lvl.value }));
                        if (userAnswer) handleReveal(currentQ.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        border: selected ? `2px solid ${CONF_COLOR[lvl.value]}` : '1px solid #e5e7eb',
                        background: selected ? CONF_COLOR[lvl.value] : '#fff',
                        color: selected ? '#fff' : disabled ? '#cbd5e1' : '#64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
              {confidence[currentQ.id] !== undefined && (
                <p style={{ fontSize: 12, color: CONF_COLOR[confidence[currentQ.id]], margin: 0, fontStyle: 'italic' }}>
                  {CONFIDENCE_LEVELS.find(l => l.value === confidence[currentQ.id])?.desc}
                </p>
              )}
            </div>
          </>
        )}
      </BluebookPageShell>
    </>
  );
}
