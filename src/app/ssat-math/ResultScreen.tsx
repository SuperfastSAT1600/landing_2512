'use client';

const COMPLETED_KEY = 'ssat_math_completed_v1';

interface GradedDetail {
  answer: string;
  correct: string;
  is_correct: boolean;
}

interface Props {
  result: { score: number; total: number; graded_detail: Record<string, GradedDetail> };
  setNumber: number;
  elapsedSeconds: number;
  questions: { id: string; question_number: number }[];
  onReturnToSelect: () => void;
}

function markCompleted(setNumber: number) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(sessionStorage.getItem(COMPLETED_KEY) ?? '[]') as number[];
    if (!existing.includes(setNumber)) {
      sessionStorage.setItem(COMPLETED_KEY, JSON.stringify([...existing, setNumber]));
    }
  } catch { /* ignore */ }
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function ResultScreen({ result, setNumber, elapsedSeconds, questions, onReturnToSelect }: Props) {
  markCompleted(setNumber);

  const { score, total, graded_detail } = result;
  const pct = Math.round((score / total) * 100);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  const scoreColor =
    pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Set {setNumber} 결과</h1>
          <div className={`text-7xl font-bold tabular-nums mt-6 mb-2 ${scoreColor}`}>
            {score}<span className="text-3xl text-gray-500">/{total}</span>
          </div>
          <div className="text-gray-400 text-sm">{pct}% 정답 · 소요 시간: {pad(minutes)}:{pad(seconds)}</div>
        </div>

        {/* Question grid */}
        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">문제별 결과</h2>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q) => {
              const detail = graded_detail[q.id];
              const isCorrect = detail?.is_correct;
              return (
                <div
                  key={q.id}
                  className={`flex flex-col items-center justify-center rounded-xl py-3 text-sm font-bold ${
                    isCorrect
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : detail
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-white/5 text-gray-500 border border-white/5'
                  }`}
                >
                  <span className="text-xs text-gray-500 mb-0.5">Q{q.question_number}</span>
                  <span>{isCorrect ? 'O' : detail ? 'X' : '-'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onReturnToSelect}
          className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold text-lg transition-all"
        >
          다른 세트 풀기
        </button>
      </div>
    </div>
  );
}
