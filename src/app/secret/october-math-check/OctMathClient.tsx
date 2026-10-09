'use client';

import { useEffect, useState } from 'react';
import { OCTOBER_MATH_PROBLEMS, VoteType } from '@/data/october-math-problems';
import { NOVEMBER_MATH_PROBLEMS } from '@/data/november-math-problems';

const ALL_PROBLEMS = [...OCTOBER_MATH_PROBLEMS, ...NOVEMBER_MATH_PROBLEMS];
import { LoginScreen } from './LoginScreen';
import { ProblemCard } from './ProblemCard';

const SESSION_KEY = 'oct_math_ig';
const VOTED_KEY = 'oct_math_voted';

interface Props {
  initialCounts: Record<string, Record<string, number>>;
}

export function OctMathClient({ initialCounts }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  const [counts, setCounts] = useState(initialCounts);
  const [voted, setVoted] = useState<Record<string, VoteType>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ig = sessionStorage.getItem(SESSION_KEY);
    if (ig) setUsername(ig);
    try {
      const saved = JSON.parse(localStorage.getItem(VOTED_KEY) ?? '{}');
      setVoted(saved);
      // 첫 미투표 문제로 이동
      const firstUnvoted = ALL_PROBLEMS.findIndex(p => !saved[p.id]);
      if (firstUnvoted === -1) setDone(true);
      else setCurrentIdx(firstUnvoted);
    } catch {}
  }, []);

  function handleLogin(ig: string) {
    sessionStorage.setItem(SESSION_KEY, ig);
    setUsername(ig);
  }

  async function handleVote(problemId: string, voteType: VoteType) {
    // Optimistic update
    setCounts(prev => {
      const next = { ...prev };
      if (!next[problemId]) next[problemId] = { yes: 0, similar: 0, no: 0 };
      const prevVote = voted[problemId];
      if (prevVote) next[problemId][prevVote] = Math.max(0, (next[problemId][prevVote] ?? 0) - 1);
      next[problemId][voteType] = (next[problemId][voteType] ?? 0) + 1;
      return next;
    });

    const newVoted = { ...voted, [problemId]: voteType };
    setVoted(newVoted);
    localStorage.setItem(VOTED_KEY, JSON.stringify(newVoted));

    await fetch('/api/secret/math-check/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_id: problemId, instagram_username: username, vote_type: voteType }),
    });
  }

  function handleNext() {
    const nextIdx = ALL_PROBLEMS.findIndex((p, i) => i > currentIdx && !voted[p.id]);
    if (nextIdx === -1) {
      const anyUnvoted = ALL_PROBLEMS.findIndex(p => !voted[p.id]);
      if (anyUnvoted === -1) setDone(true);
      else setCurrentIdx(anyUnvoted);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  if (!username) return <LoginScreen onLogin={handleLogin} />;

  if (done) return <DoneScreen counts={counts} username={username} onReview={() => { setCurrentIdx(0); setDone(false); }} />;

  const problem = ALL_PROBLEMS[currentIdx];
  const votedCount = Object.keys(voted).length;
  const total = ALL_PROBLEMS.length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col pt-14">
      {/* 헤더 */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">@{username}</span>
        <span className="text-xs text-gray-500">{votedCount} / {total} 완료</span>
      </header>

      {/* 진행 바 */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${(votedCount / total) * 100}%` }}
        />
      </div>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        <ProblemCard
          problem={problem}
          index={currentIdx}
          total={total}
          counts={counts[problem.id] ?? { yes: 0, similar: 0, no: 0 }}
          userVote={voted[problem.id] ?? null}
          username={username}
          onVote={handleVote}
          onNext={voted[problem.id] ? handleNext : undefined}
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
  counts: Record<string, Record<string, number>>;
  username: string;
  onReview: () => void;
}) {
  const total = ALL_PROBLEMS.length;
  const totalYes = ALL_PROBLEMS.reduce((s, p) => s + (counts[p.id]?.yes ?? 0), 0);
  const totalSimilar = ALL_PROBLEMS.reduce((s, p) => s + (counts[p.id]?.similar ?? 0), 0);
  const totalNo = ALL_PROBLEMS.reduce((s, p) => s + (counts[p.id]?.no ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-1">응답 완료!</h1>
        <p className="text-gray-400 text-sm">@{username}, 총 {total}문제 모두 응답했습니다.</p>
      </div>

      <div className="w-full max-w-sm bg-white/5 rounded-2xl p-6 mb-6 space-y-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-4">전체 응답 현황</p>
        {[
          { label: '이 문제 나왔어요', value: totalYes, color: 'text-green-400' },
          { label: '비슷한 거 나왔어요', value: totalSimilar, color: 'text-yellow-400' },
          { label: '안 나왔어요', value: totalNo, color: 'text-gray-400' },
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
