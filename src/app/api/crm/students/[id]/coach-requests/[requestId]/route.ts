import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { selectRequest } from '@/lib/coach-prep-requests-db';

const SelectSchema = z.object({ selected: z.literal(true) });

// 응답한 코치 중 담당 코치 한 명을 선택 — 다른 선택은 풀린다
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  if (!isAuthenticated(request)) return unauthorized();
  const { id, requestId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', '잘못된 요청입니다.', 400);
  }
  if (!SelectSchema.safeParse(body).success) return apiError('VALIDATION_ERROR', 'selected는 true여야 합니다.', 400);

  try {
    const result = await selectRequest(id, requestId);
    if (result === 'not_found') return apiError('NOT_FOUND', '요청을 찾을 수 없습니다.', 404);
    if (result === 'not_accepted') return apiError('NOT_ACCEPTED', '수업을 수락한 코치만 선택할 수 있습니다.', 409);
    if (result === 'conflict') return apiError('SELECTION_CONFLICT', '다른 변경과 겹쳤습니다. 새로고침한 뒤 다시 선택해 주세요.', 409);
    return NextResponse.json({ data: { selected: true }, meta: { requestId: crypto.randomUUID() } });
  } catch (e) {
    console.error('[coach-requests PATCH]', e);
    return apiError('DB_ERROR', '저장 중 오류가 발생했습니다.', 500);
  }
}
