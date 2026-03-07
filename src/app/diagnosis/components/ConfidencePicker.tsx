'use client';

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
  return (
    <div style={{ marginTop: 24 }}>
      <p className="text-xs font-semibold text-gray-400" style={{ letterSpacing: '0.05em', marginBottom: 10 }}>
        CONFIDENCE LEVEL
      </p>
      <div className="test-confidence-row">
        {CONFIDENCE_LEVELS.map(level => {
          const isActive = confidence[questionId] === level.value;
          return (
            <div key={level.value} className="test-confidence-wrap">
              <button
                type="button"
                onClick={() => onConfidence(questionId, level.value)}
                className="test-confidence-btn btn-press"
                style={{
                  borderColor: isActive ? level.color : '#E5E8EB',
                  background: isActive ? `${level.color}15` : '#ffffff',
                  color: isActive ? level.color : '#8B95A1',
                }}
              >
                <span className="test-confidence-dot" style={{ background: isActive ? level.color : '#D1D6DB' }} />
                {level.pct}
              </button>
              <span
                className="test-confidence-tooltip"
                style={{ '--tip-color': level.color, background: level.color } as React.CSSProperties}
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
