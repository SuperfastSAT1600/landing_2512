'use client';

import { QuestionStat } from '@/lib/diagnosis-analysis';

interface QuestionDetailModalProps {
  stat: QuestionStat;
  onClose: () => void;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-red-400',
};

export function QuestionDetailModal({ stat, onClose }: QuestionDetailModalProps) {
  const totalAnswers = Object.values(stat.answerDistribution).reduce((a, b) => a + b, 0);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                {stat.section}
              </span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {stat.domain}
              </span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {stat.skill}
              </span>
              <span className={`text-xs font-semibold ${DIFFICULTY_COLOR[stat.difficulty]}`}>
                {stat.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-bold">문항 {stat.questionNumber}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none ml-4 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '응시', value: `${stat.totalAttempts}명` },
            { label: '정답률', value: stat.totalAttempts > 0 ? `${(stat.accuracyRate * 100).toFixed(1)}%` : '-' },
            { label: '평균 자신감', value: stat.avgConfidence > 0 ? `${stat.avgConfidence.toFixed(1)} / 5` : '-' },
            {
              label: '평균 시간',
              value: stat.avgTimeSeconds > 0
                ? `${Math.floor(stat.avgTimeSeconds / 60)}:${String(Math.round(stat.avgTimeSeconds % 60)).padStart(2, '0')}`
                : '-',
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs mb-1">{label}</div>
              <div className="font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {/* Passage */}
        {stat.passage && (
          <div
            className="bg-gray-700/50 rounded-lg p-4 mb-4 text-sm text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: stat.passage }}
          />
        )}

        {/* Question */}
        <p className="font-semibold mb-4">{stat.question}</p>

        {/* Options with distribution */}
        {stat.options.length > 0 && (
          <div className="space-y-2">
            {stat.options.map((option) => {
              const count = stat.answerDistribution[option.id] ?? 0;
              const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
              const isCorrect = option.id === stat.correctAnswer;
              return (
                <div key={option.id} className={`rounded-lg p-3 ${isCorrect ? 'bg-green-900/40 border border-green-700' : 'bg-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">
                      <span className="font-bold mr-2">{option.id}.</span>
                      {option.text}
                      {isCorrect && <span className="ml-2 text-green-400 text-xs">✓ 정답</span>}
                    </span>
                    <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                      {count}명 ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Short answer correct answer */}
        {stat.options.length === 0 && stat.correctAnswer && (
          <div className="bg-green-900/40 border border-green-700 rounded-lg p-3">
            <span className="text-xs text-green-400">정답: </span>
            <span className="font-semibold">{stat.correctAnswer}</span>
          </div>
        )}
      </div>
    </div>
  );
}
