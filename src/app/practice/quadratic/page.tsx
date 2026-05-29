'use client';

import { useState } from 'react';

interface Question {
  id: number;
  section: string;
  question: string;
  answer: string;
  steps: string[];
}

const QUESTIONS: Question[] = [
  // ── Part 1: Factoring ─────────────────────────────
  { id: 1, section: 'Part 1 · Factoring', question: 'Solve by factoring:  x² − 5x + 6 = 0', answer: 'x = 2  or  x = 3', steps: ['Find two numbers with sum −5 and product 6 → (−2) and (−3)', 'Factor: (x − 2)(x − 3) = 0', 'x − 2 = 0  →  x = 2', 'x − 3 = 0  →  x = 3'] },
  { id: 2, section: 'Part 1 · Factoring', question: 'Solve by factoring:  2x² + 7x + 3 = 0', answer: 'x = −1/2  or  x = −3', steps: ['ac = 6; find two numbers with sum 7 → 1 and 6', 'Rewrite: 2x² + x + 6x + 3 = 0', 'Group: x(2x + 1) + 3(2x + 1) = 0', '(2x + 1)(x + 3) = 0  →  x = −1/2 or x = −3'] },
  { id: 3, section: 'Part 1 · Factoring', question: 'Solve by factoring:  x² − 4 = 0', answer: 'x = 2  or  x = −2', steps: ['Difference of squares: x² − 2² = (x + 2)(x − 2) = 0', 'x = 2  or  x = −2'] },
  { id: 4, section: 'Part 1 · Factoring', question: 'Solve by factoring:  3x² − 2x − 1 = 0', answer: 'x = 1  or  x = −1/3', steps: ['ac = −3; find two numbers with sum −2 → −3 and 1', 'Rewrite: 3x² − 3x + x − 1 = 0', 'Group: 3x(x − 1) + 1(x − 1) = 0', '(3x + 1)(x − 1) = 0  →  x = −1/3 or x = 1'] },
  { id: 5, section: 'Part 1 · Factoring', question: 'Solve and classify the root(s):  4x² − 12x + 9 = 0', answer: 'x = 3/2  (repeated root)', steps: ['Recognize perfect square: (2x)² − 2·(2x)·3 + 3² = (2x − 3)²', '(2x − 3)² = 0  →  x = 3/2', 'Discriminant check: D = 144 − 144 = 0  →  repeated root ✓'] },

  // ── Part 2: Completing the Square ─────────────────
  { id: 6, section: 'Part 2 · Completing the Square', question: 'Solve by completing the square:  x² − 6x + 3 = 0', answer: 'x = 3 ± √6', steps: ['Move constant: x² − 6x = −3', 'Add (6/2)² = 9 to both sides: x² − 6x + 9 = 6', '(x − 3)² = 6  →  x = 3 ± √6'] },
  { id: 7, section: 'Part 2 · Completing the Square', question: 'Solve by completing the square:  x² + 4x − 1 = 0', answer: 'x = −2 ± √5', steps: ['Move constant: x² + 4x = 1', 'Add (4/2)² = 4 to both sides: x² + 4x + 4 = 5', '(x + 2)² = 5  →  x = −2 ± √5'] },
  { id: 8, section: 'Part 2 · Completing the Square', question: 'Solve by completing the square:  2x² − 8x + 3 = 0', answer: 'x = 2 ± (√10)/2', steps: ['Divide by 2: x² − 4x + 3/2 = 0', 'Move constant: x² − 4x = −3/2', 'Add (4/2)² = 4: (x − 2)² = 5/2', 'x = 2 ± √(5/2) = 2 ± (√10)/2'] },
  { id: 9, section: 'Part 2 · Completing the Square', question: 'Solve by completing the square:  x² − 3x + 1 = 0', answer: 'x = (3 ± √5) / 2', steps: ['Move constant: x² − 3x = −1', 'Add (3/2)² = 9/4: (x − 3/2)² = 5/4', 'x = 3/2 ± (√5)/2 = (3 ± √5)/2'] },
  { id: 10, section: 'Part 2 · Completing the Square', question: 'Solve by completing the square:  3x² + 6x − 2 = 0', answer: 'x = −1 ± (√15)/3', steps: ['Divide by 3: x² + 2x − 2/3 = 0', 'Move constant: x² + 2x = 2/3', 'Add (2/2)² = 1: (x + 1)² = 5/3', 'x = −1 ± √(5/3) = −1 ± (√15)/3'] },

  // ── Part 3: Quadratic Formula ──────────────────────
  { id: 11, section: 'Part 3 · Quadratic Formula', question: 'Use the quadratic formula to solve:  x² − 5x + 3 = 0', answer: 'x = (5 ± √13) / 2', steps: ['a = 1, b = −5, c = 3', 'D = 25 − 12 = 13', 'x = (5 ± √13) / 2'] },
  { id: 12, section: 'Part 3 · Quadratic Formula', question: 'Use the quadratic formula to solve:  2x² + 3x − 1 = 0', answer: 'x = (−3 ± √17) / 4', steps: ['a = 2, b = 3, c = −1', 'D = 9 + 8 = 17', 'x = (−3 ± √17) / 4'] },
  { id: 13, section: 'Part 3 · Quadratic Formula', question: 'Use the quadratic formula to solve:  x² + 3x − 1 = 0', answer: 'x = (−3 ± √13) / 2', steps: ['a = 1, b = 3, c = −1', 'D = 9 + 4 = 13', 'x = (−3 ± √13) / 2'] },
  { id: 14, section: 'Part 3 · Quadratic Formula', question: 'Use the quadratic formula to solve:  x² + √2 · x − 1 = 0', answer: 'x = (−√2 ± √6) / 2', steps: ['a = 1, b = √2, c = −1', 'D = 2 + 4 = 6', 'x = (−√2 ± √6) / 2'] },
  { id: 15, section: 'Part 3 · Quadratic Formula', question: 'Use the quadratic formula to solve:  2x² − 7x + 4 = 0', answer: 'x = (7 ± √17) / 4', steps: ['a = 2, b = −7, c = 4', 'D = 49 − 32 = 17', 'x = (7 ± √17) / 4'] },

  // ── Part 4: Even-coefficient Formula ──────────────
  { id: 16, section: 'Part 4 · Even-Coefficient Formula', question: "When b = 2b', the formula simplifies to  x = (−b' ± √(b'² − ac)) / a.\n\nUse this to solve:  x² − 4x + 2 = 0", answer: 'x = 2 ± √2', steps: ["b = −4 = 2·(−2)  →  b' = −2", "D' = (−2)² − 1·2 = 2", 'x = (2 ± √2) / 1 = 2 ± √2'] },
  { id: 17, section: 'Part 4 · Even-Coefficient Formula', question: "Use the even-coefficient formula to solve:  2x² − 6x + 1 = 0", answer: 'x = (3 ± √7) / 2', steps: ["b = −6 = 2·(−3)  →  b' = −3", "D' = 9 − 2 = 7", 'x = (3 ± √7) / 2'] },
  { id: 18, section: 'Part 4 · Even-Coefficient Formula', question: "Use the even-coefficient formula to solve:  x² + 6x − 2 = 0", answer: 'x = −3 ± √11', steps: ["b = 6 = 2·3  →  b' = 3", "D' = 9 + 2 = 11", 'x = −3 ± √11'] },
  { id: 19, section: 'Part 4 · Even-Coefficient Formula', question: "Use the even-coefficient formula to solve:  3x² + 4x − 1 = 0", answer: 'x = (−2 ± √7) / 3', steps: ["b = 4 = 2·2  →  b' = 2", "D' = 4 + 3 = 7", 'x = (−2 ± √7) / 3'] },
  { id: 20, section: 'Part 4 · Even-Coefficient Formula', question: "Use the even-coefficient formula to solve:  x² − 10x + 7 = 0", answer: 'x = 5 ± 3√2', steps: ["b = −10 = 2·(−5)  →  b' = −5", "D' = 25 − 7 = 18", 'x = 5 ± √18 = 5 ± 3√2'] },

  // ── Part 5: Discriminant ───────────────────────────
  { id: 21, section: 'Part 5 · Discriminant', question: 'For what values of k does  x² − 3x + k = 0  have two distinct real roots?', answer: 'k < 9/4', steps: ['Two distinct real roots  ↔  D > 0', 'D = 9 − 4k > 0', 'k < 9/4'] },
  { id: 22, section: 'Part 5 · Discriminant', question: 'Find k so that  2x² − 4x + k = 0  has a repeated root.', answer: 'k = 2', steps: ['Repeated root  ↔  D = 0', 'D = 16 − 8k = 0', 'k = 2'] },
  { id: 23, section: 'Part 5 · Discriminant', question: 'Find all values of k for which  x² − 2kx + k + 2 = 0  has real roots.', answer: 'k ≤ −1  or  k ≥ 2', steps: ['Real roots  ↔  D ≥ 0', 'D = 4k² − 4(k + 2) = 4(k² − k − 2) ≥ 0', '(k − 2)(k + 1) ≥ 0', 'k ≤ −1  or  k ≥ 2'] },
  { id: 24, section: 'Part 5 · Discriminant', question: 'For what values of k does  kx² − 2x + k = 0  have two distinct real roots?  (k ≠ 0)', answer: '−1 < k < 0  or  0 < k < 1', steps: ['Two distinct real roots  ↔  D > 0', 'D = 4 − 4k² > 0  →  k² < 1  →  −1 < k < 1', 'Exclude k = 0 (would not be quadratic)', '−1 < k < 0  or  0 < k < 1'] },
  { id: 25, section: 'Part 5 · Discriminant', question: 'For what values of k does  x² + (k − 1)x + 1 = 0  have non-real (complex) roots?', answer: '−1 < k < 3', steps: ['Non-real roots  ↔  D < 0', 'D = (k − 1)² − 4 < 0', '(k − 3)(k + 1) < 0', '−1 < k < 3'] },

  // ── Part 6: Vieta's Formulas ───────────────────────
  { id: 26, section: "Part 6 · Vieta's Formulas", question: 'Let α and β be the roots of  x² − 3x + 1 = 0.\n\nFind  α² + β².', answer: '7', steps: ["By Vieta's: α + β = 3,  αβ = 1", 'α² + β² = (α + β)² − 2αβ = 9 − 2 = 7'] },
  { id: 27, section: "Part 6 · Vieta's Formulas", question: 'Let α and β be the roots of  2x² − 5x + 1 = 0.\n\nFind  1/α + 1/β.', answer: '5', steps: ["By Vieta's: α + β = 5/2,  αβ = 1/2", '1/α + 1/β = (α + β) / αβ = (5/2) / (1/2) = 5'] },
  { id: 28, section: "Part 6 · Vieta's Formulas", question: 'Let α and β be the roots of  x² + x − 3 = 0.\n\nFind  (α − β)².', answer: '13', steps: ["By Vieta's: α + β = −1,  αβ = −3", '(α − β)² = (α + β)² − 4αβ = 1 + 12 = 13'] },
  { id: 29, section: "Part 6 · Vieta's Formulas", question: 'Let α and β be the roots of  x² − 4x + 2 = 0.\n\nFind  α³ + β³.', answer: '40', steps: ["By Vieta's: α + β = 4,  αβ = 2", 'α³ + β³ = (α + β)[(α + β)² − 3αβ] = 4 · [16 − 6] = 40'] },
  { id: 30, section: "Part 6 · Vieta's Formulas", question: 'Write a monic quadratic equation whose roots are  3 − √5  and  3 + √5.', answer: 'x² − 6x + 4 = 0', steps: ['Sum of roots: (3 − √5) + (3 + √5) = 6', 'Product of roots: (3 − √5)(3 + √5) = 9 − 5 = 4', 'Equation: x² − (sum)x + (product) = 0  →  x² − 6x + 4 = 0'] },
];

