'use client';

import { useEffect, useState } from 'react';
import { RwWord } from '@/data/october-rw-words';

type VoteType = 'yes' | 'no';

interface Props {
  word: RwWord;
  index: number;
  total: number;
  knewCounts: { yes: number; no: number };
  seenCounts: { yes: number; no: number };
  userVoteKnew: VoteType | null;
  userVoteSeen: VoteType | null;
  onVoteKnew: (wordId: string, voteType: VoteType) => void;
  onVoteSeen: (wordId: string, voteType: VoteType) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const POS_LABEL: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  prefix: 'prefix',
};

export function WordCard({
  word, index, total,
  knewCounts, seenCounts,
  userVoteKnew, userVoteSeen,
  onVoteKnew, onVoteSeen,
  onNext, onPrev,
}: Props) {
  const [voting, setVoting] = useState(false);

  useEffect(() => { setVoting(false); }, [word.id]);

  async function handleVoteSeen(type: VoteType) {
    if (voting) return;
    setVoting(true);
    await onVoteSeen(word.id, type);
    setVoting(false);
  }

  async function handleVoteKnew(type: VoteType) {
    if (voting) return;
    setVoting(true);
    await onVoteKnew(word.id, type);
    setVoting(false);
  }

  const totalSeen = (seenCounts.yes ?? 0) + (seenCounts.no ?? 0);
  const seenPct = totalSeen > 0 ? Math.round((seenCounts.yes / totalSeen) * 100) : null;

  const totalKnew = (knewCounts.yes ?? 0) + (knewCounts.no ?? 0);
  const knewPct = totalKnew > 0 ? Math.round((knewCounts.yes / totalKnew) * 100) : null;

  return (
    <div className="space-y-6">
      <span className="text-xs text-gray-500 font-mono">{index + 1} / {total}</span>

      {/* 단어 카드 */}
      <div className="bg-white/5 rounded-2xl p-8 text-center space-y-3">
        <p className="text-xs text-gray-600 uppercase tracking-widest font-mono">
          {POS_LABEL[word.pos] ?? word.pos}
        </p>
        <h2 className="text-4xl font-bold text-white tracking-tight">{word.word}</h2>
        {word.forms && (
          <p className="text-xs text-gray-600 font-mono">→ {word.forms}</p>
        )}
        <p className="text-gray-300 text-base leading-relaxed">{word.definition_en}</p>
        <p className="text-indigo-300 text-sm font-medium">{word.definition_ko}</p>

        {/* 두 번 모두 투표 완료 후 통계 */}
        {userVoteKnew && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            {seenPct !== null && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  시험에서 봤어 <span className="text-blue-400 font-bold">{seenPct}%</span>
                  <span className="text-gray-700 ml-1">({totalSeen}명)</span>
                </p>
                <div className="flex h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${seenPct}%` }} />
                </div>
              </div>
            )}
            {knewPct !== null && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  아는 단어야 <span className="text-green-400 font-bold">{knewPct}%</span>
                  <span className="text-gray-700 ml-1">({totalKnew}명)</span>
                </p>
                <div className="flex h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${knewPct}%` }} />
                  <div className="bg-red-500/60 h-full flex-1 transition-all duration-700" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 1: 봤어 / 못봤어 */}
      {!userVoteSeen && (
        <>
          <p className="text-center text-sm text-gray-400">이 단어 시험에서 봤어?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVoteSeen('yes')}
              disabled={voting}
              className="py-4 rounded-2xl border border-blue-500/30 text-blue-400 font-semibold text-sm hover:bg-blue-500/10 transition-all disabled:opacity-50 active:scale-95"
            >
              👀 봤어
            </button>
            <button
              onClick={() => handleVoteSeen('no')}
              disabled={voting}
              className="py-4 rounded-2xl border border-white/10 text-gray-500 font-semibold text-sm hover:bg-white/5 transition-all disabled:opacity-50 active:scale-95"
            >
              못봤어
            </button>
          </div>
        </>
      )}

      {/* Step 2: 아는 단어야 / 모르는 단어야 */}
      {userVoteSeen && !userVoteKnew && (
        <>
          <p className="text-center text-sm text-gray-400">
            {userVoteSeen === 'yes' ? '그럼 이 단어 알아?' : '이 단어 뜻은 알아?'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVoteKnew('yes')}
              disabled={voting}
              className="py-4 rounded-2xl border border-green-500/30 text-green-400 font-semibold text-sm hover:bg-green-500/10 transition-all disabled:opacity-50 active:scale-95"
            >
              ✓ 아는 단어야
            </button>
            <button
              onClick={() => handleVoteKnew('no')}
              disabled={voting}
              className="py-4 rounded-2xl border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-all disabled:opacity-50 active:scale-95"
            >
              ✗ 모르는 단어야
            </button>
          </div>
        </>
      )}

      {/* 완료 후: 선택 결과 표시 */}
      {userVoteKnew && (
        <div className="flex gap-3">
          <div className={`flex-1 py-3 rounded-2xl border text-center text-sm font-semibold ${
            userVoteSeen === 'yes'
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
              : 'border-white/10 text-gray-600'
          }`}>
            {userVoteSeen === 'yes' ? '👀 봤어' : '못봤어'}
          </div>
          <div className={`flex-1 py-3 rounded-2xl border text-center text-sm font-semibold ${
            userVoteKnew === 'yes'
              ? 'border-green-500/40 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            {userVoteKnew === 'yes' ? '✓ 아는 단어야' : '✗ 모르는 단어야'}
          </div>
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
        {userVoteKnew && onNext && (
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
