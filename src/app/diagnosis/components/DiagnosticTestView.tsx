'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator as CalculatorIcon } from 'lucide-react';
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

  const { questions, title, timeLimit } = testData;
  const currentQuestion = questions[currentQuestionIndex];

  const timer = useTestTimer(timeLimit, !!startTime);

  // Auto-submit when time runs out
  React.useEffect(() => {
    if (timer.remaining === 0 && startTime && !submitting) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.remaining]);

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
    // Small delay for UX feedback
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

  /* ── Test taking ─────────────────── */
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.id) : false;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#F4F5F9' }}>
      {/* Header */}
      <div
        className="bg-[#e7edf7] px-4 py-3 flex-shrink-0"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-sm font-bold text-gray-800 truncate" style={{ maxWidth: 200 }}>
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {/* Timer */}
            {timer.remaining !== null && (
              <span
                className={`test-timer ${timer.isWarning ? 'warning' : ''} ${timer.isDanger ? 'danger' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 4v4l3 3M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {timer.format(timer.remaining)}
              </span>
            )}
            {/* Calculator button */}
            <button
              type="button"
              onClick={() => setCalculatorOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors btn-press"
            >
              <CalculatorIcon className="h-5 w-5 text-gray-700" />
              <span className="text-[10px] font-medium text-gray-500">Calc</span>
            </button>
            {/* Nav toggle */}
            <button
              type="button"
              onClick={() => setShowNav(!showNav)}
              className="toss-chip-blue btn-press"
              style={{ padding: '6px 12px', fontSize: 14, fontWeight: 700 }}
            >
              {currentQuestionIndex + 1}/{questions.length}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="toss-progress-track">
          <div className="toss-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Question navigation panel */}
        <AnimatePresence>
          {showNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1">
                <QuestionNavGrid
                  questions={questions}
                  currentIndex={currentQuestionIndex}
                  answers={answers}
                  flagged={flagged}
                  onNavigate={navigateToQuestion}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="test-layout">
        {currentQuestion?.passage && (
          <div className="test-passage-panel">
            <div style={{ padding: '24px 28px 24px 24px' }}>
              <p className="text-xs font-semibold text-gray-400" style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
                PASSAGE
              </p>
              <div className="test-passage-content">
                <ContentRenderer content={currentQuestion.passage} />
              </div>
            </div>
          </div>
        )}

        <div className="test-question-panel">
          <div className="mx-auto" style={{ maxWidth: 560, padding: '24px 20px 32px' }}>
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
                    {/* Question number + flag */}
                    <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                          style={{ width: 32, height: 32, borderRadius: 10, background: '#3182F6' }}
                        >
                          {currentQuestionIndex + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-400" style={{ letterSpacing: '0.05em' }}>
                          QUESTION {currentQuestionIndex + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleFlag}
                        className="btn-press flex items-center gap-1 text-xs font-medium"
                        style={{ color: isFlagged ? '#F59E0B' : '#8B95A1' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill={isFlagged ? '#F59E0B' : 'none'}>
                          <path d="M3 2v12M3 2l8 4-8 4" stroke={isFlagged ? '#F59E0B' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {isFlagged ? 'Flagged' : 'Flag'}
                      </button>
                    </div>

                    {/* Question text */}
                    <div
                      className="text-gray-800"
                      style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20 }}
                    >
                      <ContentRenderer content={currentQuestion.question} />
                    </div>

                    {/* Multiple choice */}
                    {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, idx) => {
                          const isSelected = answers[currentQuestion.id] === option.id;
                          const isCrossed = crossedOut[currentQuestion.id]?.has(option.id);
                          return (
                            <div key={option.id} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAnswer(currentQuestion.id, option.id)}
                                className={`toss-slot btn-press flex-1 ${isSelected ? 'selected' : ''} ${isCrossed && !isSelected ? 'test-option-crossedout' : ''}`}
                                style={{ gap: 12 }}
                              >
                                <span
                                  className="text-sm font-bold flex-shrink-0 flex items-center justify-center"
                                  style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#F4F5F9',
                                    color: isSelected ? '#fff' : '#8B95A1',
                                  }}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-left flex-1" style={{ fontSize: 14 }}>
                                  <ContentRenderer content={option.text} className="inline" />
                                </span>
                              </button>
                              {/* Cross-out */}
                              <button
                                type="button"
                                onClick={() => toggleCrossOut(currentQuestion.id, option.id)}
                                className="btn-press flex-shrink-0 flex items-center justify-center"
                                title="Cross out"
                                style={{
                                  width: 28, height: 28, borderRadius: 8,
                                  background: isCrossed ? '#F4F5F9' : 'transparent',
                                  color: isCrossed ? '#F04452' : '#D1D6DB',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

                    {/* Confidence picker — shows after answering */}
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
      </div>

      {/* Footer */}
      <div className="bg-white px-4 py-3 flex-shrink-0" style={{ boxShadow: '0 -1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mx-auto" style={{ maxWidth: 700 }}>
          <div>
            {currentQuestionIndex > 0 && (
              <button
                type="button"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                className="flex items-center gap-1 text-sm font-medium text-gray-500 btn-press"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
          </div>
          <span className="text-xs text-gray-300">SAT 진단테스트</span>
          <div>
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                className="btn-toss btn-press"
                style={{ width: 'auto', padding: '10px 24px', fontSize: 14, borderRadius: 12 }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`btn-toss btn-press ${submitting ? 'animate-subtle-pulse' : ''}`}
                style={{ width: 'auto', padding: '10px 24px', fontSize: 14, borderRadius: 12 }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calculator */}
      <TestCalculator isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
