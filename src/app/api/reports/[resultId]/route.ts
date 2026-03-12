import { NextRequest, NextResponse } from 'next/server';
import { fetchReportData } from '@/lib/report-data';

/**
 * GET /api/reports/[resultId]
 * Public endpoint — no authentication required.
 * REQ-002: Wrapped in try/catch — never returns an unhandled 500.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const data = await fetchReportData(resultId);

    if (!data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[GET /api/reports]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
