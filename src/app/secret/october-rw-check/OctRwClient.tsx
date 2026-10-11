'use client';

import { useEffect, useState } from 'react';
import { OCTOBER_RW_WORDS } from '@/data/october-rw-words';
import { LoginScreen } from '../october-math-check/LoginScreen';
import { WordCard } from './WordCard';
import { CustomWordSubmit } from './CustomWordSubmit';

const SESSION_KEY = 'oct_rw_ig';
const VOTED_KEY = 'oct_rw_voted';   // "아는 단어야/모르는 단어야"
const SEEN_KEY = 'oct_rw_seen';     // "봤어/못봤어"

type VoteType = 'yes' | 'no';

interface Props {
  initialCounts: Record<string, { yes: number; no: number }>;
}

type Phase = 'words' | 'custom' | 'done';

export function OctRwClient({ initialCounts }: Props) {
  const [username, setUsername] = useState<string | null>(null);

  // Split initialCounts: keys ending in -seen → seenCounts, others → knewCounts
  const [knewCounts, setKnewCounts] = useState<Record<string, { yes: number; no: number }>>(
    () => Object.fromEntries(Object.entries(initialCounts).filter(([k]) => !k.endsWith('-seen')))
  );
  const [seenCounts, setSeenCounts] = useState<Record<string, { yes: number; no: number }>>(
    () => Object.fromEntries(
      Object.entries(initialCounts)
        .filter(([k]) => k.endsWith('-seen'))
        .map(([k, v]) => [k.replace(/-seen$/, ''), v])
    )
  );

  const [voted, setVoted] = useState<Record<string, VoteType>>({});
  const [seenVoted, setSeenVoted] = useState<Record<string, VoteType>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('words');

  useEffect(() => {
    const ig = sessionStorage.getItem(SESSION_KEY);
    if (ig) setUsername(ig);
    try {
      const savedKnew = JSON.parse(localStorage.getItem(VOTED_KEY) ?? '{}');
      const savedSeen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
      setVoted(savedKnew);
      setSeenVoted(savedSeen);
      const firstUnvoted = OCTOBER_RW_WORDS.findIndex(w => !savedKnew[w.id]);
      if (firstUnvoted === -1) setPhase('custom');
      else setCurrentIdx(firstUnvoted);
    } catch {}
  }, []);

  function handleLogin(ig: string) {
    sessionStorage.setItem(SESSION_KEY, ig);
    setUsername(ig);
  }

  async function handleVoteSeen(wordId: string, voteType: VoteType) {
    setSeenCounts(prev => {
      const next = { ...prev };
      if (!next[wordId]) next[wordId] = { yes: 0, no: 0 };
      const prevVote = seenVoted[wordId];
      if (prevVote) next[wordId][prevVote] = Math.max(0, (next[wordId][prevVote] ?? 0) - 1);
      next[wordId][voteType] = (next[wordId][voteType] ?? 0) + 1;
      return next;
    });
    const newSeenVoted = { ...seenVoted, [wordId]: voteType };
    setSeenVoted(newSeenVoted);
    localStorage.setItem(SEEN_KEY, JSON.stringify(newSeenVoted));
    await fetch('/api/secret/rw-check/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: `${wordId}-seen`, instagram_username: username, vote_type: voteType }),
    });
  }

  async function handleVoteKnew(wordId: string, voteType: VoteType) {
    setKnewCounts(prev => {
      const next = { ...prev };
      if (!next[wordId]) next[wordId] = { yes: 0, no: 0 };
      const prevVote = voted[wordId];
      if (prevVote) next[wordId][prevVote] = Math.max(0, (next[wordId][prevVote] ?? 0) - 1);
      next[wordId][voteType] = (next[wordId][voteType] ?? 0) + 1;
      return next;
    });
    const newVoted = { ...voted, [wordId]: voteType };
    setVoted(newVoted);
    localStorage.setItem(VOTED_KEY, JSON.stringify(newVoted));
    await fetch('/api/secret/rw-check/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId, instagram_username: username, vote_type: voteType }),
    });
  }

  function handleNext() {
    const nextIdx = OCTOBER_RW_WORDS.findIndex((w, i) => i > currentIdx && !voted[w.id]);
    if (nextIdx === -1) {
      const anyUnvoted = OCTOBER_RW_WORDS.findIndex(w => !voted[w.id]);
      if (anyUnvoted === -1) setPhase('custom');
      else setCurrentIdx(anyUnvoted);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  function handlePrev() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  if (!username) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        title="10월 RW 단어 체크"
        subtitle="SAT에 나온 단어들을 얼마나 알고 있었는지 확인해 보세요"
      />
    );
  }

  if (phase === 'custom') {
    return <CustomWordSubmit username={username} onDone={() => setPhase('done')} />;
  }

  if (phase === 'done') {
    return (
      <DoneScreen
        counts={knewCounts}
        username={username}
        onReview={() => { setCurrentIdx(0); setPhase('words'); }}
      />
    );
  }

  const word = OCTOBER_RW_WORDS[currentIdx];
  const votedCount = Object.keys(voted).length;
  const total = OCTOBER_RW_WORDS.length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col pt-14">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">@{username}</span>
        <span className="text-xs text-gray-500">{votedCount} / {total} 완료</span>
      </header>

      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${(votedCount / total) * 100}%` }}
        />
      </div>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 pb-72">
        <WordCard
          word={word}
          index={currentIdx}
          total={total}
          knewCounts={knewCounts[word.id] ?? { yes: 0, no: 0 }}
          seenCounts={seenCounts[word.id] ?? { yes: 0, no: 0 }}
          userVoteKnew={voted[word.id] ?? null}
          userVoteSeen={seenVoted[word.id] ?? null}
          onVoteKnew={handleVoteKnew}
          onVoteSeen={handleVoteSeen}
          onNext={voted[word.id] ? handleNext : undefined}
          onPrev={currentIdx > 0 ? handlePrev : undefined}
        />
      </main>
    </div>
  );
}

function DoneScreen({
  counts,
  username,
  onReview,
}: {
  counts: Record<string, { yes: number; no: number }>;
  username: string;
  onReview: () => void;
}) {
  const total = OCTOBER_RW_WORDS.length;
  const totalKnew = OCTOBER_RW_WORDS.reduce((s, w) => s + (counts[w.id]?.yes ?? 0), 0);
  const totalDidntKnow = OCTOBER_RW_WORDS.reduce((s, w) => s + (counts[w.id]?.no ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-1">응답 완료!</h1>
        <p className="text-gray-400 text-sm">@{username}, 총 {total}개 단어 모두 응답했습니다.</p>
      </div>

      <div className="w-full max-w-sm bg-white/5 rounded-2xl p-6 mb-6 space-y-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-4">전체 응답 현황</p>
        {[
          { label: '아는 단어였어요', value: totalKnew, color: 'text-green-400' },
          { label: '모르는 단어였어요', value: totalDidntKnow, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-sm text-gray-300">{label}</span>
            <span className={`font-bold ${color}`}>{value}건</span>
          </div>
        ))}
      </div>

      <button
        onClick={onReview}
        className="text-sm text-gray-500 hover:text-gray-300 underline"
      >
        처음부터 다시 보기
      </button>
    </div>
  );
}
