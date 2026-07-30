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

type Phase = 'gate' | 'test' | 'result';

const DIFF_COLOR: Record<string, string> = {
  Hard: '#ef4444', Medium: '#f59e0b', Easy: '#22c55e',
};

const QUESTIONS: Question[] = [
  { id: "c21541d3-dba0-4b15-bf5f-4aed961a51e2", skill: "Linear equations in two variables", difficulty: "Easy", passage: "", question: "<p>Line <em>m</em> is defined by \\(y = \\frac{2}{3}x - 5\\). Line <em>n</em> is parallel to line <em>m</em> in the \\(xy\\)-plane. What is the slope of line <em>n</em>?</p>", answers: ["2/3", "0.666", "0.667", ".6666", ".6667"] },
  { id: "c5e77618-8fa5-432d-bf63-a4273272b8d4", skill: "Nonlinear functions", difficulty: "Easy", passage: "", question: "<p>The function <em>g</em> is defined by <em>g</em>(<em>x</em>) = <span style=\"white-space:nowrap\"><sup>12</sup>&frasl;<sub>4<em>x</em> + 3</sub></span>. What is the value of <em>g</em>(3)?</p>", answers: [".8", ".80", "0.8", "0.80", "4/5"] },
  { id: "45bcf229-be28-4a55-9b65-db6bd6b2d869", skill: "Linear equations in one variable", difficulty: "Easy", passage: "", question: "<p style=\"text-align: center;\">\\(x + 5.3 = 6.0\\)</p><p>What value of \\(x\\) is the solution to the given equation?</p>", answers: [".7", ".70", ".700", "0.7", "0.70", "0.700", "7/10"] },
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

function checkAnswer(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input);
  return accepted.some(a => normalizeAnswer(a) === norm);
}

export default function AugustMathPage() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [accessCode, setAccessCode] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
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
      setPhase('test');
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
            <button type="submit" disabled={validating}
              style={{ padding: '13px 16px', borderRadius: 8, border: 'none', background: validating ? '#94a3b8' : '#3b82f6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: validating ? 'not-allowed' : 'pointer' }}>
              {validating ? 'Checking...' : 'Start'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (phase === 'result') {
    const total = QUESTIONS.length;
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#f8fafc', padding: '40px 16px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 14, padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Results</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{correctCount}<span style={{ fontSize: 28, color: '#94a3b8' }}>/{total}</span></div>
          <div style={{ fontSize: 18, color: '#64748b', marginTop: 8, marginBottom: 32 }}>{pct}% correct</div>
          <p style={{ fontSize: 14, color: '#64748b' }}>답안이 저장되었습니다.</p>
        </div>
      </div>
    );
  }

  /* ── Test ── */
  const answeredCount = Object.keys(answers).length;
  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 56, zIndex: 10, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>8월 SAT MATH 실전연습1</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 12 }}>{answeredCount} / {QUESTIONS.length} answered</span>
        </div>
        <button onClick={handleSubmit} disabled={submitting || submitted}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: submitted ? '#94a3b8' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting || submitted ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit'}
        </button>
      </div>

      {/* Questions */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {QUESTIONS.map((q, idx) => {
          const userAnswer = answers[q.id] ?? '';
          const isRevealed = revealed[q.id];
          const isCorrect = isRevealed && checkAnswer(userAnswer, q.answers);
          const isWrong = isRevealed && userAnswer && !checkAnswer(userAnswer, q.answers);

          return (
            <div key={q.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: DIFF_COLOR[q.difficulty] ?? '#64748b', background: `${DIFF_COLOR[q.difficulty]}15`, padding: '2px 8px', borderRadius: 4 }}>{q.difficulty}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{q.skill}</span>
              </div>

              {/* Passage */}
              {q.passage && q.passage.trim() && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px', marginBottom: 14, fontSize: 14, lineHeight: 1.7, color: '#374151', borderLeft: '3px solid #e5e7eb' }}>
                  <ContentRenderer content={q.passage} />
                </div>
              )}

              {/* Question */}
              <div style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.7, marginBottom: 18, fontWeight: 500 }}>
                <ContentRenderer content={q.question} />
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={e => handleAnswer(q.id, e.target.value)}
                  placeholder="Enter answer (e.g. 2/3 or 0.667)"
                  disabled={isRevealed}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e5e7eb'}`,
                    background: isCorrect ? '#f0fdf4' : isWrong ? '#fef2f2' : '#f8fafc',
                    color: '#1e293b', fontSize: 15, outline: 'none',
                  }}
                />
                {!isRevealed && userAnswer && (
                  <button onClick={() => handleReveal(q.id)}
                    style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Check
                  </button>
                )}
              </div>

              {/* Feedback */}
              {isRevealed && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: isCorrect ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect ? '#86efac' : '#fca5a5'}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                    {isCorrect ? '✓ Correct' : `✗ Incorrect — Answer: ${q.answers[0]}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
