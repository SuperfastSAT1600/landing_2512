'use client';

import { useState, useCallback } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

const TEST_ID = 'august-math-decimal-30';

interface Question {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  answers: string[];
}

type Phase = 'gate' | 'leaderboard' | 'test' | 'result';

interface LeaderboardEntry {
  rank: number;
  maskedId: string;
  correctCount: number;
  totalCount: number;
  score: number;
}

interface Stats {
  leaderboard: LeaderboardEntry[];
  questionStats: Record<string, { correct: number; total: number }>;
}

const DIFF_COLOR: Record<string, string> = {
  Hard: '#ef4444', Medium: '#f59e0b', Easy: '#22c55e',
};

const QUESTIONS: Question[] = [
  { id: "c21541d3-dba0-4b15-bf5f-4aed961a51e2", skill: "Linear equations in two variables", difficulty: "Easy", passage: "", question: "<p>Line <em>m</em> is defined by \\(y = \\frac{2}{3}x - 5\\). Line <em>n</em> is parallel to line <em>m</em> in the \\(xy\\)-plane. What is the slope of line <em>n</em>?</p>", answers: ["2/3", "0.666", "0.667", ".6666", ".6667"] },
  { id: "c5e77618-8fa5-432d-bf63-a4273272b8d4", skill: "Nonlinear functions", difficulty: "Easy", passage: "", question: "<p>The function \\(g\\) is defined by \\(g(x) = \\dfrac{12}{4x + 3}\\). What is the value of \\(g(3)\\)?</p>", answers: [".8", ".80", "0.8", "0.80", "4/5"] },
  { id: "a3f8c201-9e44-4b72-bd21-7c6d3e5f9012", skill: "Linear equations in one variable", difficulty: "Hard", passage: "", question: "<p style=\"text-align: center;\">\\(\\dfrac{3(x+2)}{4} - \\dfrac{2(x-3)}{5} = \\dfrac{x+8}{10}\\)</p><p>What value of \\(x\\) is the solution of the given equation?</p>", answers: ["-38/5", "-7.6", "-7.60"] },
  { id: "be843583-bfe1-4889-bab1-06887ac49cf1", skill: "Linear equations in two variables", difficulty: "Easy", passage: "", question: "<p>Line <em>p</em> is defined by \\(y = -\\dfrac{2}{3}x + 5\\). Line <em>q</em> is parallel to line <em>p</em> in the \\(xy\\)-plane. What is the slope of line <em>q</em>?</p>", answers: ["-2/3", "-0.666", "-0.667", "-.6666", "-.6667"] },
  { id: "4a2f151b-9206-4d5c-967c-4741e1e4bdd8", skill: "Nonlinear functions", difficulty: "Easy", passage: "", question: "<p>The function <em>g</em> is defined by \\(g(x) = \\dfrac{12}{4x + 2}\\). What is the value of \\(g(4)\\)?</p>", answers: ["2/3", "0.666", "0.667", ".6666", ".6667"] },
  { id: "900feba3-2ef2-4547-9f35-456b0b01e98c", skill: "Linear functions", difficulty: "Easy", passage: "", question: "<p style=\"text-align: center;\">\\(g(t) = t + \\dfrac{5}{9}\\)</p><p>The function \\(g\\) is defined by the given equation. What is the value of \\(g(t)\\) when \\(t = \\dfrac{7}{9}\\)?</p>", answers: ["4/3", "1.333", "1.334"] },
  { id: "21f6d18d-288a-48a7-a0a1-a1324058c353", skill: "Linear functions", difficulty: "Medium", passage: "", question: "<div style=\"text-align: justify;\">\nIn the \\(xy\\)-plane, line \\(k\\) passes through the point \\((5, 7)\\) and is parallel to the line with the equation \\( y = \\frac{7}{5}x - \\frac{11}{5} \\). What is the slope of line \\(k\\)?\n</div>\n", answers: ["7/5"] },
  { id: "d9f8e0a8-1123-49e2-9849-a5e7293d245b", skill: "Linear equations in one variable", difficulty: "Medium", passage: "", question: "<p>\\(4(r+3)+6(r-4)=5r\\)</p><p>What value of \\(r\\) is the solution of the equation above?</p>", answers: ["12/5", "2.4", "2.40"] },
  { id: "2430bfc3-7989-4f64-a7eb-22515c42a742", skill: "Linear equations in one variable", difficulty: "Medium", passage: "", question: "<p>\\(4(n+5)+3(n-2)=2n\\)</p><p>What value of \\(n\\) is the solution of the equation above?</p>", answers: ["-14/5", "-2.8", "-2.80"] },
  { id: "3c957d15-371b-4f87-9bfb-a17ada748bd6", skill: "Linear equations in one variable", difficulty: "Medium", passage: "", question: "<p>\\(6(t+2)+3(t-5)=4t\\)</p><p>What value of \\(t\\) is the solution of the equation above?</p>", answers: ["3/5", "0.6", "0.60", ".6", ".60"] },
  { id: "18df4849-a748-4379-8078-793dd3a463fa", skill: "Probability and conditional probability", difficulty: "Medium", passage: "", question: "<p>Each vertex of a \\(24\\)-sided polygon is labeled with one of the \\(24\\) letters \\(A\\) through \\(X\\), with a different letter at each vertex. If one vertex is selected at random, what is the probability that the letter \\(M\\) will be at the selected vertex?</p>", answers: ["1/24", "0.0416", "0.0417", ".0416", ".0417"] },
  { id: "32a06c4a-56bc-451a-930c-0e589125f191", skill: "Linear equations in two variables", difficulty: "Medium", passage: "", question: "<p>What is the slope of the graph of \\(y = \\frac{1}{3}(34x + 15) + 8x\\) in the \\(xy\\)-plane?</p>", answers: ["58/3", "19.33"] },
  { id: "c7e8f937-d52e-4cb4-b3b1-115df5bb596c", skill: "Nonlinear equations in one variable and systems of equations in two variables", difficulty: "Medium", passage: "", question: "<p>\\(3x^2 + x - 10 = 0\\)</p><p>If \\(a\\) is a solution of the equation above and \\(a > 0\\), what is the value of \\(a\\)?</p>", answers: ["5/3", "1.666", "1.667"] },
  { id: "e31ea121-1451-4f18-87ec-0070ebac38ef", skill: "One-variable data: Distributions and measures of center and spread", difficulty: "Medium", passage: "", question: "<p>\\(5, 12, 3, 8, 15, 9\\)</p><p>The mean of the list of numbers above is what fraction of the sum of the six numbers?</p>", answers: ["1/6", "0.166", "0.167", ".1666", ".1667"] },
  { id: "d401c95d-4a61-41af-a24e-fff649c75026", skill: "Linear equations in two variables", difficulty: "Medium", passage: "", question: "<p>A line passes through the points \\((3, 7)\\) and \\((16, 29)\\) in the \\(xy\\)-plane. What is the slope of the line?</p>", answers: ["22/13", "1.692"] },
  { id: "3250f18d-fa99-4e37-8311-89b528df0876", skill: "Nonlinear functions", difficulty: "Medium", passage: "", question: "<p>The function \\(g\\) is defined by \\(g(x) = 3\\left(x - \\dfrac{2}{3}\\right)^2 + \\dfrac{7}{3}\\). What is the value of \\(g\\!\\left(\\dfrac{2}{3}\\right)\\)?</p>", answers: ["7/3", "2.333", "2.334"] },
  { id: "d866902b-b61e-45d6-9cfa-de11b59aa5ef", skill: "Nonlinear equations in one variable and systems of equations in two variables", difficulty: "Medium", passage: "", question: "<p style=\"text-align: center;\">\\(3x^2 - 11x - 20 = 0\\)</p><p>What is the sum of the solutions to the given equation?</p>", answers: ["11/3", "3.666", "3.667"] },
  { id: "8e69e5df-1822-4016-adbf-9edd59a4e0d4", skill: "Equivalent expressions", difficulty: "Medium", passage: "", question: "<p>\\(\\left(\\frac{2}{5}x + \\frac{3}{5}\\right)\\left(\\frac{3}{5}x + \\frac{2}{5}\\right)\\)</p><p>The expression above is equivalent to \\(ax^2 + bx + c\\), where \\(a\\), \\(b\\), and \\(c\\) are constants. What is the value of \\(b\\)?</p>", answers: ["13/25", "0.52", "0.520"] },
  { id: "63c4db03-0bb8-4aed-9a75-a3b81c3c3732", skill: "Linear functions", difficulty: "Medium", passage: "", question: "<p>According to a model, the head width, in millimeters, of a worker bumblebee can be estimated by adding \\(0.6\\) to four times the body weight of the bee, in grams. According to the model, what would be the head width, in millimeters, of a worker bumblebee that has a body weight of \\(0.5\\) grams?</p>", answers: ["13/5", "2.6", "2.60", "2.600"] },
  { id: "bafa40ef-ffe5-41d4-b0c4-7a2e3cdb33d0", skill: "Area and volume", difficulty: "Medium", passage: "", question: "<p>A circle has a radius of \\(3.4\\) inches. The area of the circle is \\(k\\pi\\) square inches, where \\(k\\) is a constant. What is the value of \\(k\\)?</p>", answers: ["11.56", "11.560", "289/25"] },
  { id: "06b46fd0-8a86-43eb-aa0e-5d3017291971", skill: "Right triangles and trigonometry", difficulty: "Hard", passage: "", question: "<p>In triangle <em>PQR</em>, \\(\\cos(Q)=\\frac{20}{52}\\) and angle <em>P</em> is a right angle. What is the value of \\(\\cos(R)\\)?</p>", answers: ["12/13", "0.923", ".9230", ".9231"] },
  { id: "5b4df032-c0e9-49b1-b7a7-63dea150dab8", skill: "Right triangles and trigonometry", difficulty: "Hard", passage: "", question: "<p>In triangle <em>ABC</em>, \\(\\cos(B)=\\dfrac{36}{85}\\) and angle <em>A</em> is a right angle. What is the value of \\(\\cos(C)\\)?</p>", answers: ["77/85", "0.9058", "0.9059", ".9058", ".9059"] },
  { id: "18d5b71c-e321-4b4c-bcca-26f56444b98a", skill: "Percentages", difficulty: "Hard", passage: "", question: "<p>The number \\(a\\) is \\(80\\%\\) less than the positive number \\(b\\). The number \\(c\\) is \\(65\\%\\) greater than \\(a\\). The number \\(c\\) is how many times \\(b\\)?</p>", answers: ["0.33", "0.330", ".33", ".330", "33/100"] },
  { id: "21ad5c1c-c069-404c-aa80-3d51ae9999a9", skill: "Circles", difficulty: "Hard", passage: "", question: "<p>Points <em>A</em> and <em>B</em> lie on a circle with radius 3, and arc \\(AB\\) has length \\(\\dfrac{\\pi}{2}\\). What fraction of the circumference of the circle is the length of arc \\(AB\\)?</p>", answers: ["1/12", "0.083", ".0833"] },
  { id: "bd36004c-1576-45b5-b123-1e53e235ed8d", skill: "Nonlinear equations in one variable and systems of equations in two variables", difficulty: "Hard", passage: "", question: "<p style=\"text-align: center;\">\\(6(x + 8) = 18(x - 13)(x + 8)\\)</p><p>What is the sum of the solutions to the given equation?</p>", answers: ["16/3", "5.333", "5.334", "5.3333", "5.3334"] },
  { id: "74192bd2-83aa-4a9c-a3cd-1b376fcaae57", skill: "Percentages", difficulty: "Hard", passage: "", question: "<p>The number \\(a\\) is \\(120\\%\\) greater than the number \\(b\\). The number \\(b\\) is \\(70\\%\\) less than \\(55\\). What is the value of \\(a\\)?</p>", answers: ["36.3", "36.30", "363/10"] },
  { id: "f860e928-028b-4d4b-9366-df9df84e337f", skill: "Percentages", difficulty: "Hard", passage: "", question: "A boutique buys certain scarves for a purchase price of \\(8.00\\) dollars each and then marks them each for sale at a consumer price that is \\(350\\%\\) of the purchase price. After 3 months, any remaining scarves not yet sold are marked at a discounted price that is \\(60\\%\\) off the consumer price. What is the discounted price of each of the remaining scarves, in dollars?", answers: ["11.2", "11.20", "56/5"] },
  { id: "602ff4d8-2ed3-4ca8-961b-25cdaf0c5c18", skill: "Right triangles and trigonometry", difficulty: "Hard", passage: "", question: "<p>In triangle <em>XYZ</em>, \\(\\cos(Y)=\\dfrac{33}{183}\\) and angle <em>X</em> is a right angle. What is the value of \\(\\cos(Z)\\)?</p>", answers: ["60/61", "0.9836", ".9836", "0.984", ".984", "0.98360", ".98360"] },
  { id: "05add5a4-7cd0-436e-90d5-1970eb7e1e3b", skill: "Percentages", difficulty: "Hard", passage: "", question: "<p>The number \\(a\\) is \\(160\\%\\) greater than the number \\(b\\). The number \\(b\\) is \\(70\\%\\) less than \\(55\\). What is the value of \\(a\\)?</p>", answers: ["42.9", "42.90", "429/10"] },
  { id: "bf5c3100-3e5d-495a-82f5-f4b1e256975d", skill: "Equivalent expressions", difficulty: "Hard", passage: "", question: "<p>The expression \\(5\\sqrt[3]{3^3 x^{18}} \\cdot \\sqrt[7]{2^7 x^2}\\) is equivalent to \\(ax^b\\), where \\(a\\) and \\(b\\) are positive constants and \\(x > 1\\). What is the value of \\(a + b\\)?</p>", answers: ["254/7", "36.28", "36.29"] },
];

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase();
}

