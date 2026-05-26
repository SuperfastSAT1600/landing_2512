'use client';

import { useEffect, useState } from 'react';

interface Detail {
  unitId: string;
  submitted: string;
  correctAnswer: string | string[];
  isCorrect: boolean;
  section: string;
}

interface Result {
  id: string;
  studentName: string;
  submittedAt: string;
  totalAnswered: number;
  totalUnits: number;
  correct: number;
  score: number;
  rwCorrect: number;
  rwTotal: number;
  mathCorrect: number;
  mathTotal: number;
  detail: Detail[];
}

export default function FulltestResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/fulltest', {
      headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
    })
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch((e) => console.error('fulltest fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">Full-Length Test Results</h2>
        <p className="text-gray-500 text-sm mt-1">2026 June SuperfastSAT Full-Length Test #1 · {results.length}명 제출</p>
      </header>

      {results.length === 0 ? (
        <div className="text-gray-500 text-sm">아직 제출된 결과가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
              {/* Summary row */}
              <button
                className="w-full grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors text-left"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="col-span-3">
                  <p className="text-white font-semibold">{r.studentName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(r.submittedAt)}</p>
                </div>
                <div className="col-span-2 text-center">
                  <ScoreBadge score={r.score} />
                  <p className="text-xs text-gray-500 mt-1">{r.correct}/{r.totalAnswered} 정답</p>
                </div>
                <div className="col-span-3 text-center">
                  <p className="text-sm text-gray-300">
                    RW: <span className="font-bold text-white">{r.rwCorrect}/{r.rwTotal}</span>
                    <span className="text-gray-600 mx-2">|</span>
                    Math: <span className="font-bold text-white">{r.mathCorrect}/{r.mathTotal}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.totalUnits - r.totalAnswered > 0 && `${r.totalUnits - r.totalAnswered}문제 미응답`}
                  </p>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-gray-500 text-xs">{expanded === r.id ? '▲ 닫기' : '▼ 상세 보기'}</span>
                </div>
              </button>

              {/* Detail */}
              {expanded === r.id && (
                <div className="border-t border-white/5 px-6 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Section title="Reading & Writing" items={r.detail.filter((d) => d.section === 'reading_and_writing')} />
                    <Section title="Math" items={r.detail.filter((d) => d.section === 'math')} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`text-2xl font-bold ${color}`}>{score}%</span>;
}

function Section({ title, items }: { title: string; items: Detail[] }) {
  if (items.length === 0) return null;
  const correct = items.filter((i) => i.isCorrect).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <span className="text-xs text-gray-500">{correct}/{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <div
            key={item.unitId}
            title={`Q${idx + 1}: 제출 ${item.submitted} / 정답 ${Array.isArray(item.correctAnswer) ? item.correctAnswer.join(', ') : item.correctAnswer}`}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold cursor-default ${
              item.isCorrect ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}
          >
            {item.submitted || '—'}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
