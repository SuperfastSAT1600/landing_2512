import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api-response';
import { markOpenedByToken } from '@/lib/coach-prep-requests-db';

const OpenedSchema = z.object({ token: z.string().min(16) });

// 코치가 링크를 실제로 열었다는 기록. 카카오톡·Slack 링크 미리보기 봇은 JS를 실행하지 않아
// 서버 렌더가 아니라 페이지가 뜬 브라우저에서 이 API를 호출해야 열람이 정확하다.
export async function POST(request: NextRequest) {
  const parsed = OpenedSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('VALIDATION_ERROR', '잘못된 요청입니다.', 400);
  try {
    await markOpenedByToken(parsed.data.token);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('[coach-prep/opened]', e);
    return apiError('DB_ERROR', '저장 중 오류가 발생했습니다.', 500);
  }
}
