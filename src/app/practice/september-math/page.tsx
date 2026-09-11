'use client';

import { useState, useCallback } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';
import { TestCalculator } from '@/app/diagnosis/components/TestCalculator';

const TEST_ID = 'september-math-final-14';
const TEST_LABEL = '9월 SAT MATH 파이널 연습';
const TEST_DESC = '혼합형 14문항 (객관식 + 주관식)';

type QuestionType = 'spr' | 'mcq';

interface MCQOption {
  label: string;
  text: string;
}

interface Question {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  type: QuestionType;
  answers?: string[];
  options?: MCQOption[];
  correctOption?: string;
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

const WIND_CHILL_TABLE = `<table style="border-collapse:collapse;width:100%;font-size:14px;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Air temperature</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Wind chill at 20 mph</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Wind chill at 60 mph</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">27°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">13°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">6°F</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">30°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">17°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">10°F</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">33°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">21°F</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">15°F</td></tr>
  </tbody>
</table>`;

const IGNEOUS_TABLE = `<table style="border-collapse:collapse;width:100%;font-size:14px;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;" rowspan="2">Texture</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;" colspan="3">Mineral composition</th>
    </tr>
    <tr style="background:#f1f5f9;">
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Granitic</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Andesitic</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Basaltic</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:600;">Coarse-grained</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">32</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">22</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">42</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:600;">Fine-grained</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">19</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">16</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">31</td></tr>
  </tbody>
</table>`;

const HISTOGRAM_DESC = `<p style="font-size:13px;color:#475569;margin-bottom:8px;">Distribution of points scored per game (last 50 games):</p>
<table style="border-collapse:collapse;font-size:13px;">
  <thead><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1;padding:6px 12px;">Points range</th><th style="border:1px solid #cbd5e1;padding:6px 12px;">Frequency</th></tr></thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 12px;">30–40</td><td style="border:1px solid #cbd5e1;padding:6px 12px;">2</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 12px;">40–50</td><td style="border:1px solid #cbd5e1;padding:6px 12px;">7</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 12px;">50–60</td><td style="border:1px solid #cbd5e1;padding:6px 12px;">26</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 12px;">60–70</td><td style="border:1px solid #cbd5e1;padding:6px 12px;">15</td></tr>
  </tbody>
</table>`;

const QUESTIONS: Question[] = [
  {
    id: 'sep-math-01',
    skill: 'Data tables',
    difficulty: 'Easy',
    passage: WIND_CHILL_TABLE,
    question: '<p>According to the table, what is the wind chill temperature, in degrees Fahrenheit (°F), when the air temperature is 27°F and the wind speed is 20 miles per hour (mph)? (Disregard the degree symbol when entering your answer.)</p>',
    type: 'spr',
    answers: ['13'],
  },
  {
    id: 'sep-math-02',
    skill: 'Right triangles and trigonometry',
    difficulty: 'Medium',
    passage: '',
    question: '<p>For two acute angles \\(X\\) and \\(Y\\), the measure of angle \\(Y\\) is \\(32^\\circ\\) and \\(\\dfrac{\\sin X}{\\cos Y} = 1\\). What is the measure, in degrees, of angle \\(X\\)?</p>',
    type: 'spr',
    answers: ['58'],
  },
  {
    id: 'sep-math-03',
    skill: 'Percentages',
    difficulty: 'Hard',
    passage: '',
    question: '<p>The positive number \\(a\\) is \\(290\\%\\) of the number \\(b\\), and \\(a\\) is \\(90\\%\\) of the number \\(c\\). If \\(c\\) is \\(p\\%\\) of \\(b\\), which of the following is closest to the value of \\(p\\)?</p>',
    type: 'spr',
    answers: ['322', '322.2'],
  },
  {
    id: 'sep-math-04',
    skill: 'Exponential functions',
    difficulty: 'Hard',
    passage: '',
    question: '<p>A computer program models the total mass of the population of a certain type of algae after the algae was placed in an environment where it has no natural predators. According to the model, the estimated total mass of this population of algae at the end of every 6-hour period is 129% greater than the estimated total mass at the end of the previous 6-hour period, and the estimated total mass is 613.90 grams after 18 hours. Which equation best represents this model, where \\(A\\) is the estimated total mass, in grams, after \\(x\\) hours, and \\(x &lt; 50\\)?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(A = 34.11(1.29)^{x/6}\\)' },
      { label: 'B', text: '\\(A = 34.11(2.29)^{x/6}\\)' },
      { label: 'C', text: '\\(A = 51.12(2.29)^{x/6}\\)' },
      { label: 'D', text: '\\(A = 285.98(1.29)^{x/6}\\)' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-math-05',
    skill: 'Area and volume',
    difficulty: 'Hard',
    passage: '',
    question: '<p>A right rectangular pyramid has a rectangular base with a length of 18 units and a width of 10 units. The height of the pyramid is 12 units. What is the total surface area, in square units, of the pyramid?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: '384' },
      { label: 'B', text: '516' },
      { label: 'C', text: '564' },
      { label: 'D', text: '580' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-math-06',
    skill: 'Linear functions',
    difficulty: 'Easy',
    passage: '',
    question: '<p>A model estimates that the population of a state was 4 million in 1980 and increased by 0.041 million each year until 2007. According to the model, what was the estimated population of this state, in millions, 10 years after 1980?</p>',
    type: 'spr',
    answers: ['4.41'],
  },
  {
    id: 'sep-math-07',
    skill: 'Two-variable data: Models and scatterplots',
    difficulty: 'Easy',
    passage: IGNEOUS_TABLE,
    question: '<p>The table shows the distribution of the 162 igneous rocks in a certain earth science laboratory by mineral composition and texture. What fraction of the laboratory\'s granitic rocks are coarse-grained?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(\\dfrac{32}{51}\\)' },
      { label: 'B', text: '\\(\\dfrac{32}{96}\\)' },
      { label: 'C', text: '\\(\\dfrac{32}{162}\\)' },
      { label: 'D', text: '\\(\\dfrac{96}{162}\\)' },
    ],
    correctOption: 'A',
  },
  {
    id: 'sep-math-08',
    skill: 'Area and volume',
    difficulty: 'Hard',
    passage: '',
    question: '<p>A hollow steel pipe is in the shape of a right circular cylinder. The steel pipe has an outside diameter of 72 inches, a wall thickness of \\(\\dfrac{5}{8}\\) inch, and a height of 138 inches. Which of the following is closest to the volume, in cubic inches, of the wall of this steel pipe?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: '169' },
      { label: 'B', text: '542' },
      { label: 'C', text: '3,105' },
      { label: 'D', text: '19,340' },
    ],
    correctOption: 'D',
  },
  {
    id: 'sep-math-09',
    skill: 'Nonlinear functions',
    difficulty: 'Easy',
    passage: '',
    question: '<p>The function \\(f(x) = 9{,}000(1.026)^x\\) gives the value, in dollars, of a certain certificate of deposit (CD) \\(x\\) years after the investment was initially made, where \\(x \\le 5\\). Which of the following is the best interpretation of the statement "\\(f(2)\\) is approximately equal to \\(9{,}474.08\\)" in this context?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: 'The value of the CD would be approximately $9,474.08 if invested at 2% interest.' },
      { label: 'B', text: '$9,474.08 days after the investment was made, the value of the CD was approximately 2 times greater than its initial value.' },
      { label: 'C', text: '2 years after the investment was made, the value of the CD was approximately $9,474.08.' },
      { label: 'D', text: '2 years after the investment was made, the value of the CD was approximately $9,474.08 greater than its initial value.' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-math-10',
    skill: 'Nonlinear equations in one variable',
    difficulty: 'Medium',
    passage: '',
    question: '<p>A rectangular pool is surrounded by a concrete path that is \\(x\\) feet wide on all sides. The pool is 21 ft long and 11 ft wide. The area of the concrete path is 144 ft². What is the value of \\(x\\)?</p>',
    type: 'spr',
    answers: ['2'],
  },
  {
    id: 'sep-math-11',
    skill: 'One-variable data: Distributions and measures of center and spread',
    difficulty: 'Hard',
    passage: HISTOGRAM_DESC,
    question: `<p>The histogram summarizes the distribution of an original data set representing the number of points per game a basketball team has scored in the last 50 games played. If the team scores 18 points in the next game and this game is added to the original data set to create a new data set of 51 values, which of the following <strong>must</strong> be true?</p>
<p style="margin-top:12px;"><strong>I.</strong> The median number of points per game for the new data set is less than the median for the original data set.<br/>
<strong>II.</strong> The mean number of points per game for the new data set is less than the mean for the original data set.</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'I only' },
      { label: 'B', text: 'II only' },
      { label: 'C', text: 'I and II' },
      { label: 'D', text: 'Neither I nor II' },
    ],
    correctOption: 'B',
  },
  {
    id: 'sep-math-12',
    skill: 'Area and volume',
    difficulty: 'Hard',
    passage: '',
    question: '<p>Right rectangular prism X is similar to right rectangular prism Y. The surface area of right rectangular prism X is 50 square centimeters (cm²), and the surface area of right rectangular prism Y is 1,250 cm². The volume of right rectangular prism X is 14.4 cubic centimeters (cm³). What is the volume, in cm³, of right rectangular prism Y?</p>',
    type: 'spr',
    answers: ['1800', '1,800'],
  },
  {
    id: 'sep-math-13',
    skill: 'One-variable data: Distributions and measures of center and spread',
    difficulty: 'Medium',
    passage: '',
    question: '<p>Which of the following data sets has the largest standard deviation, where \\(p\\) is a constant?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(p-10,\\ p-5,\\ p,\\ p-2,\\ p+2\\)' },
      { label: 'B', text: '\\(p-5,\\ p-5,\\ p,\\ p,\\ p-2\\)' },
      { label: 'C', text: '\\(p-2,\\ p+2,\\ p,\\ p,\\ p-12\\)' },
      { label: 'D', text: '\\(p,\\ p,\\ p,\\ p,\\ p\\)' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-math-14',
    skill: 'Inference from sample statistics and margin of error',
    difficulty: 'Medium',
    passage: '',
    question: '<p>A community organization surveyed a random sample of residents to estimate the percentage of residents who visit their local library at least once per month. The organization estimates that 19% of residents visit the library at least once per month, with an associated margin of error of 3.7%. The organization repeated the survey with a random sample that was double the original sample size. Which of the following is true about the margin of error associated with the estimate from the larger sample?</p>',
    type: 'mcq',
    options: [
      { label: 'A', text: 'The margin of error is less than 3.7%.' },
      { label: 'B', text: 'The margin of error is 7.4%.' },
      { label: 'C', text: 'The margin of error is greater than 19%.' },
      { label: 'D', text: 'The margin of error is 38%.' },
    ],
    correctOption: 'A',
  },
];

function normalizeAnswer(s: string): string {
  return s.trim().replace(/,/g, '').replace(/\s+/g, '').toLowerCase();
}

function parseNumeric(s: string): number | null {
  const t = normalizeAnswer(s);
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

function checkSPR(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (accepted.some(a => normalizeAnswer(a) === norm)) return true;
  const inputNum = parseNumeric(input);
  if (inputNum === null) return false;
  return accepted.some(a => {
    const n = parseNumeric(a);
    return n !== null && Math.abs(inputNum - n) < 0.001;
  });
}

function checkAnswer(q: Question, input: string): boolean {
  if (q.type === 'mcq') return input.trim().toUpperCase() === q.correctOption;
  return checkSPR(input, q.answers ?? []);
}

export default function SeptemberMathPage() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [accessCode, setAccessCode] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const toggleCrossOut = useCallback((qId: string, label: string) => {
    setCrossedOut(prev => {
      const set = new Set(prev[qId] ?? []);
      set.has(label) ? set.delete(label) : set.add(label);
      return { ...prev, [qId]: set };
    });
  }, []);

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

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
    if (answeredCount < 1) { showToast('Solve at least 1 question before submitting.'); return; }

    setSubmitting(true);
    const correct = QUESTIONS.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;
    setCorrectCount(correct);

    const questionResults = Object.fromEntries(
      QUESTIONS.map(q => [q.id, checkAnswer(q, answers[q.id] ?? '')])
    );

    try {
      await fetch('/api/practice/september-math/submit', {
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{TEST_LABEL}</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>{TEST_DESC}</p>
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
          <p style={{ fontSize: 13, color: '#52525b', margin: '0 0 4px' }}>{TEST_LABEL}</p>
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
  const userAnswer = currentQuestion ? (answers[currentQuestion.id] ?? '') : '';
  const isRevealed = submitted;
  const isCorrect = isRevealed && checkAnswer(currentQuestion!, userAnswer);
  const isWrong = isRevealed && !!userAnswer && !checkAnswer(currentQuestion!, userAnswer);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === QUESTIONS.length - 1;
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;

  const correctAnswerDisplay = currentQuestion?.type === 'mcq'
    ? `(${currentQuestion.correctOption}) ${currentQuestion.options?.find(o => o.label === currentQuestion.correctOption)?.text ?? ''}`
    : (currentQuestion?.answers?.[0] ?? '');

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Desmos Calculator */}
      <TestCalculator isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

      {/* Test header — 진단테스트 스타일 */}
      <div style={{ height: 52, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{TEST_LABEL}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / {QUESTIONS.length}</span>
          {/* Calculator button */}
          <button
            onClick={() => setCalculatorOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: calculatorOpen ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
            </svg>
            Calculator
          </button>
          <button onClick={handleSubmit} disabled={submitting || submitted || answeredCount < 1}
            style={{ padding: '6px 14px', background: submitted ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitted || submitting || answeredCount < 1 ? 'default' : 'pointer', opacity: answeredCount < 1 ? 0.4 : 1 }}>
            {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit Results'}
          </button>
        </div>
      </div>

      {/* Question number navigator — test-nav-dot 클래스 */}
      <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0, padding: '8px 16px' }}>
        <div className="test-nav-grid" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {QUESTIONS.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`test-nav-dot ${isCurrent ? 'current' : isAnswered ? 'answered' : ''}`}
              >
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
              {/* 문제 번호 + 난이도 — 진단테스트 스타일 (32×32, r8) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span
                  className="inline-flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}
                >
                  {currentIndex + 1}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: DIFF_COLOR[currentQuestion.difficulty] ?? '#64748b' }}>
                  {currentQuestion.difficulty}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{currentQuestion.skill}</span>
                <span style={{ fontSize: 10, color: '#cbd5e1', marginLeft: 'auto', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                  {currentQuestion.type === 'mcq' ? 'MCQ' : 'Free Response'}
                </span>
              </div>

              {/* Question text */}
              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                <ContentRenderer content={currentQuestion.question} />
              </div>

              {/* MCQ options — bluebook-option 클래스 + 크로스아웃 */}
              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="space-y-3" style={{ marginBottom: 16 }}>
                  {currentQuestion.options.map(opt => {
                    const isSelected = userAnswer === opt.label;
                    const isCrossed = crossedOut[currentQuestion.id]?.has(opt.label);
                    const isThisCorrect = isRevealed && opt.label === currentQuestion.correctOption;
                    const isThisWrong = isRevealed && isSelected && opt.label !== currentQuestion.correctOption;
                    return (
                      <div key={opt.label} className="flex items-center gap-2">
                        {/* 크로스아웃 토글 — 정답 확인 전만 표시 */}
                        {!isRevealed && (
                          <button
                            type="button"
                            onClick={() => toggleCrossOut(currentQuestion.id, opt.label)}
                            className={`bluebook-option-crossout btn-press ${isCrossed ? 'active' : ''}`}
                            title="Cross out"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => !isRevealed && handleAnswer(currentQuestion.id, opt.label)}
                          className={`bluebook-option btn-press ${isSelected && !isRevealed ? 'selected' : ''} ${isCrossed && !isSelected ? 'crossedout' : ''}`}
                          style={
                            isThisCorrect ? { borderColor: '#22c55e', background: '#f0fdf4' } :
                            isThisWrong ? { borderColor: '#ef4444', background: '#fef2f2' } : {}
                          }
                        >
                          <span
                            className="bluebook-option-label"
                            style={
                              isThisCorrect ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' } :
                              isThisWrong ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}
                            }
                          >
                            {opt.label}
                          </span>
                          <span className="bluebook-option-text">
                            <ContentRenderer content={opt.text} />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SPR input */}
              {currentQuestion.type === 'spr' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Enter answer"
                    disabled={submitted}
                    className="toss-input"
                    style={{
                      flex: 1,
                      border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e5e7eb'}`,
                      background: isCorrect ? '#f0fdf4' : isWrong ? '#fef2f2' : undefined,
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && userAnswer && !submitted) handleAnswer(currentQuestion.id, userAnswer); }}
                  />
                </div>
              )}

              {/* Feedback */}
              {isRevealed && (
                <div style={{ padding: '14px 16px', background: isCorrect ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect ? '#86efac' : '#fca5a5'}`, borderRadius: 10, marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? '#15803d' : '#dc2626', marginBottom: isWrong ? 4 : 0 }}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                  {isWrong && (
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                      Answer: <strong>{correctAnswerDisplay}</strong>
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
        <button
          onClick={() => !isFirst && setCurrentIndex(i => i - 1)}
          disabled={isFirst}
          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, color: '#374151' }}
        >
          Back
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{currentIndex + 1} / {QUESTIONS.length}</span>
        {isLast && answeredCount === QUESTIONS.length && !submitted ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Results'}
          </button>
        ) : (
          <button
            className="bluebook-next-btn btn-press"
            onClick={() => !isLast && setCurrentIndex(i => i + 1)}
            disabled={isLast}
            style={{ opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
