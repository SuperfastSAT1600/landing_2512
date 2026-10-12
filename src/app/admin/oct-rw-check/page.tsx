'use client';

import { useEffect, useState } from 'react';
import { OCTOBER_RW_WORDS } from '@/data/october-rw-words';
import { RefreshCw, Users, ChevronDown, ChevronUp, Eye, MessageCircle } from 'lucide-react';

interface StatsData {
  participants: number;
  voteCounts: Record<string, { yes: number; no: number }>;
  realUsers: { username: string; created_at: string }[];
  customWords: { id: string; comment: string; created_at: string }[];
}

export default function OctRwCheckAdminPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/oct-rw-check', {
      headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
    });
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-red-400">데이터를 불러오지 못했습니다.</div>;

  const totalKnew = Object.values(data.voteCounts).reduce((s, c) => s + c.yes, 0);
  const totalDidntKnow = Object.values(data.voteCounts).reduce((s, c) => s + c.no, 0);

  return (
    <div className="p-8 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">10월 SAT RW 단어 체크</h2>
          <p className="text-gray-500 text-sm mt-1">/secret/october-rw-check</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/secret/october-rw-check"
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
        <StatCard label="실제 참여자" value={data.participants} icon={<Users size={16} />} color="indigo" />
        <StatCard label="알고 있었어" value={totalKnew} icon={<span className="text-sm font-bold">✓</span>} color="green" />
        <StatCard label="몰랐어" value={totalDidntKnow} icon={<span className="text-sm font-bold">✗</span>} color="red" />
      </div>

      {/* 실제 참여자 목록 */}
      <div className="mb-8 bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowUsers(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>실제 참여자</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
              {data.realUsers.length}명
            </span>
          </div>
          {showUsers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showUsers && (
          <div className="border-t border-white/5 px-5 py-4">
            {data.realUsers.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-2">아직 실제 참여자가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.realUsers.map((u, i) => (
                  <div key={u.username} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono w-5">{i + 1}</span>
                      <a
                        href={`https://instagram.com/${u.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        @{u.username}
                      </a>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(u.created_at).toLocaleString('ko-KR', {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 학생 제출 단어 */}
      <div className="mb-8 bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowCustom(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={14} />
            <span>학생 제출 단어</span>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-mono">
              {data.customWords.length}개
            </span>
          </div>
          {showCustom ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showCustom && (
          <div className="border-t border-white/5 px-5 py-4">
            {data.customWords.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-2">아직 제출된 단어가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.customWords.map(w => (
                  <span key={w.id} className="text-xs bg-white/5 text-gray-300 px-3 py-1.5 rounded-full font-mono border border-white/5">
                    {w.comment.split(' (@')[0]}
                    {w.comment.includes(' (@') && (
                      <span className="text-gray-600 ml-1">{w.comment.match(/\(@[^)]+\)/)?.[0]}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 단어별 현황 — 몰랐어 비율 높은 순 */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide px-1">
          단어별 응답 현황 (몰랐어 비율 높은 순)
        </p>
        {[...OCTOBER_RW_WORDS]
          .sort((a, b) => {
            const ca = data.voteCounts[a.id] ?? { yes: 0, no: 0 };
            const cb = data.voteCounts[b.id] ?? { yes: 0, no: 0 };
            const ta = ca.yes + ca.no;
            const tb = cb.yes + cb.no;
            const pa = ta > 0 ? ca.no / ta : 0;
            const pb = tb > 0 ? cb.no / tb : 0;
            return pb - pa;
          })
          .map(word => {
            const c = data.voteCounts[word.id] ?? { yes: 0, no: 0 };
            const total = c.yes + c.no;
            const yesPct = total > 0 ? Math.round((c.yes / total) * 100) : 0;
            const didntPct = 100 - yesPct;

            return (
              <div key={word.id} className="bg-[#1e2023] rounded-xl border border-white/5 px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 font-mono">{word.pos}</span>
                    <span className="text-sm font-bold text-white">{word.word}</span>
                    <span className="text-xs text-gray-500">{word.definition_ko}</span>
                  </div>
                  <span className="text-xs text-gray-600 font-mono shrink-0">{total}명</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-red-500/60 h-full" style={{ width: `${didntPct}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono w-28 text-right shrink-0">
                    ✓ {yesPct}% · ✗ {didntPct}%
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode;
  color: 'indigo' | 'green' | 'red';
}) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
  };
  return (
    <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
