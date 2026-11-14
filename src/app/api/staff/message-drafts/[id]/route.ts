import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, unauthorized } from '@/lib/api-response';
import { markDraftSent } from '@/lib/message-drafts';
import { getStaffUser } from '@/lib/staff-request';

const schema = z.object({ sentText: z.string().trim().min(1).max(2000) });

// PATCH /api/staff/message-drafts/:id — 근무자가 실제로 보낸 내용(고친 뒤)을 초안 옆에 남긴다
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  const { id } = await params;
  try {
    await markDraftSent(id, parsed.data.sentText, staff.name);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('[api/staff/message-drafts PATCH] error:', error);
    return apiError('UPSTREAM_ERROR', '보낸 내용을 저장하지 못했습니다.', 502);
  }
}