type Phase = 'test' | 'submitted';

export default function QuadraticPage() {
  const [phase, setPhase] = useState<Phase>('test');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showNav, setShowNav] = useState(false);

  const q = QUESTIONS[current];
  const total = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const isLast = current === total - 1;

  function handleNav(idx: number) {
    setCurrent(idx);
    setShowNav(false);
  }

  if (phase === 'submitted') {
    return <ResultsScreen answers={answers} onRetry={() => { setAnswers({}); setCurrent(0); setPhase('test'); }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F4F5F9' }}>

      {/* Bluebook Header */}
      <div className="bluebook-header">
        <div className="bluebook-header-left">
          <span className="bluebook-section-title">Quadratic Equations</span>
        </div>
        <div className="bluebook-header-center" />
        <div className="bluebook-header-right" />
      </div>

      {/* Practice banner */}
      <div className="bluebook-banner">PRACTICE TEST</div>

      {/* Main question area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 24px' }}>

          {/* Question number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#1e293b', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {current + 1}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em' }}>
              {q.section}
            </span>
          </div>

          {/* Question text */}
          <p style={{
            fontSize: 17, fontWeight: 500, lineHeight: 1.75,
            color: '#191F28', marginBottom: 28, whiteSpace: 'pre-line',
          }}>
            {q.question}
          </p>

          {/* Answer input */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Answer
          </label>
          <input
            key={q.id}
            type="text"
            className="toss-input"
            placeholder="Type your answer here"
            value={answers[q.id] ?? ''}
            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            style={{ fontSize: 16 }}
          />

        </div>
      </div>

      {/* Question nav overlay */}
      {showNav && (
        <div className="bluebook-nav-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNav(false); }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Go to Question</span>
            <button onClick={() => setShowNav(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}>×</button>
          </div>
          <div className="test-nav-grid">
            {QUESTIONS.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleNav(idx)}
                className={`test-nav-dot${idx === current ? ' current' : answers[item.id] ? ' answered' : ''}`}
              >
                {item.id}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#9ca3af', display: 'flex', gap: 16 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#EFF6FF', border: '1px solid #3B82F6', marginRight: 5, verticalAlign: 'middle' }} />Answered</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#F4F5F9', border: '1px solid #d1d5db', marginRight: 5, verticalAlign: 'middle' }} />Unanswered</span>
          </div>
        </div>
      )}

      {/* Bluebook Footer */}
      <div className="bluebook-footer">
        <div style={{ minWidth: 80, fontSize: 12, color: '#9ca3af' }}>
          {answeredCount} / {total} answered
        </div>

        <button
          className="bluebook-footer-center btn-press"
          onClick={() => setShowNav(v => !v)}
        >
          Question {current + 1} of {total}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4 }}>
            <path d={showNav ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {current > 0 && (
            <button
              className="bluebook-next-btn btn-press"
              onClick={() => setCurrent(c => c - 1)}
              style={{ background: 'transparent', color: '#1e293b', border: '1.5px solid #d1d5db' }}
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              className="bluebook-next-btn btn-press"
              onClick={() => setCurrent(c => c + 1)}
            >
              Next
            </button>
          ) : (
            <button
              className="bluebook-next-btn btn-press"
              onClick={() => setPhase('submitted')}
              style={{ background: '#3B82F6' }}
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results screen ──────────────────────────────────────────────────────────

function ResultsScreen({ answers, onRetry }: { answers: Record<number, string>; onRetry: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F9' }}>

      {/* Header */}
      <div className="bluebook-header">
        <div className="bluebook-header-left">
          <span className="bluebook-section-title">Quadratic Equations — Results</span>
        </div>
        <div className="bluebook-header-center" />
        <div className="bluebook-header-right">
          <button
            onClick={onRetry}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
      <div className="bluebook-banner">PRACTICE TEST</div>

      {/* Summary */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #e5e7eb', padding: '24px',
          marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Submitted
          </div>
          <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
            You answered <strong style={{ color: '#1e293b' }}>{Object.keys(answers).length}</strong> out of <strong style={{ color: '#1e293b' }}>30</strong> questions.
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
            Review each question and compare with the correct answer below.
          </div>
        </div>

        {/* Question list */}
        {QUESTIONS.map((q) => {
          const userAnswer = answers[q.id] ?? '';
          const isOpen = expanded === q.id;

          return (
            <div
              key={q.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              {/* Row header */}
              <button
                onClick={() => setExpanded(isOpen ? null : q.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: '#1e293b', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {q.id}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {q.question.split('\n')[0]}
                  </div>
                  {userAnswer ? (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Your answer: <span style={{ color: '#1e293b', fontWeight: 600 }}>{userAnswer}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#d1d5db', marginTop: 2 }}>Not answered</div>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Expanded solution */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 16px 18px' }}>
                  {/* Correct answer */}
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                    display: 'flex', alignItems: 'baseline', gap: 8,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Answer</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>{q.answer}</span>
                  </div>

                  {/* Solution steps */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Solution
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: '50%',
                          background: '#f3f4f6', color: '#9ca3af',
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 2, flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 14, lineHeight: 1.65, color: '#374151' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
