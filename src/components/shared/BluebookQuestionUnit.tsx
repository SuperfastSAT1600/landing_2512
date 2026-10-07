'use client';

import React from 'react';

export interface BluebookMCQOption {
  label: string;
  text: React.ReactNode;
}

interface BluebookQuestionUnitProps {
  questionNumber: number;
  question: React.ReactNode;

  /** MCQ options */
  options?: BluebookMCQOption[];
  selectedAnswer?: string;
  onSelect?: (label: string) => void;
  disabled?: boolean;

  /** Immediate feedback (practice mode) */
  feedback?: { selectedLabel: string; correctLabel: string } | null;

  /** Cross-out (optional) */
  crossedOut?: Set<string>;
  onCrossOut?: (label: string) => void;

  /** Short-answer (SPR) */
  shortAnswer?: string;
  onShortAnswer?: (value: string) => void;
  shortAnswerPlaceholder?: string;
  shortAnswerFeedback?: { isCorrect: boolean; correctAnswer?: string } | null;

  /** Metadata badges */
  skill?: string;
  difficulty?: string;
  difficultyColor?: string;

  /** Extra content rendered after options (rationale, stats, confidence picker, etc.) */
  children?: React.ReactNode;
}

export function BluebookQuestionUnit({
  questionNumber,
  question,
  options,
  selectedAnswer,
  onSelect,
  disabled,
  feedback,
  crossedOut,
  onCrossOut,
  shortAnswer,
  onShortAnswer,
  shortAnswerPlaceholder = 'Enter answer',
  shortAnswerFeedback,
  skill,
  difficulty,
  difficultyColor = '#64748b',
  children,
}: BluebookQuestionUnitProps) {
  return (
    <>
      {/* Question number + metadata badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#1e293b',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {questionNumber}
        </span>
        {skill && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              background: '#f1f5f9',
              color: '#64748b',
            }}
          >
            {skill}
          </span>
        )}
        {difficulty && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              background: '#f8fafc',
              color: difficultyColor,
            }}
          >
            {difficulty}
          </span>
        )}
      </div>

      {/* Question text */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.7,
          marginBottom: 20,
          color: '#1e293b',
        }}
      >
        {question}
      </div>

      {/* MCQ options */}
      {options && options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt.label;
            const isCrossed = crossedOut?.has(opt.label);

            const fb = feedback;
            const isCorrectOpt = fb ? opt.label === fb.correctLabel : false;
            const isWrongOpt = fb ? opt.label === fb.selectedLabel && opt.label !== fb.correctLabel : false;

            const optionStyle: React.CSSProperties = fb
              ? isCorrectOpt
                ? { borderColor: '#22c55e', background: '#f0fdf4' }
                : isWrongOpt
                ? { borderColor: '#ef4444', background: '#fef2f2' }
                : {}
              : {};

            const labelStyle: React.CSSProperties = fb
              ? isCorrectOpt
                ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' }
                : isWrongOpt
                ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                : {}
              : {};

            const optClass = [
              'bluebook-option',
              'btn-press',
              isSelected && !fb ? 'selected' : '',
              isCrossed && !isSelected ? 'crossedout' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={opt.label} className="flex items-center gap-2">
                {onCrossOut && !fb && (
                  <button
                    type="button"
                    onClick={() => onCrossOut(opt.label)}
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
                  onClick={() => !disabled && !fb && onSelect?.(opt.label)}
                  disabled={!!disabled || !!fb}
                  className={optClass}
                  style={optionStyle}
                >
                  <span className="bluebook-option-label" style={labelStyle}>
                    {opt.label}
                  </span>
                  <span className="bluebook-option-text">{opt.text}</span>
                  {fb && isCorrectOpt && (
                    <span style={{ fontSize: 18, color: '#22c55e', flexShrink: 0 }}>✓</span>
                  )}
                  {fb && isWrongOpt && (
                    <span style={{ fontSize: 18, color: '#ef4444', flexShrink: 0 }}>✗</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Short-answer input */}
      {onShortAnswer !== undefined && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            value={shortAnswer ?? ''}
            onChange={(e) => onShortAnswer(e.target.value)}
            placeholder={shortAnswerPlaceholder}
            disabled={!!shortAnswerFeedback}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${
                shortAnswerFeedback?.isCorrect
                  ? '#22c55e'
                  : shortAnswerFeedback?.isCorrect === false
                  ? '#ef4444'
                  : '#e5e7eb'
              }`,
              background: shortAnswerFeedback?.isCorrect
                ? '#f0fdf4'
                : shortAnswerFeedback?.isCorrect === false
                ? '#fef2f2'
                : '#f8fafc',
              color: '#1e293b',
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Short-answer feedback */}
      {shortAnswerFeedback && (
        <div
          style={{
            padding: '14px 16px',
            background: shortAnswerFeedback.isCorrect ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${shortAnswerFeedback.isCorrect ? '#86efac' : '#fca5a5'}`,
            borderRadius: 10,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: shortAnswerFeedback.isCorrect ? '#15803d' : '#dc2626',
              marginBottom: shortAnswerFeedback.correctAnswer ? 4 : 0,
            }}
          >
            {shortAnswerFeedback.isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </p>
          {shortAnswerFeedback.correctAnswer && !shortAnswerFeedback.isCorrect && (
            <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
              Answer: <strong>{shortAnswerFeedback.correctAnswer}</strong>
            </p>
          )}
        </div>
      )}

      {children}
    </>
  );
}
