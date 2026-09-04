'use client';

import { useState, useEffect } from 'react';
import type { SurveyRow } from '@/app/api/admin/surveys/route';

function formatKST(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SURVEY_KEY_LABELS: Record<string, string> = {
  ap_interest_v1: 'AP 관심도',
  coach_satisfaction_v1: '코치 만족도',
};

export default function AdminSurveyPage() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const adminKey = localStorage.getItem('admin_key') || '';
    fetch('/api/admin/surveys', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(d => setRows(d.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter
    ? rows.filter(r =>
        r.survey_key === filter ||
        r.student_name?.includes(filter) ||
        r.teacher_name?.includes(filter)
      )
    : rows;

  const surveyKeys = [...new Set(rows.map(r => r.survey_key))];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
      <main className="p-8 pb-20 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Survey Responses</h1>
          <span className="text-xs text-gray-500">{displayed.length}건</span>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === '' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            전체
          </button>
          {surveyKeys.map(key => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? '' : key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {SURVEY_KEY_LABELS[key] ?? key}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="text-center text-gray-500 py-20">응답 없음</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-white/5 bg-[#1a1d20]">
                  <th className="px-4 py-3 whitespace-nowrap">응답일시 (KST)</th>
                  <th className="px-4 py-3 whitespace-nowrap">학생</th>
                  <th className="px-4 py-3 whitespace-nowrap">설문 종류</th>
                  <th className="px-4 py-3 whitespace-nowrap">응답</th>
                  <th className="px-4 py-3 whitespace-nowrap">평점</th>
                  <th className="px-4 py-3 whitespace-nowrap">자유응답</th>
                  <th className="px-4 py-3 whitespace-nowrap">수업일시 (KST)</th>
                  <th className="px-4 py-3 whitespace-nowrap">코치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayed.map((row, i) => (
                  <tr key={i} className="bg-[#151719] hover:bg-[#1e2023] transition-colors">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap tabular-nums">
                      {formatKST(row.responded_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                      {row.student_name ?? (
                        <span className="text-gray-600 text-xs">{row.student_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white/5 text-gray-400">
                        {SURVEY_KEY_LABELS[row.survey_key] ?? row.survey_key}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {row.answer ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.rating != null ? (
                        <span className="text-yellow-400 font-bold">{row.rating}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {row.free_text || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap tabular-nums">
                      {formatKST(row.session_starts_at)}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {row.teacher_name ? (
                        <span className="text-blue-400">{row.teacher_name}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
