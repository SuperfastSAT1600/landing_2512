'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VocabQuestion } from '../data/diagnostic-test-2-vocab';
import type { VocabAnswer } from '@/types/diagnosis';

const SECONDS_PER_QUESTION = 10;

interface VocabSectionProps {
  questions: VocabQuestion[];
  onComplete: (answers: VocabAnswer[]) => void;
}

export function VocabSection({ questions, onComplete }: VocabSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [collectedAnswers, setCollectedAnswers] = useState<VocabAnswer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const questionStartRef = useRef(Date.now());
  const advancingRef = useRef(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  const advance = useCallback((chosenOptionId: string | null) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setIsAdvancing(true);

    const q = questions[currentIndex];
    const timeTaken = Math.min(
      Math.floor((Date.now() - questionStartRef.current) / 1000),
      SECONDS_PER_QUESTION
    );
    const correctOption = q.options.find(o => o.type === 'correct');
    const isCorrect = chosenOptionId !== null && chosenOptionId === correctOption?.id;

    const newAnswer: VocabAnswer = {
      wordId: q.id,
      selectedOptionId: chosenOptionId,
      isCorrect,
      timeTaken,
    };

    setCollectedAnswers(prev => {
      const updated = [...prev, newAnswer];
      if (currentIndex + 1 >= questions.length) {
        onComplete(updated);
      }
      return updated;
    });

    if (currentIndex + 1 < questions.length) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(SECONDS_PER_QUESTION);
        setSelectedId(null);
        setIsAdvancing(false);
        advancingRef.current = false;
        questionStartRef.current = Date.now();
      }, 350);
    }
  }, [currentIndex, questions, onComplete]);

  // Per-question countdown
  useEffect(() => {
    if (isAdvancing || selectedId !== null) return;
    setTimeLeft(SECONDS_PER_QUESTION);
    questionStartRef.current = Date.now();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          advance(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleSelect = (optionId: string) => {
    if (isAdvancing || selectedId !== null) return;
    setSelectedId(optionId);
    advance(optionId);
  };

  if (!currentQuestion) return null;

  const progressPct = (currentIndex / totalQuestions) * 100;
  const isUrgent = timeLeft <= 3;
  const isWarning = timeLeft <= 5 && !isUrgent;

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span className="font-semibold text-gray-400">Vocabulary Check</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#071be9] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Timer */}
            <div className="flex justify-center mb-6">
              <div
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-colors"
                style={{
                  borderColor: isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                  color: isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : '#9ca3af',
                }}
              >
                {timeLeft}
              </div>
            </div>

            {/* Word */}
            <div className="text-center mb-8">
              <h2 className="text-5xl font-bold text-white tracking-tight">
                {currentQuestion.word}
              </h2>
              <p className="text-gray-500 text-sm mt-3">Select the correct definition</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedId === option.id;
                const revealed = selectedId !== null;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    disabled={revealed}
                    className="w-full text-left p-4 rounded-xl border transition-all"
                    style={{
                      borderColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : '#09090b',
                      color: '#e5e7eb',
                      opacity: revealed && !isSelected ? 0.4 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!revealed) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!revealed) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#09090b';
                      }
                    }}
                  >
                    <span className="font-semibold mr-3" style={{ color: '#6b7280' }}>
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
