import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { parseAttachments } from '@/lib/crm-attachment';
import { appendConsultationEntry, StudentNotFoundError } from '@/lib/consultation-timeline';
import { notifyMemoToSlack } from '@/lib/slack-memo';
import { apiError, unauthorized } from '@/lib/api-response';

/**
 * POST /api/crm/students/[id]/memo
 * Appends a new raw consultation memo to the student's consultation_timeline JSONB array.
 * Body: { raw_memo: string, author?: string }
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) return unauthorized();

  let body: { raw_memo?: string; author?: string; ai_purified?: string; attachments?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const raw_memo = typeof body.raw_memo === 'string' ? body.raw_memo : '';
  const author = body.author;
  const attachments = parseAttachments(body.attachments);
  if (attachments === null) {
    return apiError('BAD_REQUEST', 'invalid attachments', 400);
  }
  // 텍스트나 첨부 중 하나는 있어야 한다(캡처만 공유하는 경우 허용).
  if (raw_memo.trim().length === 0 && attachments.length === 0) {
    return apiError('BAD_REQUEST', 'raw_memo or attachments is required', 400);
  }

  try {
    const newEntry = await appendConsultationEntry(id, {
      raw_memo,
      author,
      ai_purified: body.ai_purified,
      attachments,
    });

    // 슬랙 알림 (실패해도 메모 저장에 영향 없음)
    await notifyMemoToSlack({ studentId: id, memo: raw_memo, author });

    return NextResponse.json({ data: newEntry }, { status: 201 });
  } catch (e) {
    if (e instanceof StudentNotFoundError) {
      return apiError('NOT_FOUND', 'Student not found', 404);
    }
    console.error('[crm/memo POST]', e);
    return apiError('INTERNAL_ERROR', 'Failed to append memo', 500);
  }
}
