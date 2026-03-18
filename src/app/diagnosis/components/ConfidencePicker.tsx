'use client';

import { useState } from 'react';

const CONFIDENCE_LEVELS = [
  { value: 0,   pct: '0%',   label: 'No Idea',     color: '#8B95A1' },
  { value: 25,  pct: '25%',  label: 'Guessing',    color: '#F04452' },
  { value: 50,  pct: '50%',  label: 'Not Sure',    color: '#F59E0B' },
  { value: 75,  pct: '75%',  label: 'Fairly Sure', color: '#3182F6' },
  { value: 100, pct: '100%', label: 'Very Sure',   color: '#03B26C' },
] as const;

interface ConfidencePickerProps {
  questionId: string;
  confidence: Record<string, number>;
  onConfidence: (questionId: string, level: number) => void;
}

export function ConfidencePicker({ questionId, confidence, onConfidence }: ConfidencePickerProps) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  return (
    <div style={{ marginTop: 24 }}>
      <p className="text-xs font-semibold text-gray-400" style={{ letterSpacing: '0.05em', marginBottom: 10 }}>
        CONFIDENCE LEVEL
      </p>
      <div className="test-confidence-row">
        {CONFIDENCE_LEVELS.map(level => {
          const isActive = confidence[questionId] === level.value;
          const isHovered = hoveredLevel === level.value && !isActive;
          return (
            <div key={level.value} className="test-confidence-wrap">
              <button
                type="button"
                onClick={() => onConfidence(questionId, level.value)}
                onMouseEnter={() => setHoveredLevel(level.value)}
                onMouseLeave={() => setHoveredLevel(null)}
                className="test-confidence-btn btn-press"
                style={{
                  borderColor: isActive ? '#3B82F6' : isHovered ? '#9CA3AF' : '#E5E8EB',
                  background: isActive ? '#EFF6FF' : isHovered ? '#F4F5F9' : '#ffffff',
                  color: isActive ? '#3B82F6' : isHovered ? '#6B7280' : '#8B95A1',
                }}
              >
                <span className="test-confidence-dot" style={{ background: isActive ? '#3B82F6' : isHovered ? '#9CA3AF' : '#D1D6DB' }} />
                {level.pct}
              </button>
              <span
                className="test-confidence-tooltip"
                style={{ '--tip-color': '#6B7280', background: '#6B7280' } as React.CSSProperties}
              >
                {level.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
