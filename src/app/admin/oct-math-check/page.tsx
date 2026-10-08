'use client';

import { useEffect, useState } from 'react';
import { OCTOBER_MATH_PROBLEMS } from '@/data/october-math-problems';
import { RefreshCw, Users, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface StatsData {
  participants: number;
  voteCounts: Record<string, { yes: number; similar: number; no: number }>;
  commentsByProblem: Record<string, { comment: string; created_at: string }[]>;
  recentUsers: { username: string; created_at: string }[];
}

export default function OctMathCheckAdminPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [showUsers, setShowUsers] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/oct-math-check', {
      headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const toggleComments = (id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-red-400">데이터를 불러오지 못했습니다.</div>;

  const totalVotes = Object.values(data.voteCounts).reduce(
    (s, c) => s + c.yes + c.similar + c.no, 0
  );
  const totalComments = Object.values(data.commentsByProblem).reduce(
    (s, arr) => s + arr.length, 0
  );

  return (
    <div className="p-8 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">10월 SAT 수학 체크</h2>
          <p className="text-gray-500 text-sm mt-1">/secret/october-math-check</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="참여자" value={data.participants} icon={<Users size={16} />} color="indigo" />
        <StatCard label="총 투표" value={totalVotes} icon={<span className="text-sm">✅</span>} color="green" />
        <StatCard label="총 코멘트" value={totalComments} icon={<MessageCircle size={16} />} color="purple" />
      </div>

      {/* 참여자 목록 토글 */}
      <div className="mb-8 bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowUsers(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>최근 참여자 ({data.recentUsers.length}명 표시)</span>
          {showUsers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showUsers && (
          <div className="border-t border-white/5 px-5 py-3 flex flex-wrap gap-2">
            {data.recentUsers.map(u => (
              <span key={u.username} className="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-full font-mono">
                @{u.username}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 문제별 현황 */}
      <div className="space-y-4">
        {OCTOBER_MATH_PROBLEMS.map((problem) => {
          const counts = data.voteCounts[problem.id] ?? { yes: 0, similar: 0, no: 0 };
          const total = counts.yes + counts.similar + counts.no;
          const comments = data.commentsByProblem[problem.id] ?? [];
          const isExpanded = expandedComments.has(problem.id);

          return (
            <div key={problem.id} className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
              {/* 문제 헤더 */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        problem.type === 'new'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {problem.type === 'new' ? '신유형' : '어려워진 변형'}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">{problem.skill}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{problem.title}</p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono whitespace-nowrap">{total}명 응답</span>
                </div>

                {/* 투표 바 */}
                <div className="mt-3 space-y-1.5">
                  <VoteBar label="이 문제 나왔어요" count={counts.yes} total={total} color="bg-green-500" />
                  <VoteBar label="비슷한 거 나왔어요" count={counts.similar} total={total} color="bg-yellow-500" />
                  <VoteBar label="안 나왔어요" count={counts.no} total={total} color="bg-gray-500" />
                </div>
              </div>

              {/* 코멘트 */}
              {comments.length > 0 && (
                <div className="border-t border-white/5">
                  <button
                    onClick={() => toggleComments(problem.id)}
                    className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={11} /> 코멘트 {comments.length}개
                    </span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2">
                      {comments.map((c, i) => (
                        <div key={i} className="bg-white/3 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-300">{c.comment}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(c.created_at).toLocaleString('ko-KR', {
                              month: 'numeric', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string; value: number; icon: React.ReactNode;
  color: 'indigo' | 'green' | 'purple';
}) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  return (
    <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function VoteBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-400 font-mono w-14 text-right">
        {count} ({pct}%)
      </span>
    </div>
  );
}