function parseNumeric(s: string): number | null {
  const t = s.trim();
  const slash = t.indexOf('/');
  if (slash > 0) {
    const num = parseFloat(t.slice(0, slash));
    const den = parseFloat(t.slice(slash + 1));
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    return null;
  }
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function checkAnswer(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (accepted.some(a => normalizeAnswer(a) === norm)) return true;
  const inputNum = parseNumeric(input);
  if (inputNum === null) return false;
  return accepted.some(a => {
    const n = parseNumeric(a);
    return n !== null && Math.abs(inputNum - n) < 0.001;
  });
}

export default function AugustMathPage() {
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
  const [correctCount, setCorrectCount] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const correct = QUESTIONS.filter(q => checkAnswer(answers[q.id] ?? '', q.answers)).length;
    setCorrectCount(correct);

    const questionResults = Object.fromEntries(
      QUESTIONS.map(q => [q.id, checkAnswer(answers[q.id] ?? '', q.answers)])
    );

    try {
      await fetch('/api/practice/august-math/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId,
          answers,
          correctCount: correct,
          totalCount: answeredCount,
          questionResults,
        }),
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>8월 SAT MATH 실전연습1</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>소수 · 분수 정답 30문항</p>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 36 }}>Enter your access code and Instagram ID to begin</p>
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <input type="text" placeholder="@instagram_id" value={instagramId} onChange={e => setInstagramId(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
            {gateError && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{gateError}</p>}
            <button type="submit" disabled={!accessCode.trim() || !instagramId.trim() || validating}
              style={{ width: '100%', padding: '13px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: !accessCode.trim() || !instagramId.trim() || validating ? 'not-allowed' : 'pointer', opacity: !accessCode.trim() || !instagramId.trim() || validating ? 0.4 : 1, marginTop: 4 }}>
              {validating ? 'Checking...' : 'Start Practice'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Leaderboard ── */
  if (phase === 'leaderboard') {
    const lb = stats?.leaderboard ?? [];
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#a1a1aa' : i === 2 ? '#71717a' : '#3f3f46';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#a1a1aa' : '#52525b';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '36px 24px 20px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Leaderboard</h2>
          <p style={{ fontSize: 13, color: '#52525b', margin: '0 0 4px' }}>8월 SAT MATH 실전연습1</p>
          <p style={{ fontSize: 12, color: '#3f3f46', margin: 0 }}>
            {lb.length > 0 ? `${lb.length} students completed this set` : 'No submissions yet. Be the first.'}
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 400, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => (
            <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
              <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
              <span style={{ flex: 1, fontSize: 13, color: i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.maskedId}
              </span>
              <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
            </div>
          ))}
          {lb.length === 0 && <div style={{ textAlign: 'center', color: '#3f3f46', paddingTop: 60, fontSize: 13 }}>No data</div>}
        </div>

        <div style={{ width: '100%', maxWidth: 400, padding: '20px 24px 32px', flexShrink: 0 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', margin: '0 0 14px', letterSpacing: '0.02em' }}>
            Can you break into the top 3?
          </p>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '14px 0', background: '#071be9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
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
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#a1a1aa' : i === 2 ? '#71717a' : '#3f3f46';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#a1a1aa' : '#52525b';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '28px 24px 16px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Your Result</h2>
          {myEntry ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>Rank</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#6085FF', letterSpacing: '-0.03em' }}>#{myEntry.rank}</span>
              <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{myEntry.score}%</span>
              <span style={{ fontSize: 12, color: '#52525b' }}>{myEntry.correctCount}/{myEntry.totalCount}</span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{correctCount} / {QUESTIONS.length}</span>
              <span style={{ fontSize: 14, color: '#a1a1aa' }}>{Math.round((correctCount / QUESTIONS.length) * 100)}%</span>
            </div>
          )}
        </div>

        <div style={{ width: '100%', maxWidth: 400, padding: '4px 24px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#27272a', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
            — {lb.length} students —
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 400, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => {
            const isMe = entry.maskedId === myMasked;
            return (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 8px', borderRadius: isMe ? 8 : 0, marginBottom: isMe ? 2 : 0, borderBottom: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)', gap: 12, background: isMe ? 'rgba(96,133,255,0.1)' : 'transparent', border: isMe ? '1px solid rgba(96,133,255,0.25)' : undefined }}>
                <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: isMe ? '#6085FF' : rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? '#c7d2fe' : i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.maskedId}{isMe && <span style={{ fontSize: 10, color: '#6085FF', marginLeft: 6 }}>← you</span>}
                </span>
                <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#6085FF' : scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: '100%', maxWidth: 400, padding: '16px 24px 28px', flexShrink: 0 }}>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '13px 0', background: 'transparent', color: '#52525b', border: '1px solid #27272a', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  /* ── Test ── */
  const currentQuestion = QUESTIONS[currentIndex] ?? null;
  const isRevealed = currentQuestion ? !!revealed[currentQuestion.id] : false;
  const userAnswer = currentQuestion ? (answers[currentQuestion.id] ?? '') : '';
  const isCorrect = isRevealed && checkAnswer(userAnswer, currentQuestion?.answers ?? []);
  const isWrong = isRevealed && !!userAnswer && !checkAnswer(userAnswer, currentQuestion?.answers ?? []);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === QUESTIONS.length - 1;
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
  const totalCorrect = QUESTIONS.filter(q => checkAnswer(answers[q.id] ?? '', q.answers)).length;

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Test header */}
      <div style={{ height: 52, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>8월 SAT MATH 실전연습1</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / 30 &nbsp;({totalCorrect} correct)</span>
          <button onClick={handleSubmit} disabled={submitting || submitted || answeredCount < 1}
            style={{ padding: '6px 14px', background: submitted ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitted || submitting || answeredCount < 1 ? 'default' : 'pointer', opacity: answeredCount < 1 ? 0.4 : 1 }}>
            {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit Results'}
          </button>
        </div>
      </div>

      {/* Question number navigator */}
      <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0, padding: '8px 16px' }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
          {QUESTIONS.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button key={q.id} onClick={() => setCurrentIndex(idx)}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: isCurrent ? '2px solid #1e293b' : '1px solid #e5e7eb',
                  background: isCurrent ? '#1e293b' : isAnswered ? '#3b82f6' : '#fff',
                  color: isCurrent ? '#fff' : isAnswered ? '#fff' : '#94a3b8',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question area */}
      {currentQuestion && (
        <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
          {currentQuestion.passage && currentQuestion.passage.trim() ? (
            <>
              <div className="test-passage-panel">
                <div style={{ padding: '24px 28px 24px 24px' }}>
                  <div className="test-passage-content">
                    <ContentRenderer content={currentQuestion.passage} />
                  </div>
                </div>
              </div>
              <div className="test-resizer" />
            </>
          ) : null}

          <div className="test-question-panel" style={currentQuestion.passage && currentQuestion.passage.trim() ? {} : { flex: 1 }}>
            <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto' }}>
              {/* Question meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {currentIndex + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: DIFF_COLOR[currentQuestion.difficulty] ?? '#64748b' }}>
                  {currentQuestion.difficulty}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{currentQuestion.skill}</span>
              </div>

              {/* Question text */}
              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                <ContentRenderer content={currentQuestion.question} />
              </div>

              {/* SPR input */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Enter answer (e.g. 2/3 or 0.667)"
                  disabled={isRevealed}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e5e7eb'}`,
                    background: isCorrect ? '#f0fdf4' : isWrong ? '#fef2f2' : '#f8fafc',
                    color: '#1e293b', fontSize: 15, outline: 'none',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && userAnswer && !isRevealed) handleReveal(currentQuestion.id); }}
                />
                {!isRevealed && userAnswer && (
                  <button onClick={() => handleReveal(currentQuestion.id)}
                    style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e293b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Check
                  </button>
                )}
              </div>

              {/* Feedback */}
              {isRevealed && (
                <div style={{ padding: '14px 16px', background: isCorrect ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect ? '#86efac' : '#fca5a5'}`, borderRadius: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? '#15803d' : '#dc2626', marginBottom: isWrong ? 4 : 0 }}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                  {isWrong && (
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                      Answer: <strong>{currentQuestion.answers[0]}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="bluebook-footer" style={{ flexShrink: 0 }}>
        <button onClick={() => !isFirst && setCurrentIndex(i => i - 1)} disabled={isFirst}
          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, color: '#374151' }}>
          Back
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{currentIndex + 1} / {QUESTIONS.length}</span>
        <button className="bluebook-next-btn btn-press" onClick={() => !isLast && setCurrentIndex(i => i + 1)} disabled={isLast}
          style={{ opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}>
          Next
        </button>
      </div>
    </div>
  );
}
