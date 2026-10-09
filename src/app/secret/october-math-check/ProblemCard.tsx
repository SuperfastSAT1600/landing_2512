'use client';

import { useEffect, useState } from 'react';
import { MathProblem, VoteType } from '@/data/october-math-problems';
import { CommentSection } from './CommentSection';
import { MathHtmlBlock } from '@/app/mathweb/MathHtmlBlock';

interface Props {
  problem: MathProblem;
  index: number;
  total: number;
  counts: Record<string, number>;
  userVote: VoteType | null;
  username: string;
  onVote: (problemId: string, voteType: VoteType) => void;
  onNext?: () => void;
}

const VOTE_OPTIONS: { type: VoteType; label: string; emoji: string; color: string; activeColor: string }[] = [
  { type: 'yes', label: '이 문제 나왔어요', emoji: '✅', color: 'border-white/10 hover:border-green-500/50 hover:bg-green-500/5', activeColor: 'border-green-500 bg-green-500/10 text-green-300' },
  { type: 'similar', label: '비슷한 거 나왔어요', emoji: '🔁', color: 'border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/5', activeColor: 'border-yellow-500 bg-yellow-500/10 text-yellow-300' },
  { type: 'no', label: '안 나왔어요', emoji: '❌', color: 'border-white/10 hover:border-gray-500/50 hover:bg-gray-500/5', activeColor: 'border-gray-500 bg-gray-500/10 text-gray-300' },
];

export function ProblemCard({ problem, index, total, counts, userVote, onVote, onNext }: Props) {
  const [voting, setVoting] = useState(false);

  useEffect(() => { setVoting(false); }, [problem.id]);

  async function handleVote(type: VoteType) {
    if (voting) return;
    setVoting(true);
    await onVote(problem.id, type);
  }

  const totalVotes = (counts.yes ?? 0) + (counts.similar ?? 0) + (counts.no ?? 0);

  return (
    <div className="space-y-6">
      {/* 문제 번호 */}
      <span className="text-xs text-gray-500 font-mono">{index + 1} / {total}</span>

      {/* 문제 설명 */}
      <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-200 leading-relaxed math-problem">
        <MathHtmlBlock html={problem.description} />
      </div>

      {/* 투표 버튼 */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          시험에 나왔나요?
          {totalVotes > 0 && <span className="ml-1 text-gray-600">({totalVotes}명 응답)</span>}
        </p>
        {VOTE_OPTIONS.map(opt => {
          const count = counts[opt.type] ?? 0;
          const isActive = userVote === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => handleVote(opt.type)}
              disabled={voting}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
                isActive ? opt.activeColor : `text-gray-300 bg-white/3 ${opt.color}`
              }`}
            >
              <span>{opt.emoji} {opt.label}</span>
              <span className={`text-xs font-mono ${isActive ? '' : 'text-gray-600'}`}>
                {count > 0 ? count : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* 투표 후 다음 버튼 */}
      {userVote && onNext && (
        <button
          onClick={onNext}
          className="w-full py-3 text-sm font-semibold text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors"
        >
          다음 문제 →
        </button>
      )}

      {/* 코멘트 섹션 */}
      <CommentSection problemId={problem.id} />
    </div>
  );
}
