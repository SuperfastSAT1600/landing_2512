'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  label: string;
  text: string;
}

interface Unit {
  id: string;
  title: string;
  type: 'multiple_choice' | 'short_answer';
  section: string;
  difficulty: string;
  passage: string | null;
  question: string;
  options: Option[] | null;
  correct_answer: string | string[];
  scope_lesson_id: string;
}

interface Module {
  id: string;
  title: string;
  section: string;
  order: number;
  units: Unit[];
}

type Answers = Record<string, string>;
type Phase = 'name' | 'test' | 'submitted';
type TestMode = 'timed' | 'untimed' | 'per_question';

interface FeedbackData {
  isCorrect: boolean;
  accuracy: number | null;
  total: number;
  loading: boolean;
  isLast: boolean;
}

interface FinalScore {
  correct: number;
  total: number;
  score: number;
}

const TEST_ID = 'fulltest';

function getModuleDuration(section: string): number {
  return section === 'Reading and Writing' ? 32 * 60 : 35 * 60;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TestPage() {
  const [phase, setPhase] = useState<Phase>('name');
  const [studentName, setStudentName] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [curriculumId, setCurriculumId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>('untimed');
  const [activeModule, setActiveModule] = useState(0);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
  const [moduleTimeLeft, setModuleTimeLeft] = useState<number | null>(null);
  const [timeUpModal, setTimeUpModal] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  const prefetchRef = useRef<Promise<{ modules: Module[]; curriculum_id: string }> | null>(null);
  const capacityAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    prefetchRef.current = fetch('/api/test/questions').then((r) => r.json());
  }, []);

  // Capacity check when access code changes
  useEffect(() => {
    if (accessCode.length < 3) {
      setRemaining(null);
      return;
    }
    if (capacityAbortRef.current) capacityAbortRef.current.abort();
    const ctrl = new AbortController();
    capacityAbortRef.current = ctrl;

    fetch(`/api/test-codes/capacity?code=${encodeURIComponent(accessCode)}&testId=${TEST_ID}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
        else setRemaining(null);
      })
      .catch(() => {/* aborted or error — ignore */});
  }, [accessCode]);

  // Timer effect (timed mode only)
  useEffect(() => {
    if (testMode !== 'timed' || phase !== 'test') return;
    const currentModule = modules[activeModule];
    if (!currentModule) return;

    const duration = getModuleDuration(currentModule.section);
    setModuleTimeLeft(duration);

    const interval = setInterval(() => {
      setModuleTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimeUpModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [testMode, phase, activeModule, modules]);

  async function startTest() {
    const name = studentName.trim();
    const ig = instagramId.trim();
    const code = accessCode.trim();
    if (!name || !ig || !code) return;

    setGateError('');
    setLoading(true);

    try {
      const res = await fetch('/api/test-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, instagramId: ig, testId: TEST_ID }),
      });
      const data = await res.json();
      if (!data.valid) {
        const msgs: Record<string, string> = {
          invalid_code: 'Invalid access code.',
          code_inactive: 'This code is no longer active.',
          code_expired: 'This code has expired.',
          capacity_exceeded: 'This code has reached its limit. Please get a new code.',
        };
        setGateError(msgs[data.error] ?? 'Something went wrong.');
        setLoading(false);
        return;
      }
      if (data.mode) setTestMode(data.mode as TestMode);
    } catch {
      setGateError('Network error. Please try again.');
      setLoading(false);
      return;
    }

    const qData = await (prefetchRef.current ?? fetch('/api/test/questions').then((r) => r.json()));
    setModules(qData.modules);
    setCurriculumId(qData.curriculum_id);
    setLoading(false);
    setPhase('test');
  }

  async function submitTest(showModal: boolean) {
    if (showModal) {
      setConfirmOpen(true);
      return;
    }
    setSubmitting(true);
    const ig = instagramId.startsWith('@') ? instagramId : `@${instagramId}`;
    try {
      const res = await fetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, instagramId: ig, curriculumId, answers }),
      });
      const data = await res.json();
      if (data.correct !== undefined && data.total !== undefined && data.score !== undefined) {
        setFinalScore({ correct: data.correct, total: data.total, score: data.score });
      }
    } catch {/* ignore */}
    setSubmitting(false);
    setConfirmOpen(false);
    setPhase('submitted');
  }

  async function handleSubmit() {
    await submitTest(false);
  }

  const currentModule = modules[activeModule];
  const currentUnits = currentModule?.units ?? [];
  const currentUnit = currentUnits[currentUnitIndex];
  const hasPassage = !!currentUnit?.passage;
  const totalUnits = modules.reduce((s, m) => s + m.units.length, 0);
  const answeredCount = Object.keys(answers).length;
  const isLastUnit = currentUnitIndex === currentUnits.length - 1;
  const isLastModule = activeModule === modules.length - 1;
  const isAtStart = activeModule === 0 && currentUnitIndex === 0;
  const globalIndex = modules.slice(0, activeModule).reduce((s, m) => s + m.units.length, 0) + currentUnitIndex;

  function checkCorrect(unit: Unit, answer: string): boolean {
    const ca = unit.correct_answer;
    if (Array.isArray(ca)) return ca.some((c) => c.toLowerCase() === answer.toLowerCase());
    return ca.toLowerCase() === answer.toLowerCase();
  }

  async function handleNextPerQuestion() {
    if (!currentUnit) return;
    const answer = answers[currentUnit.id] ?? '';
    const isCorrect = checkCorrect(currentUnit, answer);
    const isLast = isLastUnit && isLastModule;

    setFeedbackData({ isCorrect, accuracy: null, total: 0, loading: true, isLast });
    setFeedbackVisible(true);

    try {
      const res = await fetch('/api/test/question-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: currentUnit.id,
          curriculum_id: curriculumId,
          correct_answer: currentUnit.correct_answer,
        }),
      });
      const data = await res.json();
      setFeedbackData({
        isCorrect,
        accuracy: data.accuracy ?? null,
        total: data.total ?? 0,
        loading: false,
        isLast,
      });
    } catch {
      setFeedbackData({ isCorrect, accuracy: null, total: 0, loading: false, isLast });
    }
  }

  function continueFeedback() {
    const isLast = feedbackData?.isLast ?? false;
    setFeedbackVisible(false);
    setFeedbackData(null);
    if (isLast) {
      submitTest(false);
    } else {
      if (!isLastUnit) {
        setCurrentUnitIndex((i) => i + 1);
      } else if (!isLastModule) {
        setActiveModule((m) => m + 1);
        setCurrentUnitIndex(0);
      }
    }
  }

  function goNext() {
    if (testMode === 'per_question') {
      handleNextPerQuestion();
      return;
    }
    if (!isLastUnit) {
      setCurrentUnitIndex((i) => i + 1);
    } else if (!isLastModule) {
      setActiveModule((m) => m + 1);
      setCurrentUnitIndex(0);
    } else {
      setConfirmOpen(true);
    }
  }

  function goPrev() {
    if (currentUnitIndex > 0) {
      setCurrentUnitIndex((i) => i - 1);
    } else if (activeModule > 0) {
      const prevMod = modules[activeModule - 1];
      setActiveModule((m) => m - 1);
      setCurrentUnitIndex(prevMod.units.length - 1);
    }
  }

  // Capacity display helpers
  function getRemainingColor(): string {
    if (remaining === null) return 'transparent';
    if (remaining === 0) return '#ef4444';
    if (remaining <= 5) return '#ef4444';
    if (remaining <= 15) return '#f59e0b';
    return '#10b981';
  }

  function getRemainingText(): string {
    if (remaining === null) return '';
    if (remaining === 0) return '마감되었습니다';
    return `현재 ${remaining}자리 남았습니다`;
  }

  if (phase === 'name') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 40px', width: 380, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>SuperfastSAT Full Test</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>2026 June Full-Length Test #1</p>
          <input
            type="text"
            placeholder="Access code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startTest()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
          {/* Capacity display — fixed 22px height to prevent layout shift */}
          <div style={{ height: 22, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {remaining !== null && (
              <span style={{ fontSize: 13, fontWeight: 600, color: getRemainingColor() }}>
                {getRemainingText()}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="이름 입력"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="@instagram_id"
            value={instagramId}
            onChange={(e) => setInstagramId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startTest()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
          />
          {gateError && (
            <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'left', marginBottom: 8 }}>
              {gateError}
            </div>
          )}
          <button
            onClick={startTest}
            disabled={!studentName.trim() || !instagramId.trim() || !accessCode.trim() || loading}
            style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: !studentName.trim() || !instagramId.trim() || !accessCode.trim() || loading ? 0.4 : 1 }}
          >
            {loading ? '문제 불러오는 중...' : '시험 시작'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    const scoreColor = finalScore
      ? finalScore.score >= 80 ? '#10b981' : finalScore.score >= 60 ? '#f59e0b' : '#ef4444'
      : '#10b981';
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#1e293b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>제출 완료</h2>
          <p style={{ color: '#64748b', marginBottom: finalScore ? 24 : 0 }}>{studentName}님의 답안이 제출되었습니다.</p>
          {finalScore !== null && (
            <div style={{ border: `2px solid ${scoreColor}`, background: `${scoreColor}18`, borderRadius: 12, padding: '24px 40px', marginTop: 8 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {finalScore.score}%
              </div>
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: 500 }}>
                {finalScore.correct} / {finalScore.total} 정답
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Timer color
  const timerColor = moduleTimeLeft !== null
    ? moduleTimeLeft <= 60 ? '#ef4444' : moduleTimeLeft <= 300 ? '#f59e0b' : '#94a3b8'
    : '#94a3b8';

  // per_question mode: next button label and disabled state
  const isPerQuestion = testMode === 'per_question';
  const nextLabel = isPerQuestion
    ? (isLastUnit && isLastModule ? '결과 보기' : '확인')
    : (isLastUnit && isLastModule ? '최종 제출' : 'Next');
  const nextDisabled = isPerQuestion && currentUnit ? !answers[currentUnit.id] : false;

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {currentModule?.section === 'Reading and Writing' ? 'Section 1: Reading and Writing' : 'Section 2: Math'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {testMode === 'timed' && moduleTimeLeft !== null && (
            <span style={{ color: timerColor, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(moduleTimeLeft)}
            </span>
          )}
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            {answeredCount} / {totalUnits} answered
          </span>
        </div>
      </div>

      {/* Bluebook split layout */}
      <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {hasPassage && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div
                  className="test-passage-content"
                  style={{ fontSize: 15, lineHeight: 1.8, color: '#374151' }}
                  dangerouslySetInnerHTML={{ __html: currentUnit.passage! }}
                />
              </div>
            </div>
            <div className="test-resizer" />
          </>
        )}

        <div className={`test-question-panel ${hasPassage ? 'has-passage' : ''}`}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
            {currentUnit && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    {globalIndex + 1}
                  </span>
                </div>

                <div
                  style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: currentUnit.question }}
                />

                {currentUnit.type === 'multiple_choice' && currentUnit.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentUnit.options.map((opt) => {
                      const isSelected = answers[currentUnit.id] === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentUnit.id]: opt.label }))}
                          className={`bluebook-option btn-press${isSelected ? ' selected' : ''}`}
                        >
                          <span className="bluebook-option-label">{opt.label}</span>
                          <span
                            className="bluebook-option-text"
                            dangerouslySetInnerHTML={{ __html: opt.text }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentUnit.type === 'short_answer' && (
                  <input
                    type="text"
                    placeholder="답 입력"
                    value={answers[currentUnit.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentUnit.id]: e.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 8, border: answers[currentUnit.id] ? '1.5px solid #3b82f6' : '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, width: 180 }}
                  />
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
          style={{ opacity: isAtStart || isPerQuestion ? 0 : 1, pointerEvents: isAtStart || isPerQuestion ? 'none' : 'auto' }}
        >
          Back
        </button>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {currentUnitIndex + 1} / {currentUnits.length}
        </span>
        <button
          onClick={goNext}
          disabled={nextDisabled}
          className="bluebook-next-btn"
          style={{ opacity: nextDisabled ? 0.4 : 1 }}
        >
          {nextLabel}
        </button>
      </div>

      {/* Submit confirm modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, width: 320, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>제출하시겠습니까?</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              {answeredCount}/{totalUnits}문제 답변 완료
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#1e293b', cursor: 'pointer', fontSize: 14 }}>
                취소
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: '10px 0', background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {submitting ? '제출 중...' : '제출'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time-up modal (timed mode) */}
      {timeUpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: 360, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>시간 종료</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
              {isLastModule ? '모든 섹션이 종료되었습니다. 답안을 제출해 주세요.' : '이 섹션 시간이 종료되었습니다. 다음 섹션으로 이동합니다.'}
            </p>
            {!isLastModule ? (
              <button
                onClick={() => { setActiveModule((m) => m + 1); setCurrentUnitIndex(0); setTimeUpModal(false); }}
                style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                다음 섹션으로
              </button>
            ) : (
              <button
                onClick={() => { setTimeUpModal(false); setConfirmOpen(true); }}
                style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                제출하기
              </button>
            )}
          </div>
        </div>
      )}

      {/* Per-question feedback overlay */}
      {feedbackVisible && feedbackData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', width: 360, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            {feedbackData.loading ? (
              <p style={{ color: '#64748b', fontSize: 15 }}>결과 불러오는 중...</p>
            ) : (
              <>
                <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8, color: feedbackData.isCorrect ? '#10b981' : '#ef4444' }}>
                  {feedbackData.isCorrect ? '✓' : '✗'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: feedbackData.isCorrect ? '#10b981' : '#ef4444', marginBottom: 24 }}>
                  {feedbackData.isCorrect ? '정답' : '오답'}
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>이 문제 정답률</div>
                  {feedbackData.total === 0 || feedbackData.accuracy === null ? (
                    <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>첫 번째 응시자입니다</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                        {Math.round(feedbackData.accuracy)}%
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{feedbackData.total}명 응시</div>
                    </>
                  )}
                </div>
                <button
                  onClick={continueFeedback}
                  style={{ width: '100%', padding: '12px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  {feedbackData.isLast ? '결과 보기' : '다음 문제'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
