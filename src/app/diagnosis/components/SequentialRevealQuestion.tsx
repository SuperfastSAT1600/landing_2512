'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfidencePicker } from './ConfidencePicker';
import { SelectableText } from './SelectableText';
import type { TestQuestion } from '../data/diagnostic-test-1';
import type { SavedWord, RWSequentialAnswer } from '@/types/diagnosis';

interface SequentialRevealQuestionProps {
  question: TestQuestion;
  questionNumber: number;
  savedWords: SavedWord[];
  onWordClick: (word: SavedWord, position: { top: number; left: number }) => void;
  onAnswer: (answer: RWSequentialAnswer) => void;
}

export function SequentialRevealQuestion({
  question,
  questionNumber,
  savedWords,
  onWordClick,
  onAnswer,
}: SequentialRevealQuestionProps) {
  const [currentOptionIdx, setCurrentOptionIdx] = useState(0);
  const [optionsViewedCount, setOptionsViewedCount] = useState(1);
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'selecting' | 'confidence'>('selecting');
  const [confidenceRecord, setConfidenceRecord] = useState<Record<string, number>>({});

  const options = question.options ?? [];
  const currentOption = options[currentOptionIdx];
  const isLastOption = currentOptionIdx === options.length - 1;

  const commitAnswer = (optionId: string) => {
    setChosenOptionId(optionId);
    setPhase('confidence');
  };

  const handleYes = () => commitAnswer(currentOption.id);

  const handleNo = () => {
    if (isLastOption) {
      commitAnswer(currentOption.id);
      return;
    }
    setCurrentOptionIdx(prev => prev + 1);
    setOptionsViewedCount(prev => prev + 1);
  };

  const handleConfidence = (_questionId: string, level: number) => {
    setConfidenceRecord({ [question.id]: level });

    const finalOptionId = chosenOptionId!;
    const correctOption = options.find(o => o.type === 'correct');

    onAnswer({
      questionId: question.id,
      firstYesOptionId: finalOptionId,
      optionsViewedCount,
      finalAnswer: finalOptionId,
      confidence: level,
      isCorrect: finalOptionId === correctOption?.id,
    });
  };

  const chosenOptionLabel = chosenOptionId
    ? String.fromCharCode(65 + options.findIndex(o => o.id === chosenOptionId))
    : '';
  const chosenOptionText = options.find(o => o.id === chosenOptionId)?.text ?? '';

  return (
    <div>
      {/* Question number badge */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="inline-flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b' }}
        >
          {questionNumber}
        </span>
      </div>

      {/* Question text */}
      <div
        className="text-gray-800"
        style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20 }}
      >
        <SelectableText
          content={question.question}
          questionId={question.id}
          section="question"
          savedWords={savedWords}
          onWordClick={onWordClick}
        />
      </div>

      {phase === 'selecting' && currentOption && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentOption.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {/* Option label */}
            <p
              className="text-xs font-semibold mb-2"
              style={{ letterSpacing: '0.06em', color: '#94a3b8' }}
            >
              OPTION {String.fromCharCode(65 + currentOptionIdx)}
            </p>

            {/* Option text card */}
            <div
              className="p-4 rounded-xl border mb-5"
              style={{
                borderColor: '#e2e8f0',
                background: '#ffffff',
                fontSize: 15,
                lineHeight: 1.65,
                color: '#1e293b',
              }}
            >
              <SelectableText
                content={currentOption.text}
                questionId={question.id}
                section="option"
                optionId={currentOption.id}
                savedWords={savedWords}
                onWordClick={onWordClick}
              />
            </div>

            {/* Yes / No buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleYes}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: '#071be9',
                  color: '#ffffff',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a31f0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#071be9'; }}
              >
                This is the answer
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="flex-1 py-3 rounded-xl font-semibold text-sm border transition-all"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  background: '#ffffff',
                }}
                onMouseEnter={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = '#9ca3af';
                  btn.style.background = '#f9fafb';
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = '#d1d5db';
                  btn.style.background = '#ffffff';
                }}
              >
                {isLastOption ? 'Must be this one' : 'Not this one →'}
              </button>
            </div>

            {/* Option progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {options.map((opt, idx) => (
                <div
                  key={opt.id}
                  className="rounded-full transition-all"
                  style={{
                    height: 4,
                    width: idx === currentOptionIdx ? 20 : 14,
                    background: idx < currentOptionIdx
                      ? '#94a3b8'
                      : idx === currentOptionIdx
                        ? '#071be9'
                        : '#e2e8f0',
                  }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {phase === 'confidence' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Confirmed answer display */}
          <div
            className="p-4 rounded-xl border mb-2"
            style={{
              borderColor: '#bfdbfe',
              background: '#eff6ff',
              fontSize: 15,
              lineHeight: 1.65,
              color: '#1e293b',
            }}
          >
            <span
              className="block text-xs font-semibold mb-1"
              style={{ color: '#3b82f6' }}
            >
              Your Answer — Option {chosenOptionLabel}
            </span>
            {chosenOptionText}
          </div>

          <ConfidencePicker
            questionId={question.id}
            confidence={confidenceRecord}
            onConfidence={handleConfidence}
          />
        </motion.div>
      )}
    </div>
  );
}
