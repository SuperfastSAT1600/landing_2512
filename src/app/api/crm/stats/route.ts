import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { type CrmStatsSegment, parseStatsSegment, isCrmStatsSegment } from '@/lib/crm-stats-core';
import { computeCrmStats } from '@/lib/crm-stats-service';

// 집계 로직과 응답 타입은 @/lib/crm-stats-service 에 있다 — 크론이 HTTP 없이 같은 집계를 쓰기 위함.
export type {
  CrmStatsData,
  StatsBySource,
  StatsMonthly,
  StatsWeekly,
} from '@/lib/crm-stats-service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/crm/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&segment=all|b2c|b2b
 * 유입 채널별 컨택 성공률 + 결제 전환율 (코호트 기준)
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'from, to 파라미터가 필요합니다.' } },
      { status: 400 }
    );
  }

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE', message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' } },
      { status: 400 }
    );
  }

  const rawSegment = searchParams.get('segment');
  const segment: CrmStatsSegment = parseStatsSegment(rawSegment);
  if (rawSegment !== null && !isCrmStatsSegment(rawSegment)) {
    return NextResponse.json(
      { error: { code: 'INVALID_SEGMENT', message: 'segment는 all, b2c, b2b 중 하나여야 합니다.' } },
      { status: 400 }
    );
  }

  const result = await computeCrmStats({ from, to, segment });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result.data });
}
