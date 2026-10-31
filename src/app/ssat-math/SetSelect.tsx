'use client';

import { useState, useEffect } from 'react';
import { MAX_SSAT_SET } from '@/lib/ssat-math-config';

const RESULTS_KEY = 'ssat_math_results_v1';

interface SetResult { score: number; total: number }

function getCachedResults(): Record<string, SetResult> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(RESULTS_KEY) ?? '{}') as Record<string, SetResult>;
  } catch {
    return {};
  }
}

function setCachedResults(results: Record<string, SetResult>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch { /* ignore */ }
}

export function SetSelect({ studentId, onSelect }: { studentId: string; onSelect: (setNumber: number) => void }) {
  const [results, setResults] = useState<Record<string, SetResult>>(getCachedResults);
  const [loading, setLoading] = useState(true);
  const displayName = studentId.split('_')[0] ?? studentId;

  useEffect(() => {
    fetch(`/api/ssat-math/my-results?student_id=${encodeURIComponent(studentId)}`)
      .then(r => r.json())
      .then(json => {
        if (json.data?.results) {
          const fetched: Record<string, SetResult> = {};
          for (const r of json.data.results as { set_number: number; score: number; total: number }[]) {
            fetched[String(r.set_number)] = { score: r.score, total: r.total };
          }
          const merged = { ...fetched, ...getCachedResults() };
          setResults(merged);
          setCachedResults(merged);
        }
      })
      .catch(() => { /* use cached */ })
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">SSAT Math Practice</h1>
          <p className="text-gray-400 text-base">안녕하세요, <span className="text-white font-semibold">{displayName}</span>님! 풀 세트를 선택해주세요.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: MAX_SSAT_SET }, (_, i) => i + 1).map((setNum) => {
            const result = results[String(setNum)];
            const done = !!result;
            return (
              <button
                key={setNum}
                onClick={() => onSelect(setNum)}
                disabled={loading}
                className={`relative rounded-2xl border p-6 text-left transition-all group ${
                  done
                    ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                    : 'border-white/10 bg-[#09090b] hover:border-[#071be9]/50 hover:bg-[#071be9]/5'
                } disabled:opacity-60`}
              >
                {done && (
                  <span className="absolute top-3 right-3 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    완료
                  </span>
                )}
                <div className="text-2xl font-bold mb-1 text-white">Set {setNum}</div>
                {loading ? (
                  <div className="text-xs text-gray-600">불러오는 중...</div>
                ) : done ? (
                  <div className="text-sm font-bold text-green-400">{result.score}/{result.total}점</div>
                ) : (
                  <div className="text-xs text-gray-500">15문제 · 4분 30초</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
