import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { parseAttachments } from '@/lib/crm-attachment';
import { appendConsultationEntry, StudentNotFoundError } from '@/lib/consultation-timeline';
import { notifyMemoToSlack } from '@/lib/slack-memo';

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
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { raw_memo?: string; author?: string; attachments?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw_memo = typeof body.raw_memo === 'string' ? body.raw_memo : '';
  const author = body.author;
  const attachments = parseAttachments(body.attachments);
  if (attachments === null) {
    return NextResponse.json({ error: 'invalid attachments' }, { status: 400 });
  }
  // 텍스트나 첨부 중 하나는 있어야 한다(캡처만 공유하는 경우 허용).
  if (raw_memo.trim().length === 0 && attachments.length === 0) {
    return NextResponse.json({ error: 'raw_memo or attachments is required' }, { status: 400 });
  }

  try {
    const newEntry = await appendConsultationEntry(id, { raw_memo, author, attachments });

    // 슬랙 알림 (실패해도 메모 저장에 영향 없음)
    await notifyMemoToSlack({ studentId: id, memo: raw_memo, author });

    return NextResponse.json({ data: newEntry }, { status: 201 });
  } catch (e) {
    if (e instanceof StudentNotFoundError) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    console.error('[crm/memo POST]', e);
    return NextResponse.json({ error: 'Failed to append memo' }, { status: 500 });
  }
}
