import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import { kstDateStr, mondayOf, shiftWeekStart } from '@/lib/marketing-week';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';

/**
 * 월요일 04:00 KST 마케팅 주간 리포트 본문.
 *
 * weekly-business-report.ts 와 같은 규칙: 순수 함수, Slack/DB 의존 없음,
 * 이모지 없음, 논평 없음. 판단은 사람이 한다.
 *
 * 목표는 주차 총합 1건이고, 소스별은 목표 없이 건수·비중만 낸다.
 */

const REPORT_GROUPS: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

/** 직전 완료 주차의 월요일. 일요일이 지나지 않은 주는 아직 완료가 아니다. */
export function lastCompletedWeekStart(now: Date): string {
  return shiftWeekStart(mondayOf(kstDateStr(now)), -1);
}

function pct(actual: number, base: number | null): string {
  if (base === null) return '';
  if (base === 0) return ' (—)';
  return ` (${Math.round((actual / base) * 100)}%)`;
}

function share(count: number, total: number): string {
  if (total === 0) return '';
  return ` (${(Math.round((count / total) * 1000) / 10).toFixed(1)}%)`;
}

export function formatMarketingGoalReport(row: WeeklyGoalRow): string {
  const lines: string[] = [
    `*마케팅 주간 리드 · ${row.week_label}*`,
    `${row.week_start} ~ ${row.week_end}`,
    '',
    '*목표 대비*',
    row.target === null
      ? `목표 미설정 / 실적 ${row.actual_total}개`
      : `목표 ${row.target}개 / 실적 ${row.actual_total}개${pct(row.actual_total, row.target)}`,
    '',
    '*유입 소스*',
  ];

  const present = REPORT_GROUPS.filter((g) => row.actuals[g] > 0);
  if (present.length === 0) {
    lines.push('인입 없음');
  } else {
    for (const g of present) {
      lines.push(`${g} ${row.actuals[g]}개${share(row.actuals[g], row.actual_total)}`);
    }
    const missing = MARKETING_GROUPS.filter((g) => row.actuals[g] === 0);
    if (missing.length > 0) lines.push(`인입 없음: ${missing.join(', ')}`);
  }

  return lines.join('\n');
}
