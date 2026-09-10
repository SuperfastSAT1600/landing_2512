import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { appendConsultationEntry, StudentNotFoundError } from '@/lib/consultation-timeline';
import { notifyMemoToSlack, CHURN_HEADING } from '@/lib/slack-memo';
import { buildChurnMemo } from '@/lib/churn-memo';
import type { ChurnType } from '@/types/crm';

/**
 * POST /api/crm/students/[id]/churn-memo
 * 이탈 처리 모달의 사유를 상담 타임라인에 남기고 상담내역 슬랙 채널에 공유한다.
 * 타임라인에 남겨야 "오늘 취한 액션"(students?today_actions=true)에 잡힌다.
 * Body: { churn_tag, reason, churn_type, author? }
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { churn_tag?: string; reason?: string; churn_type?: ChurnType; author?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const churnTag = typeof body.churn_tag === 'string' ? body.churn_tag.trim() : '';
  if (!churnTag) {
    return NextResponse.json({ error: 'churn_tag is required' }, { status: 400 });
  }

  const memo = buildChurnMemo({
    churnTag,
    reason: typeof body.reason === 'string' ? body.reason : '',
    churnType: body.churn_type === 'closed' ? 'closed' : 'potential',
  });
  const author = body.author?.trim() || undefined;

  try {
    const entry = await appendConsultationEntry(id, { raw_memo: memo, author, published: false });

    // 슬랙 전송 실패가 이미 저장된 메모를 되돌리지는 않는다.
    try {
      await notifyMemoToSlack({ studentId: id, memo, author, heading: CHURN_HEADING });
    } catch (e) {
      console.error('[crm/churn-memo slack]', e);
    }

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    if (e instanceof StudentNotFoundError) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    console.error('[crm/churn-memo POST]', e);
    return NextResponse.json({ error: 'Failed to append churn memo' }, { status: 500 });
  }
}
