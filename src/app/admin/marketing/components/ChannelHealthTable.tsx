'use client';

import { MARKETING_GROUPS, GROUP_COLORS, GROUP_ICONS } from '@/lib/marketing-groups';
import type { WeeklyStats } from '@/types/marketing';
import { getSignal } from './format';
import type { Signal } from './format';

/**
 * 채널별 이번 주 현황 (마케팅 메인).
 *
 * 주차 목표는 총합 1건만 관리하므로 채널별 목표는 없다 —
 * 판정 기준은 기대치(최근 12주 평균)다. 목표 대비 현황은 마케팅 > 목표 탭에서 본다.
 */
export default function ChannelHealthTable({ weekly }: { weekly: WeeklyStats }) {
  const { this_week, hist_weekly_avg } = weekly;

  const rows = MARKETING_GROUPS.map((group) => {
    const actual = this_week[group] ?? 0;
    const expected = hist_weekly_avg[group] ?? 0;
    return {
      group,
      actual,
      expected,
      diff: actual - expected,
      signal: getSignal(actual, expected > 0 ? expected : null),
    };
  });

  const signalColor: Record<Signal, string> = {
    '🟢': 'text-emerald-400',
    '🟡': 'text-amber-400',
    '🔴': 'text-red-400',
    '—': 'text-gray-600',
  };

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">채널별 이번 주 현황</h3>
        <span className="text-xs text-gray-500">기대치 = 최근 12주 평균</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-gray-500">
              <th className="text-left py-2 pr-4 font-medium">채널</th>
              <th className="text-right py-2 px-3 font-medium">이번 주</th>
              <th className="text-right py-2 px-3 font-medium">기대치</th>
              <th className="text-right py-2 px-3 font-medium">차이</th>
              <th className="text-center py-2 pl-3 font-medium">판정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, actual, expected, diff, signal }) => (
              <tr key={group} className="border-b border-white/5 last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: GROUP_COLORS[group] }}
                    >
                      {GROUP_ICONS[group]}
                    </span>
                    <span className="text-gray-200">{group}</span>
                  </div>
                </td>
                <td className="text-right py-3 px-3 text-white font-semibold">{actual}개</td>
                <td className="text-right py-3 px-3 text-gray-400">
                  {expected === 0 ? '—' : `${expected.toFixed(1)}개`}
                </td>
                <td className={`text-right py-3 px-3 font-medium ${
                  expected === 0 ? 'text-gray-600' : diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {expected === 0 ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`}
                </td>
                <td className={`text-center py-3 pl-3 text-base ${signalColor[signal]}`}>{signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-4 pt-3 border-t border-white/5 text-xs text-gray-500">
        <span><span className="text-emerald-400">🟢</span> 기대치 90% 이상</span>
        <span><span className="text-amber-400">🟡</span> 50~89%</span>
        <span><span className="text-red-400">🔴</span> 50% 미만</span>
      </div>
    </div>
  );
}
