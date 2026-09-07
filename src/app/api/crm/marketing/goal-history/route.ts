import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { fetchWeeklyGoalRows } from '@/lib/marketing-goals';
import { mondayOf } from '@/lib/marketing-week';

// 단일 주차의 목표 + 소스별 실적. 집계는 marketing-goals 가 담당한다.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get('week_start');
  if (!weekStart || !DATE_RE.test(weekStart)) {
    return NextResponse.json({ error: 'week_start 는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }
  // 주차 키가 오염되면 조회가 조용히 빈 결과를 낸다.
  if (mondayOf(weekStart) !== weekStart) {
    return NextResponse.json({ error: 'week_start 는 해당 주 월요일이어야 합니다.' }, { status: 400 });
  }

  try {
    const rows = await fetchWeeklyGoalRows([weekStart]);
    return NextResponse.json({ data: { weeks: rows } });
  } catch (e) {
    console.error('[marketing/goal-history GET]', e);
    return NextResponse.json({ error: '주차 현황을 불러오지 못했습니다.' }, { status: 500 });
  }
}
