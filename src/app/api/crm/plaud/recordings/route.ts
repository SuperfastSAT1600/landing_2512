import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { listPlaudRecordings } from '@/lib/plaud-client';

/**
 * GET /api/crm/plaud/recordings
 * Plaud 원격 MCP를 프록시해 녹음 목록을 반환한다(관리자 인증 필요).
 * Query: q(이름검색), date_from, date_to (YYYY-MM-DD), page, page_size.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || undefined;
  const date_from = searchParams.get('date_from')?.trim() || undefined;
  const date_to = searchParams.get('date_to')?.trim() || undefined;
  const page = Number(searchParams.get('page')) || 1;
  const page_size = Number(searchParams.get('page_size')) || 20;

  try {
    const data = await listPlaudRecordings({ query, date_from, date_to, page, page_size });
    return NextResponse.json({ data });
  } catch (e) {
    console.error('[crm/plaud/recordings GET]', e);
    // 고정 문구로 뭉개지 말고 실제 원인(갱신 401 / env 미설정 / MCP 오류 등)을 노출해 진단 가능하게.
    // 메시지에는 토큰 값이 담기지 않는다(원인 코드/상태만).
    const reason = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Plaud 녹음 목록을 불러오지 못했습니다: ${reason}` },
      { status: 502 }
    );
  }
}
