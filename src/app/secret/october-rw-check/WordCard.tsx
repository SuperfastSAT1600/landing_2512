'use client';

import { useEffect, useState } from 'react';
import { RwWord, WordVoteType } from '@/data/october-rw-words';

interface Props {
  word: RwWord;
  index: number;
  total: number;
  counts: { knew: number; didnt_know: number };
  userVote: WordVoteType | null;
  onVote: (wordId: string, voteType: WordVoteType) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const POS_LABEL: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
};

export function WordCard({ word, index, total, counts, userVote, onVote, onNext, onPrev }: Props) {
  const [voting, setVoting] = useState(false);

  useEffect(() => { setVoting(false); }, [word.id]);

  async function handleVote(type: WordVoteType) {
    if (voting) return;
    setVoting(true);
    await onVote(word.id, type);
  }

  const totalVotes = (counts.knew ?? 0) + (counts.didnt_know ?? 0);
  const knewPct = totalVotes > 0 ? Math.round((counts.knew / totalVotes) * 100) : null;

  return (
    <div className="space-y-6">
      {/* 단어 번호 */}
      <span className="text-xs text-gray-500 font-mono">{index + 1} / {total}</span>

      {/* 단어 카드 */}
      <div className="bg-white/5 rounded-2xl p-8 text-center space-y-3">
        <p className="text-xs text-gray-600 uppercase tracking-widest font-mono">
          {POS_LABEL[word.pos] ?? word.pos}
        </p>
        <h2 className="text-4xl font-bold text-white tracking-tight">{word.word}</h2>
        <p className="text-gray-300 text-base leading-relaxed">{word.definition_en}</p>
        <p className="text-indigo-300 text-sm font-medium">{word.definition_ko}</p>

        {/* 투표 후 통계 */}
        {userVote && knewPct !== null && (
          <div className="pt-4 border-t border-white/10 space-y-1.5">
            <p className="text-xs text-gray-600">
              {totalVotes}명 응답 · 알고 있었다 <span className="text-green-400 font-bold">{knewPct}%</span>
            </p>
            <div className="flex h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${knewPct}%` }} />
              <div className="bg-red-500/60 h-full flex-1 transition-all duration-700" />
            </div>
          </div>
        )}
      </div>

      {/* 투표 버튼 */}
      {!userVote ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleVote('knew')}
            disabled={voting}
            className="py-4 rounded-2xl border border-green-500/30 text-green-400 font-semibold text-sm hover:bg-green-500/10 transition-all disabled:opacity-50 active:scale-95"
          >
            ✓ 알고 있었어
          </button>
          <button
            onClick={() => handleVote('didnt_know')}
            disabled={voting}
            className="py-4 rounded-2xl border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-all disabled:opacity-50 active:scale-95"
          >
            ✗ 몰랐어
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleVote('knew')}
            disabled={voting}
            className={`py-4 rounded-2xl border font-semibold text-sm transition-all disabled:opacity-50 ${
              userVote === 'knew'
                ? 'border-green-500 bg-green-500/15 text-green-300'
                : 'border-white/10 text-gray-600'
            }`}
          >
            ✓ 알고 있었어
          </button>
          <button
            onClick={() => handleVote('didnt_know')}
            disabled={voting}
            className={`py-4 rounded-2xl border font-semibold text-sm transition-all disabled:opacity-50 ${
              userVote === 'didnt_know'
                ? 'border-red-500/60 bg-red-500/15 text-red-300'
                : 'border-white/10 text-gray-600'
            }`}
          >
            ✗ 몰랐어
          </button>
        </div>
      )}

      {/* 이전 / 다음 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={!onPrev}
          className={`flex-1 py-3 text-sm font-semibold border rounded-xl transition-colors ${
            onPrev
              ? 'text-gray-500 border-white/10 hover:bg-white/5'
              : 'text-gray-700 border-white/5 cursor-not-allowed opacity-30'
          }`}
        >
          ← 이전 단어
        </button>
        {userVote && onNext && (
          <button
            onClick={onNext}
            className="flex-1 py-3 text-sm font-semibold text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors"
          >
            다음 단어 →
          </button>
        )}
      </div>
    </div>
  );
}
