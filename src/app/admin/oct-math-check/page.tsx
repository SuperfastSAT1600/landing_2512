'use client';

import { useEffect, useState } from 'react';
import { OCTOBER_MATH_PROBLEMS, type MathProblem } from '@/data/october-math-problems';
import { NOVEMBER_MATH_PROBLEMS } from '@/data/november-math-problems';
import { RefreshCw, Users, MessageCircle, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import { MathHtmlBlock } from '@/app/mathweb/MathHtmlBlock';

const ALL_PROBLEMS = [...OCTOBER_MATH_PROBLEMS, ...NOVEMBER_MATH_PROBLEMS];

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
  const [previewProblem, setPreviewProblem] = useState<MathProblem | null>(null);

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
        <div className="flex gap-3">
          <a
            href="/secret/october-math-check"
            target="_blank"
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Eye size={12} /> 학생 페이지 열기
          </a>
          <button
            onClick={load}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>
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
        {ALL_PROBLEMS.map((problem) => {
          const counts = data.voteCounts[problem.id] ?? { yes: 0, similar: 0, no: 0 };
          const total = counts.yes + counts.similar + counts.no;
          const comments = data.commentsByProblem[problem.id] ?? [];
          const isExpanded = expandedComments.has(problem.id);

          return (
            <div key={problem.id} className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-600 font-mono mb-1">{problem.skill}</p>
                    <p className="text-sm font-semibold text-white">{problem.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-600 font-mono">{total}명 응답</span>
                    <button
                      onClick={() => setPreviewProblem(problem)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 border border-white/10 hover:border-indigo-500/40 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Eye size={11} /> 미리보기
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <VoteBar label="이 문제 나왔어요" count={counts.yes} total={total} color="bg-green-500" />
                  <VoteBar label="비슷한 거 나왔어요" count={counts.similar} total={total} color="bg-yellow-500" />
                  <VoteBar label="안 나왔어요" count={counts.no} total={total} color="bg-gray-500" />
                </div>
              </div>

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

      {/* 학생 화면 미리보기 모달 */}
      {previewProblem && (
        <ProblemPreviewModal
          problem={previewProblem}
          index={ALL_PROBLEMS.findIndex(p => p.id === previewProblem.id)}
          total={ALL_PROBLEMS.length}
          onClose={() => setPreviewProblem(null)}
        />
      )}
    </div>
  );
}

function ProblemPreviewModal({
  problem, index, total, onClose,
}: {
  problem: MathProblem;
  index: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/3">
          <span className="text-xs text-gray-500 font-medium">학생 화면 미리보기</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 학생이 보는 실제 화면 */}
        <div className="p-6 text-white space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 문제 번호 */}
          <span className="text-xs text-gray-500 font-mono">{index + 1} / {total}</span>

          {/* 문제 설명 — 복기 기반, 보기 없음 */}
          <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-200 leading-relaxed math-problem">
            <MathHtmlBlock html={problem.description} className="mathweb-html" />
          </div>

          {/* 투표 버튼 (비활성 미리보기) */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500">시험에 나왔나요?</p>
            {[
              { label: '이 문제 나왔어요', emoji: '✅' },
              { label: '비슷한 거 나왔어요', emoji: '🔁' },
              { label: '안 나왔어요', emoji: '❌' },
            ].map(opt => (
              <div
                key={opt.label}
                className="w-full flex items-center px-4 py-3 rounded-xl border border-white/10 text-sm text-gray-400 bg-white/3 opacity-60 cursor-default"
              >
                {opt.emoji} {opt.label}
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-gray-600">— 어드민 미리보기 (투표 불가) —</p>
        </div>
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
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-gray-400 font-mono w-14 text-right">
        {count} ({pct}%)
      </span>
    </div>
  );
}
