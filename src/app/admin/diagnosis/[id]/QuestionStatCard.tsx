'use client';

import { QuestionStat } from '@/lib/diagnosis-analysis';

interface QuestionStatCardProps {
  questionId: string;
  studentAnswer: string | undefined;
  confidenceValue: number | undefined;
  timeSeconds: number;
  isFlagged: boolean;
  stat: QuestionStat | null;
}

const CONFIDENCE_MAP: Record<number, { label: string; color: string }> = {
  0:   { label: 'No Idea',     color: '#8B95A1' },
  25:  { label: 'Guessing',    color: '#F04452' },
  50:  { label: 'Not Sure',    color: '#F59E0B' },
  75:  { label: 'Fairly Sure', color: '#3182F6' },
  100: { label: 'Very Sure',   color: '#03B26C' },
};

const DIFFICULTY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  Easy:   { label: 'Easy',   color: '#03B26C', bg: '#03B26C20' },
  Medium: { label: 'Medium', color: '#F59E0B', bg: '#F59E0B20' },
  Hard:   { label: 'Hard',   color: '#F04452', bg: '#F0445220' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}초`;
  return `${mins}분 ${secs}초`;
}

export default function QuestionStatCard({
  questionId,
  studentAnswer,
  confidenceValue,
  timeSeconds,
  isFlagged,
  stat,
}: QuestionStatCardProps) {
  const conf = confidenceValue !== undefined && confidenceValue !== null
    ? (CONFIDENCE_MAP[confidenceValue] ?? { label: `${confidenceValue}%`, color: '#8B95A1' })
    : null;

  const isCorrect = stat && studentAnswer
    ? studentAnswer === stat.correctAnswer
    : null;

  const isOverTime = stat && stat.avgTimeSeconds > 0
    ? timeSeconds > stat.avgTimeSeconds * 3
    : false;

  const diffStyle = stat ? (DIFFICULTY_STYLE[stat.difficulty] ?? null) : null;
  const accuracyPct = stat ? Math.round(stat.accuracyRate * 100) : null;

  const questionLabel = stat ? `문제 ${stat.questionNumber}` : `문제 ${questionId.slice(0, 8)}…`;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{questionLabel}</h3>
            {isCorrect !== null && (
              <span
                className="text-sm font-semibold px-2 py-0.5 rounded-full"
                style={
                  isCorrect
                    ? { background: '#03B26C20', color: '#03B26C' }
                    : { background: '#F0445220', color: '#F04452' }
                }
              >
                {isCorrect ? '정답' : '오답'}
              </span>
            )}
          </div>
          {isFlagged && (
            <span className="text-yellow-400 text-sm">⭐ 표시됨</span>
          )}
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-400 mb-0.5">소요 시간</div>
          <div className="font-semibold">{formatTime(timeSeconds)}</div>
          {isOverTime && (
            <span className="text-yellow-400 text-xs font-semibold">⚠ 시간 초과</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Question metadata */}
        {stat && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-gray-300">{stat.domain} · {stat.skill}</span>
            {diffStyle && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: diffStyle.bg, color: diffStyle.color }}
              >
                {diffStyle.label}
              </span>
            )}
          </div>
        )}

        {/* Student answer */}
        <div>
          <span className="text-gray-400 block mb-1 text-sm">선택 답변</span>
          <span className="font-semibold">{studentAnswer || '미답변'}</span>
          {stat && (
            <span className="text-gray-500 text-sm ml-2">
              (정답: {stat.correctAnswer})
            </span>
          )}
        </div>

        {/* Confidence */}
        <div>
          <span className="text-gray-400 block mb-1 text-sm">Confidence</span>
          {conf ? (
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${conf.color}20`, color: conf.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
              {conf.label} · {confidenceValue}%
            </span>
          ) : (
            <span className="text-gray-500 text-sm">N/A</span>
          )}
        </div>

        {/* Stats comparison */}
        {stat && (
          <div className="border-t border-gray-700 pt-3 mt-1 flex gap-6 text-sm flex-wrap">
            <div>
              <span className="text-gray-400 block mb-0.5">전체 정답률</span>
              <span className="font-semibold text-white">{accuracyPct}%</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">평균 풀이 시간</span>
              <span className="font-semibold text-white">
                평균 {formatTime(Math.round(stat.avgTimeSeconds))} | 학생 {formatTime(timeSeconds)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
