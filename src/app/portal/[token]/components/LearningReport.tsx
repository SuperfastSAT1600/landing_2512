'use client';

import { useState, useEffect } from 'react';
import type { LearningReport as LearningReportType } from '@/types/srm-portal';
import { DayCard, ACCENT } from './LearningReportCards';

const BG = '#09090b';

interface Props {
  token: string;
  studentName: string;
  studentCreatedAt: string | null;
}

export default function LearningReport({ token, studentName, studentCreatedAt }: Props) {
  const [data, setData] = useState<LearningReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${token}/srm-report`)
      .then(r => { if (!r.ok) throw new Error('failed'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  const allItems = data?.days.flatMap(d => d.items) ?? [];
  const totalProblems = allItems.reduce((sum, i) => {
    if (i.type === 'study_hall' || i.type === 'test_center') return sum + i.totalProblems;
    return sum;
  }, 0);
  const totalVocab = allItems.reduce((sum, i) => {
    if (i.type === 'voca') return sum + i.masteredCount;
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-12" style={{ background: '#F4F5F9' }}>

      {/* Dark header */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
        }} />
        <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>학습 리포트</p>
          </div>
          <h1 className="text-white mb-1 leading-tight"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {studentName} 학생
          </h1>
          {studentCreatedAt && (
            <p className="text-slate-400 text-sm mb-8">
              {new Date(studentCreatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 시작
            </p>
          )}

          {/* 2 stat cards */}
          <div className="flex flex-row gap-3">
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}>
              <span className="text-5xl font-bold leading-none" style={{ color: ACCENT }}>
                {loading ? '—' : totalProblems}
              </span>
              <span className="text-slate-300 text-xs mt-1.5 tracking-widest text-center">푼 문제 수</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-5xl font-bold leading-none text-white">
                {loading ? '—' : totalVocab}
              </span>
              <span className="text-slate-300 text-xs mt-1.5 tracking-widest text-center">마스터 단어</span>
            </div>
          </div>
        </div>
      </div>

      {/* Light content */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-5xl mx-auto px-[6%] py-8 pb-16">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-white" style={{ border: '1px solid #E2E8F0' }} />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-400 text-center py-8">{error}</p>}
          {!loading && !error && (!data || data.days.length === 0) && (
            <div className="rounded-2xl px-5 py-10 text-center bg-white" style={{ border: '1px solid #E2E8F0' }}>
              <p className="text-slate-400 text-sm">아직 학습 기록이 없습니다.</p>
            </div>
          )}
          {!loading && !error && data && data.days.length > 0 && (
            <div className="space-y-3">
              {data.days.map(day => <DayCard key={day.date} day={day} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
