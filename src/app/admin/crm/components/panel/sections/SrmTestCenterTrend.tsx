'use client';

import dynamic from 'next/dynamic';
import { Target } from 'lucide-react';
import type { LearningReport, DayItem } from '@/types/srm-portal';
import type { TrendPoint } from './SrmTrendChart';
import { tcSectionScore, type TcSectionScore } from '@/lib/sat-score-estimate';

const SrmTrendChart = dynamic(() => import('./SrmTrendChart'), {
  ssr: false,
  loading: () => <div className="h-[160px] flex items-center justify-center text-[11px] text-gray-300">그래프 로딩…</div>,
});

const mmdd = (d: string) => d.slice(5).replace('-', '.');
const pct = (score: number, total: number) => (total ? Math.round((score / total) * 100) : 0);

interface TcSession { date: string; title: string; score: number; total: number; p: number; sec: TcSectionScore }

// 테스트센터 회차별 점수(SAT 총점·과목별 예상) + 연습 vs 실전 정답률 추이
export function SrmTestCenterTrend({ report }: { report: LearningReport }) {
  const sessions: TcSession[] = [];
  const byDate = new Map<string, { shProb: number; shCorrect: number; tcScore: number; tcProb: number }>();

  for (const day of report.days) {
    for (const it of day.items) {
      if (it.type === 'study_hall') {
        const e = byDate.get(day.date) ?? { shProb: 0, shCorrect: 0, tcScore: 0, tcProb: 0 };
        e.shProb += it.totalProblems; e.shCorrect += it.correctCount; byDate.set(day.date, e);
      } else if (it.type === 'test_center') {
        const tc = it as Extract<DayItem, { type: 'test_center' }>;
        const e = byDate.get(day.date) ?? { shProb: 0, shCorrect: 0, tcScore: 0, tcProb: 0 };
        e.tcScore += tc.totalScore; e.tcProb += tc.totalProblems; byDate.set(day.date, e);
        sessions.push({ date: day.date, title: tc.curriculumTitle ?? '테스트', score: tc.totalScore, total: tc.totalProblems, p: pct(tc.totalScore, tc.totalProblems), sec: tcSectionScore(tc) });
      }
    }
  }

  if (sessions.length === 0) return null;

  const trend: TrendPoint[] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date: mmdd(date),
      연습: v.shProb ? pct(v.shCorrect, v.shProb) : null,
      실전: v.tcProb ? pct(v.tcScore, v.tcProb) : null,
    }));

  const recent = sessions.slice(0, 8); // sessions는 최신순(days가 desc)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Target size={13} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-700">테스트센터 점수 추이</span>
        <span className="ml-auto text-[10px] text-gray-400">{sessions.length}회 응시</span>
      </div>

      <SrmTrendChart data={trend} />

      <div className="space-y-1.5">
        {recent.map((s, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 tabular-nums shrink-0 w-10">{mmdd(s.date)}</span>
              <span className="text-gray-600 truncate flex-1">{s.title}</span>
              <span className="tabular-nums text-gray-500 shrink-0">{s.score}/{s.total} · {s.p}%</span>
            </div>
            {s.sec.total != null && (
              <div className="flex items-center gap-2.5 mt-1 pl-12">
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {s.sec.total}<span className="text-[9px] font-medium text-gray-400 ml-0.5">예상</span>
                </span>
                {s.sec.rwScaled != null && (
                  <span className="text-xs font-semibold text-blue-700 tabular-nums">RW {s.sec.rwScaled}</span>
                )}
                {s.sec.mathScaled != null && (
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">Math {s.sec.mathScaled}</span>
                )}
              </div>
            )}
          </div>
        ))}
        {sessions.length > recent.length && (
          <p className="text-[10px] text-gray-400 text-center pt-0.5">외 {sessions.length - recent.length}회 (자세히 보기)</p>
        )}
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed">
        · SAT 점수는 raw 정답수 기반 <span className="font-medium">예상치</span>(공식 커브 아님). RW·Math 각 200~800, 총점 400~1600.
      </p>
    </div>
  );
}
