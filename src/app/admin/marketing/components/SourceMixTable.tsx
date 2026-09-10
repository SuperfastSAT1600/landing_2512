'use client';

import { MARKETING_GROUPS, GROUP_COLORS, GROUP_ICONS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';

const ROWS: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

/**
 * 해당 주차의 유입 소스 구성 — 건수와 비중만 보여주는 자동 집계 현황.
 *
 * 소스별 목표는 없다(목표는 주차 총합 1건). 리드 정의는 Business 한국비즈니스와 동일하다.
 * 실적이 0 인 소스도 행을 남긴다 — 빠진 채널을 눈에 보이게 하는 것이 이 표의 목적이다.
 */
export default function SourceMixTable({ week }: { week: WeeklyGoalRow | null }) {
  const total = week?.actual_total ?? 0;

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-white font-semibold">유입 소스 구성</h3>
        <span className="text-xs text-gray-500">
          {week ? `${week.week_label} · 총 ${total}개` : '—'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-gray-500">
              <th className="text-left py-2 pr-4 font-medium">소스</th>
              <th className="text-right py-2 px-3 font-medium">건수</th>
              <th className="text-right py-2 px-3 font-medium">비중</th>
              <th className="text-left py-2 pl-3 font-medium w-1/3">　</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((group) => {
              const count = week?.actuals[group] ?? 0;
              const share = total > 0 ? (count / total) * 100 : 0;
              return (
                <tr key={group} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: GROUP_COLORS[group] }}
                      >
                        {GROUP_ICONS[group]}
                      </span>
                      <span className={count > 0 ? 'text-gray-200' : 'text-gray-500'}>{group}</span>
                    </div>
                  </td>
                  <td className={`text-right py-2.5 px-3 font-semibold ${count > 0 ? 'text-white' : 'text-gray-600'}`}>
                    {count}개
                  </td>
                  <td
                    className={`text-right py-2.5 px-3 ${count > 0 ? 'text-gray-300' : 'text-gray-600'}`}
                    data-testid={`share-${group}`}
                  >
                    {total === 0 ? '—' : `${share.toFixed(1)}%`}
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${share}%`, backgroundColor: GROUP_COLORS[group] }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-white/5">
        Business &gt; 한국비즈니스와 동일한 리드 기준(문의일)으로 자동 집계합니다.
      </p>
    </div>
  );
}
