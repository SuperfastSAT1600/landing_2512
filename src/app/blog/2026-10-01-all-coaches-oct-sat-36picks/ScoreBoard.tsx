'use client';

import type { Coach } from './data';

interface Props {
  coaches: Coach[];
  answers: Record<string, string>;
}

function getStatus(
  problem: { id: string; correctAnswer: string; isGridIn: boolean },
  answers: Record<string, string>
): 'correct' | 'incorrect' | 'unanswered' {
  const answer = answers[problem.id];
  if (!answer || answer.trim() === '') return 'unanswered';
  if (problem.isGridIn) {
    return answer.trim() === problem.correctAnswer.trim() ? 'correct' : 'incorrect';
  }
  return answer.toUpperCase() === problem.correctAnswer.toUpperCase() ? 'correct' : 'incorrect';
}

export function ScoreBoard({ coaches, answers }: Props) {
  let totalCorrect = 0;
  const total = coaches.reduce((sum, c) => sum + c.problems.length, 0);

  const coachStats = coaches.map((coach) => {
    const statuses = coach.problems.map((p) => getStatus(p, answers));
    const correct = statuses.filter((s) => s === 'correct').length;
    totalCorrect += correct;
    return { coach, statuses, correct };
  });

  const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6">채점 결과</h2>

      {/* Total score */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900">
            {totalCorrect}
            <span className="text-3xl text-gray-400 font-normal"> / {total}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{pct}% 정답</div>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>
      </div>

      {/* Per-coach rows */}
      <div className="space-y-4">
        {coachStats.map(({ coach, statuses, correct }) => (
          <div key={coach.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className="w-24 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800">{coach.name}</p>
              <p className="text-xs text-gray-500">
                {correct}/{coach.problems.length}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map((status, i) => (
                <div
                  key={i}
                  title={`${coach.name} 문항 ${i + 1}`}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    status === 'correct'
                      ? 'bg-green-100 text-green-700'
                      : status === 'incorrect'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {status === 'correct' ? '✓' : status === 'incorrect' ? '✗' : '○'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">✓</span>
          정답
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">✗</span>
          오답
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs">○</span>
          미답
        </span>
      </div>
    </div>
  );
}
