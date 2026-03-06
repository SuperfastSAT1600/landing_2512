'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator as CalculatorIcon, BookOpen, MoreHorizontal } from 'lucide-react';
import { useTestTimer } from '../hooks/useTestTimer';
import { ContentRenderer } from './ContentRenderer';
import { TestCalculator } from './TestCalculator';
import { QuestionNavGrid } from './QuestionNavGrid';
import { ConfidencePicker } from './ConfidencePicker';
import { TestSubmittedScreen } from './TestSubmittedScreen';
import type { DiagnosticTestData } from '../data/diagnostic-test-1';

interface DiagnosticTestViewProps {
  testData: DiagnosticTestData;
}

export function DiagnosticTestView({ testData }: DiagnosticTestViewProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showNav, setShowNav] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [passageWidth, setPassageWidth] = useState(50); // percentage
  const resizerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const { questions, title, timeLimit } = testData;
  const currentQuestion = questions[currentQuestionIndex];
  const hasPassage = !!currentQuestion?.passage;

  // Section label based on passage presence
  const sectionLabel = hasPassage
    ? 'Section 1, Module 1: Reading and Writing'
    : 'Section 2, Module 1: Math';

  const timer = useTestTimer(timeLimit, !!startTime);

  // Auto-submit when time runs out
  React.useEffect(() => {
    if (timer.remaining === 0 && startTime && !submitting) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.remaining]);

  // Resizer drag logic
  useEffect(() => {
    const resizer = resizerRef.current;
    const layout = layoutRef.current;
    if (!resizer || !layout) return;

    let isDragging = false;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const rect = layout.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPassageWidth(Math.max(25, Math.min(75, pct)));
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    resizer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      resizer.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [hasPassage]);

  const recordQuestionTime = useCallback(() => {
    if (!currentQuestion) return;
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion.id]: (prev[currentQuestion.id] ?? 0) + elapsed,
    }));
  }, [currentQuestion, questionStartTime]);

  const navigateToQuestion = useCallback((index: number) => {
    recordQuestionTime();
    setCurrentQuestionIndex(index);
    setQuestionStartTime(Date.now());
    setShowNav(false);
  }, [recordQuestionTime]);

  const toggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
      else next.add(currentQuestion.id);
      return next;
    });
  }, [currentQuestion]);

  const toggleCrossOut = useCallback((questionId: string, optionId: string) => {
    setCrossedOut(prev => {
      const qSet = new Set(prev[questionId] ?? []);
      if (qSet.has(optionId)) qSet.delete(optionId);
      else qSet.add(optionId);
      return { ...prev, [questionId]: qSet };
    });
  }, []);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleConfidence = (questionId: string, level: number) => {
    setConfidence(prev => ({ ...prev, [questionId]: level }));
  };

  const handleSubmit = () => {
    recordQuestionTime();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
    }, 400);
  };

  if (submitted) return <TestSubmittedScreen />;

  /* ── Intro screen ────────────────── */
  if (!startTime) {
    return (
      <div className="min-h-screen" style={{ background: '#F4F5F9' }}>
        <div className="mx-auto px-5 pt-20 pb-24" style={{ maxWidth: 460 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="text-center mb-10">
              <div
                className="toss-icon-box toss-icon-box-blue mx-auto mb-6"
                style={{ width: 56, height: 56, borderRadius: 28 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="#3182F6" strokeWidth="2" strokeLinecap="round"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
              <p className="text-base text-gray-500 mt-2">SAT 진단 테스트</p>
            </div>

            <div className="toss-card mb-4">
              {testData.directions && (
                <div className="text-sm text-gray-500 leading-relaxed mb-4">
                  <ContentRenderer content={testData.directions} />
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 4v4l3 3M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {timeLimit ? `${timeLimit}분` : '제한없음'}
                </span>
                <span className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8h8M4 5h8M4 11h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {questions.length}문제
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStartTime(Date.now())}
              className="btn-toss btn-press"
            >
              테스트 시작
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Test taking (Bluebook style) ───── */
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.id) : false;

  return (
    <div className="flex flex-col flex-1 h-full" style={{ background: '#F4F5F9' }}>
      {/* Bluebook Header */}
      <div className="bluebook-header">
        <div className="bluebook-header-left">
          <span className="bluebook-section-title hidden sm:inline">{sectionLabel}</span>
          <span className="bluebook-section-title sm:hidden">
            {hasPassage ? 'Reading & Writing' : 'Math'}
          </span>
          <button
            type="button"
            className="bluebook-directions-btn"
            onClick={() => setShowDirections(!showDirections)}
          >
            Directions
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={showDirections ? "M9 7.5L6 4.5 3 7.5" : "M3 4.5L6 7.5 9 4.5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="bluebook-header-center">
          {timer.remaining !== null && (
            <>
              <span className={`bluebook-timer ${timer.isWarning ? 'warning' : ''} ${timer.isDanger ? 'danger' : ''}`}>
                {timer.format(timer.remaining)}
              </span>
            </>
          )}
        </div>

        <div className="bluebook-header-right">
          <button
            type="button"
            onClick={() => setCalculatorOpen(true)}
            className="bluebook-icon-btn"
          >
            <CalculatorIcon className="h-5 w-5" />
            <span>Calculator</span>
          </button>
          {!hasPassage && (
            <button type="button" className="bluebook-icon-btn">
              <span style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic' }}>x²</span>
              <span>Reference</span>
            </button>
          )}
          <button type="button" className="bluebook-icon-btn hidden sm:flex">
            <BookOpen className="h-5 w-5" />
            <span>Notes</span>
          </button>
          <button type="button" className="bluebook-icon-btn">
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Practice Test Banner */}
      <div className="bluebook-banner">THIS IS A PRACTICE TEST</div>

      {/* Directions dropdown */}
      <AnimatePresence>
        {showDirections && testData.directions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white border-b border-gray-200"
          >
            <div className="px-6 py-4 text-sm text-gray-600 leading-relaxed max-w-3xl mx-auto">
              <ContentRenderer content={testData.directions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="test-layout" ref={layoutRef}>
        {/* Passage (only if exists) */}
        {hasPassage && (
          <>
            <div
              className="test-passage-panel"
              style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${passageWidth}%` : undefined }}
            >
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div className="test-passage-content">
                  <ContentRenderer content={currentQuestion.passage!} />
                </div>
              </div>
            </div>
            <div className="test-resizer" ref={resizerRef} />
          </>
        )}

        {/* Question panel */}
        <div
          className="test-question-panel"
          style={hasPassage && typeof window !== 'undefined' && window.innerWidth >= 768
            ? { width: `calc(${100 - passageWidth}% - 8px)` }
            : undefined
          }
        >
          <div className="mx-auto" style={{ maxWidth: hasPassage ? 560 : 700, padding: '24px 20px 120px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion?.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {currentQuestion && (
                  <div>
                    {/* Question number + Mark for Review + Cross-out toggle */}
                    <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                          style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b' }}
                        >
                          {currentQuestionIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={toggleFlag}
                          className={`bluebook-mark-review btn-press ${isFlagged ? 'active' : ''}`}
                        >
                          <span className="bluebook-mark-checkbox">
                            {isFlagged && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          Mark for Review
                        </button>
                      </div>
                      {currentQuestion.type === 'multiple-choice' && (
                        <span className="text-xs text-gray-400 font-semibold tracking-wide" style={{ cursor: 'default' }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
                            <text x="2" y="14" fontSize="14" fontWeight="800" fill="#9ca3af" fontFamily="serif" style={{ textDecoration: 'line-through' }}>ABC</text>
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <div
                      className="text-gray-800"
                      style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20 }}
                    >
                      <ContentRenderer content={currentQuestion.question} />
                    </div>

                    {/* Multiple choice — Bluebook style */}
                    {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                          const isSelected = answers[currentQuestion.id] === option.id;
                          const isCrossed = crossedOut[currentQuestion.id]?.has(option.id);
                          return (
                            <div key={option.id} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAnswer(currentQuestion.id, option.id)}
                                className={`bluebook-option btn-press ${isSelected ? 'selected' : ''} ${isCrossed && !isSelected ? 'crossedout' : ''}`}
                              >
                                <span className="bluebook-option-label">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="bluebook-option-text">
                                  <ContentRenderer content={option.text} className="inline" />
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCrossOut(currentQuestion.id, option.id)}
                                className={`bluebook-option-crossout btn-press ${isCrossed ? 'active' : ''}`}
                                title="Cross out"
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short answer */}
                    {currentQuestion.type === 'short-answer' && (
                      <input
                        type="text"
                        value={answers[currentQuestion.id] ?? ''}
                        onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Type your answer (no spaces)..."
                        className="toss-input"
                        style={{ marginTop: 8 }}
                      />
                    )}

                    {/* Confidence picker */}
                    {answers[currentQuestion.id] && (
                      <ConfidencePicker
                        questionId={currentQuestion.id}
                        confidence={confidence}
                        onConfidence={handleConfidence}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Question nav overlay (from bottom) */}
        <AnimatePresence>
          {showNav && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bluebook-nav-overlay"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">
                  {hasPassage ? 'Section 1: Reading and Writing' : 'Section 2: Math'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNav(false)}
                  className="text-gray-400 hover:text-gray-600 btn-press"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 14l8-8M14 14L6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <QuestionNavGrid
                questions={questions}
                currentIndex={currentQuestionIndex}
                answers={answers}
                flagged={flagged}
                onNavigate={navigateToQuestion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bluebook Footer */}
      <div className="bluebook-footer">
        <div className="text-xs text-gray-400" style={{ minWidth: 80 }}>
          {/* User name placeholder */}
        </div>

        <button
          type="button"
          className="bluebook-footer-center btn-press"
          onClick={() => setShowNav(!showNav)}
        >
          Question {currentQuestionIndex + 1} of {questions.length}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 4 }}>
            <path d={showNav ? "M4 8.5L7 5.5 10 8.5" : "M4 5.5L7 8.5 10 5.5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {currentQuestionIndex > 0 && (
            <button
              type="button"
              onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
              className="bluebook-next-btn btn-press"
              style={{ background: 'transparent', color: '#1e293b', border: '1.5px solid #d1d5db' }}
            >
              Back
            </button>
          )}
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
              className="bluebook-next-btn btn-press"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`bluebook-next-btn btn-press ${submitting ? 'animate-subtle-pulse' : ''}`}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Calculator */}
      <TestCalculator isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
