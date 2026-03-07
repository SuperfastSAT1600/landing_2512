'use client';

interface QuestionNavGridProps {
  questions: Array<{ id: string }>;
  currentIndex: number;
  answers: Record<string, string>;
  flagged: Set<string>;
  onNavigate: (index: number) => void;
}

export function QuestionNavGrid({
  questions,
  currentIndex,
  answers,
  flagged,
  onNavigate,
}: QuestionNavGridProps) {
  return (
    <div>
      <div className="test-nav-grid">
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = !!answers[q.id];
          const isFlagged = flagged.has(q.id);
          const classes = [
            'test-nav-dot',
            isCurrent ? 'current' : '',
            !isCurrent && isAnswered ? 'answered' : '',
            isFlagged ? 'flagged' : '',
          ].filter(Boolean).join(' ');
          return (
            <button key={q.id} className={classes} onClick={() => onNavigate(i)}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="test-nav-dot answered" style={{ width: 12, height: 12, fontSize: 0 }} />
          Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="test-nav-dot flagged" style={{ width: 12, height: 12, fontSize: 0 }} />
          Flagged
        </span>
        <span className="flex items-center gap-1">
          <span className="test-nav-dot" style={{ width: 12, height: 12, fontSize: 0 }} />
          Unanswered
        </span>
      </div>
    </div>
  );
}
