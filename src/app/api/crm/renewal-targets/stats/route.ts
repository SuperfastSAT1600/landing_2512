import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getRecentWeeks, getWeekLabel } from '@/lib/week-definitions';
import type { RenewalWeeklyStat } from '@/types/crm';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const weeksParam = sp.get('weeks');
  const weeks = Math.max(1, Math.min(52, Number(weeksParam) || 8));

  // 조회 범위를 주차 정의로 좁힌다 — 예전에는 테이블 전체를 읽고 JS에서 잘랐다.
  const recentWeeks = getRecentWeeks(weeks, new Date().toISOString().slice(0, 10));
  const cutoff = recentWeeks[recentWeeks.length - 1]?.start;

  let query = supabaseAdmin.from('renewal_targets').select('week_start, stage');
  if (cutoff) query = query.gte('week_start', cutoff);

  const { data, error } = await query;

  if (error) {
    console.error('[renewal-targets/stats GET]', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '통계를 불러오지 못했습니다.' } },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as { week_start: string; stage: string }[];
  const weekMap = new Map<string, { selected: number; completed: number; dropped: number }>();

  for (const row of rows) {
    const counts = weekMap.get(row.week_start) ?? { selected: 0, completed: 0, dropped: 0 };
    counts.selected += 1;
    if (row.stage === '4') counts.completed += 1;
    if (row.stage === '5') counts.dropped += 1;
    weekMap.set(row.week_start, counts);
  }

  // 전환율 분모는 '선정 인원' 전체 — 미전환(5)도 남겨야 분모가 줄지 않는다.
  const weekly: RenewalWeeklyStat[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, weeks)
    .map(([week_start, counts]) => ({
      week_start,
      week_label: getWeekLabel(week_start) ?? week_start,
      selected: counts.selected,
      open: counts.selected - counts.completed - counts.dropped,
      completed: counts.completed,
      dropped: counts.dropped,
      conversion_rate:
        counts.selected > 0
          ? Math.round((counts.completed / counts.selected) * 100 * 100) / 100
          : 0,
    }));

  return NextResponse.json({ data: weekly });
}
