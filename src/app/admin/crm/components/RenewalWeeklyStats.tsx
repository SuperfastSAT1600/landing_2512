'use client';

// 주차별 재결제 퍼널 — 선정 주차(코호트) 기준. 표 어법은 stats-primitives의 StageFlowTable을 따른다.
// 행을 클릭하면 보드가 그 코호트로 스코프된다 (표의 한 행 = 보드의 한 화면).

import type { RenewalWeeklyStat } from '@/types/crm';
import { formatRate } from './RenewalStatsStrip';

interface RenewalWeeklyStatsProps {
  rows: RenewalWeeklyStat[];
  loading: boolean;
  error: string | null;
  /** 현재 보드가 보고 있는 주차. 없으면 '진행 중 전체' 스코프. */
  selectedWeek: string | null;
  onSelectWeek: (weekStart: string) => void;
}

export function RenewalWeeklyStats({
  rows,
  loading,
  error,
  selectedWeek,
  onSelectWeek,
}: RenewalWeeklyStatsProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700">주차별 재결제 퍼널</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">
          선정 주차 기준 · 전환율 = 결제 완료 / 선정 인원 · 행을 누르면 그 주차만 보드에 표시
        </p>
      </div>
      {loading ? (
        <div className="px-4 py-5 text-xs text-gray-500">주차별 통계 로딩 중...</div>
      ) : error ? (
        <div className="px-4 py-5 text-xs text-red-500">{error}</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-5 text-xs text-gray-400">아직 선정된 재결제 대상이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto px-4">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 min-w-[140px]">
                  주차
                </th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">선정</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">진행 중</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">
                  결제 완료
                </th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">미전환</th>
                <th className="text-right py-2 pl-2 text-xs font-semibold text-gray-500">전환율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.week_start}
                  onClick={() => onSelectWeek(row.week_start)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors ${
                    selectedWeek === row.week_start ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-2.5 pr-4 text-xs font-medium text-gray-800">{row.week_label}</td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-700 tabular-nums">
                    {row.selected}
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-blue-600 tabular-nums">
                    {row.open || '-'}
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-emerald-600 tabular-nums">
                    {row.completed || '-'}
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs text-gray-500 tabular-nums">
                    {row.dropped || '-'}
                  </td>
                  <td className="text-right py-2.5 pl-2 text-xs font-semibold text-gray-800 tabular-nums">
                    {formatRate(row.completed, row.selected)}
                    {row.open > 0 && <span className="text-[10px] text-gray-400 ml-1">진행중</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
