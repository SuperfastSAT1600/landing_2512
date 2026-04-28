'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useTestTimer } from '../hooks/useTestTimer';
import { useVocabTracker } from '../hooks/useVocabTracker';
import { ContentRenderer } from './ContentRenderer';
import { SelectableText } from './SelectableText';
import { TestCalculator } from './TestCalculator';
import { QuestionNavGrid } from './QuestionNavGrid';
import { ConfidencePicker } from './ConfidencePicker';
import { TestSubmittedScreen } from './TestSubmittedScreen';
import { SubmitConfirmationScreen } from './SubmitConfirmationScreen';
import type { DiagnosticTestData } from '../data/diagnostic-test-1';
import { SubmitTestRequest, SavedWord } from '@/types/diagnosis';
import { calcAverageConfidence } from '../utils/calcAverageConfidence';

interface DiagnosticTestViewProps {
  testData: DiagnosticTestData;
  tokenId?: string;
  studentEmail?: string;
  studentName?: string;
  testVersionId?: string;
  timeLimitMinutes?: number;
}

export function DiagnosticTestView({
  testData,
  tokenId = '',
  studentEmail = '',
  studentName = '',
  testVersionId,
  timeLimitMinutes,
}: DiagnosticTestViewProps) {
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
  const [resultId, setResultId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [elapsedAtConfirm, setElapsedAtConfirm] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [showVocabNotice, setShowVocabNotice] = useState(true);
  const [selectedWord, setSelectedWord] = useState<SavedWord | null>(null);
  const [highlightConfidence, setHighlightConfidence] = useState(false);
  const [saveButtonPosition, setSaveButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const { savedWords, toggleWord, isWordSaved } = useVocabTracker();
  const { questions: rawQuestions, title, timeLimit } = testData;
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  const currentQuestion = questions[currentQuestionIndex];
  const hasPassage = !!currentQuestion?.passage;

  // Allow per-student override; fall back to test data's built-in timeLimit
  // Both values are in minutes — useTestTimer handles minutes→seconds conversion internally
  const effectiveTimeLimit = timeLimitMinutes ?? timeLimit ?? null;
  const timer = useTestTimer(effectiveTimeLimit, !!startTime);

  const clearSelection = useCallback(() => {
    setSelectedWord(null);
    setSaveButtonPosition(null);
  }, []);

  const recordQuestionTime = useCallback(() => {
    if (!currentQuestion) return;
    const raw = Math.floor((Date.now() - questionStartTime) / 1000);
    const timeLimitSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : Infinity;
    const elapsed = Math.min(raw, timeLimitSeconds);
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion.id]: (prev[currentQuestion.id] ?? 0) + elapsed,
    }));
  }, [currentQuestion, questionStartTime, timeLimitMinutes]);

  const navigateToQuestion = useCallback((index: number) => {
    recordQuestionTime();
    setCurrentQuestionIndex(index);
    setQuestionStartTime(Date.now());
    setShowNav(false);
    clearSelection();
    setHighlightConfidence(false);
  }, [recordQuestionTime, clearSelection]);

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
    setHighlightConfidence(false);
  };

  const handleWordClick = (word: SavedWord, position: { top: number; left: number }) => {
    setSelectedWord(word);
    setSaveButtonPosition(position);
  };

  // REQ-001: Click outside word/save-button clears selection
  useEffect(() => {
    if (!selectedWord) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.vocab-word-span, .vocab-save-btn')) return;
      clearSelection();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [selectedWord, clearSelection]);

  // REQ-002: Escape key clears selection
  useEffect(() => {
    if (!selectedWord) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, clearSelection]);

  const handleSaveWord = () => {
    if (selectedWord) {
      toggleWord(selectedWord);
      clearSelection();
    }
  };

  const isSubmittingRef = React.useRef(false);

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    recordQuestionTime();
    setSubmitting(true);

    // Always save results to Supabase
    try {
      const submitData: SubmitTestRequest = {
        tokenId,
        studentEmail,
        studentName,
        testId: 'diagnostic-test-1',
        testVersionId,
        startedAt: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        totalTimeSeconds: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        answers,
        confidenceLevels: confidence,
        flaggedQuestions: Array.from(flagged),
        questionTimes,
        savedWords,
      };

      const response = await fetch('/api/diagnosis/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resultId) setResultId(data.resultId);
      } else {
        console.error('Failed to save test results:', await response.text());
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    }

    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      isSubmittingRef.current = false;
    }, 400);
  };

  // Auto-submit when time runs out — ref ensures latest answers/confidence are captured
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSubmitRef = React.useRef(handleSubmit);
  React.useEffect(() => { handleSubmitRef.current = handleSubmit; });
  React.useEffect(() => {
    if (timer.remaining === 0 && startTime && !submitting && !submitted) {
      handleSubmitRef.current();
    }
  }, [timer.remaining, startTime, submitting, submitted]);

  if (submitted) return <TestSubmittedScreen resultId={resultId} />;

  if (showConfirmation) {
    return (
      <SubmitConfirmationScreen
        elapsedSeconds={elapsedAtConfirm}
        answeredCount={Object.keys(answers).length}
        totalQuestions={questions.length}
        avgConfidence={calcAverageConfidence(confidence)}
        savedWordCount={savedWords.length}
        submitting={submitting}
        onConfirm={handleSubmit}
        onGoBack={() => setShowConfirmation(false)}
      />
    );
  }

  /* ── Intro screen ────────────────── */
  if (!startTime) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="w-full" style={{ maxWidth: 460 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="text-center mb-10">
              <div
                className="mx-auto mb-6 flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(7,27,233,0.15)' }}
              >
                <Icon icon="fluent:clipboard-task-24-regular" width={28} height={28} color="#6085FF" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">SAT Diagnostic Test</h1>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#09090b] p-6 mb-4">
              {testData.directions && (
                <div className="text-sm text-gray-400 leading-relaxed mb-4">
                  <ContentRenderer content={testData.directions} />
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 pt-3 border-t border-white/8">
                <span className="flex items-center gap-1.5">
                  <Icon icon="fluent:timer-20-regular" width={16} height={16} />
                  {timeLimit ? `${timeLimit} min` : 'No time limit'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="fluent:text-bullet-list-20-regular" width={16} height={16} />
                  {questions.length} questions
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStartTime(Date.now())}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg"
              style={{ background: '#071be9', boxShadow: '0 4px 24px rgba(7,27,233,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a31f0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#071be9')}
            >
              Begin Test
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
          <button
            type="button"
            className="bluebook-directions-btn"
            onClick={() => setShowDirections(!showDirections)}
          >
            Directions
            <Icon icon={showDirections ? "fluent:chevron-up-20-regular" : "fluent:chevron-down-20-regular"} width={14} height={14} />
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
            <Icon icon="fluent:calculator-24-regular" width={20} height={20} />
            <span>Calculator</span>
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

      {/* Vocabulary tracking notice */}
      <AnimatePresence>
        {showVocabNotice && currentQuestionIndex === 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-blue-50 border-b border-blue-200"
          >
            <div className="px-6 py-3 text-sm text-blue-800 leading-relaxed max-w-3xl mx-auto flex items-center justify-between">
              <span>💡 <strong>Vocabulary Tip:</strong> Click any unknown word in the passage or options, then press "Save" to mark it for vocabulary building.</span>
              <button
                type="button"
                onClick={() => setShowVocabNotice(false)}
                className="text-blue-600 hover:text-blue-800 ml-4 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="test-layout" ref={layoutRef}>
        {/* Passage (only if exists) */}
        {hasPassage && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>
                <div className="test-passage-content">
                  <SelectableText
                    content={currentQuestion.passage!}
                    questionId={currentQuestion.id}
                    section="passage"
                    savedWords={savedWords}
                    onWordClick={handleWordClick}
                  />
                </div>
              </div>
            </div>
            <div className="test-resizer" ref={resizerRef} />
          </>
        )}

        {/* Question panel */}
        <div className={`test-question-panel ${hasPassage ? 'has-passage' : ''}`}>
          <div className="mx-auto" style={{ maxWidth: 640, padding: '24px 20px 120px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion?.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
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
                      <SelectableText
                        content={currentQuestion.question}
                        questionId={currentQuestion.id}
                        section="question"
                        savedWords={savedWords}
                        onWordClick={handleWordClick}
                      />
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
                                  <SelectableText
                                    content={option.text}
                                    questionId={currentQuestion.id}
                                    section="option"
                                    optionId={option.id}
                                    savedWords={savedWords}
                                    onWordClick={handleWordClick}
                                    className="inline"
                                  />
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

                    {/* Confidence picker — shown after answer is given */}
                    {answers[currentQuestion.id] && (
                      <ConfidencePicker
                        questionId={currentQuestion.id}
                        confidence={confidence}
                        onConfidence={handleConfidence}
                        highlight={highlightConfidence}
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
                  <Icon icon="fluent:dismiss-20-regular" width={20} height={20} />
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

      {/* Floating Save Word Button */}
      <AnimatePresence>
        {selectedWord && saveButtonPosition && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={handleSaveWord}
            className="vocab-save-btn btn-press"
            style={{
              position: 'fixed',
              top: `${saveButtonPosition.top + 24}px`,
              left: `${saveButtonPosition.left}px`,
              zIndex: 100,
            }}
          >
            {isWordSaved(selectedWord.word, selectedWord.questionId, selectedWord.positionIndex) ? 'Unsave' : 'Save'}
          </motion.button>
        )}
      </AnimatePresence>

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
          <Icon icon={showNav ? "fluent:chevron-up-20-regular" : "fluent:chevron-down-20-regular"} width={14} height={14} style={{ marginLeft: 4 }} />
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
              onClick={() => {
                const qId = currentQuestion?.id;
                if (qId && answers[qId] && confidence[qId] === undefined) {
                  setHighlightConfidence(true);
                  return;
                }
                navigateToQuestion(currentQuestionIndex + 1);
              }}
              className="bluebook-next-btn btn-press"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                // REQ-005: 시간 남음 + 미답 있으면 차단
                const unansweredCount = questions.length - Object.keys(answers).length;
                if (unansweredCount > 0 && timer.remaining !== null && timer.remaining > 0) {
                  const firstUnansweredIdx = questions.findIndex(q => !answers[q.id]);
                  if (firstUnansweredIdx >= 0) navigateToQuestion(firstUnansweredIdx);
                  return;
                }

                // REQ-004: confidence 미선택 문제 있으면 차단
                const answeredIds = Object.keys(answers);
                const missingConfidence = answeredIds.filter(id => confidence[id] === undefined);
                if (missingConfidence.length > 0) {
                  const firstMissingIdx = questions.findIndex(q => missingConfidence.includes(q.id));
                  if (firstMissingIdx >= 0) navigateToQuestion(firstMissingIdx);
                  return;
                }

                recordQuestionTime();
                setQuestionStartTime(Date.now());
                setElapsedAtConfirm(startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
                setShowConfirmation(true);
              }}
              className="bluebook-next-btn btn-press"
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {/* Calculator */}
      <TestCalculator isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
