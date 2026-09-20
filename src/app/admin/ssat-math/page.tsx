'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';

interface GradedDetail {
  answer: string;
  correct: string;
  is_correct: boolean;
}

interface StudentResult {
  id: string;
  student_id: string;
  set_number: number;
  score: number;
  total: number;
  elapsed_seconds: number | null;
  graded_detail: Record<string, GradedDetail>;
  submitted_at: string;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(sec: number | null) {
  if (sec === null) return '-';
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SSATMathAdminPage() {
  const { adminKey } = useAdminAuth();
  const [activeSet, setActiveSet] = useState(1);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchResults = useCallback(async (setNumber: number) => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/ssat-math/results?set_number=${setNumber}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? '결과를 불러올 수 없습니다.');
        setResults([]);
        return;
      }
      setResults(json.data as StudentResult[]);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchResults(activeSet);
  }, [activeSet, fetchResults]);

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
    : '-';

  const questionIds = results.length > 0
    ? Object.keys(results[0].graded_detail).sort()
    : [];

  return (
    <div className="p-6 min-h-screen bg-[#151719] text-gray-200">
      <div className="max-w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SSAT Math 결과</h1>
            <p className="text-gray-500 text-sm mt-1">학생들의 세트별 정오답 결과</p>
          </div>
          <button
            onClick={() => fetchResults(activeSet)}
            className="px-4 py-2 bg-[#1e2023] hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
          >
            새로고침
          </button>
        </div>

        {/* Set tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setActiveSet(n)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeSet === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e2023] text-gray-400 hover:text-white'
              }`}
            >
              Set {n}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">제출 학생수</div>
            <div className="text-2xl font-bold text-white">{results.length}명</div>
          </div>
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">평균 점수</div>
            <div className="text-2xl font-bold text-white">{avgScore} / 15</div>
          </div>
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">세트</div>
            <div className="text-2xl font-bold text-white">Set {activeSet}</div>
          </div>
        </div>

        {loading && (
          <div className="text-gray-500 text-center py-12">불러오는 중...</div>
        )}
        {error && (
          <div className="text-red-400 bg-red-400/10 rounded-xl p-4 mb-4">{error}</div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="text-gray-500 text-center py-12">아직 제출된 결과가 없습니다.</div>
        )}

        {!loading && results.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e2023] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 whitespace-nowrap">학생</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">점수</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">시간</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">제출</th>
                  {Array.from({ length: 15 }, (_, i) => (
                    <th key={i} className="text-center px-2 py-3 whitespace-nowrap">Q{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map(r => {
                  const displayName = r.student_id.split('_')[0] ?? r.student_id;
                  const detailEntries = Object.entries(r.graded_detail);
                  const sortedDetails = detailEntries.sort((a, b) => {
                    const findQ = (id: string) => questionIds.indexOf(id);
                    return findQ(a[0]) - findQ(b[0]);
                  });
                  return (
                    <tr key={r.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{displayName}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`font-bold ${r.score >= 12 ? 'text-green-400' : r.score >= 9 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.score}/{r.total}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-400 whitespace-nowrap font-mono">
                        {formatTime(r.elapsed_seconds)}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(r.submitted_at)}
                      </td>
                      {sortedDetails.map(([qid, detail]) => (
                        <td key={qid} className="px-2 py-3 text-center">
                          {detail.is_correct
                            ? <span className="text-green-400 font-bold">O</span>
                            : detail.answer
                            ? <span className="text-red-400 font-bold">X</span>
                            : <span className="text-gray-600">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
