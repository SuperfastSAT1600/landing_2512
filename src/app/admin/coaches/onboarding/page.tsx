'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function getAdminKey() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('admin_key') ?? '' : '';
}

interface SubmissionRow {
  id: string;
  name: string;
  completeness_score: number;
  head_coach_criteria_met: number;
  is_head_coach_eligible: boolean;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: '미검토', color: 'bg-yellow-500/20 text-yellow-400' },
  reviewed: { label: '검토완료', color: 'bg-blue-500/20 text-blue-400' },
  approved: { label: '승인', color: 'bg-green-500/20 text-green-400' },
  rejected: { label: '반려', color: 'bg-red-500/20 text-red-400' },
};

export default function OnboardingListPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/coach-onboarding', { headers: { 'x-admin-key': getAdminKey() } })
      .then(r => r.json())
      .then(d => { if (d.data) setRows(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#151719] text-gray-100">
      <main className="p-8 pb-20 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/coaches" className="text-xs text-gray-500 hover:text-gray-400 mb-1 block">← 코치 관리</Link>
            <h1 className="text-2xl font-bold text-white">코치 프로필 작성 현황</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 py-10 text-center">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-500 py-10 text-center">제출된 프로필 작성 폼이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => {
              const st = STATUS_LABELS[row.status] ?? STATUS_LABELS['submitted'];
              return (
                <Link
                  key={row.id}
                  href={`/admin/coaches/onboarding/${row.id}`}
                  className="flex items-center justify-between p-4 bg-[#1e2023] rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(row.created_at).toLocaleDateString('ko-KR')} 제출
                      </p>
                    </div>
                    {row.is_head_coach_eligible && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">
                        대표코치 후보
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">완성도</p>
                      <p className="text-sm font-bold text-white">{row.completeness_score ?? '--'}<span className="text-gray-500 font-normal">/100</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">대표코치 기준</p>
                      <p className="text-sm font-bold text-white">{row.head_coach_criteria_met}<span className="text-gray-500 font-normal">/8</span></p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
