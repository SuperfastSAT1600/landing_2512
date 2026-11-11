import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, unauthorized } from '@/lib/api-response';
import { getStaffUser } from '@/lib/staff-request';
import { DISMISS_KINDS, dismiss, restore } from '@/lib/work-log-dismissals';

const base = z.object({ kind: z.enum(DISMISS_KINDS), targetKey: z.string().trim().min(1).max(200) });
// 운영 업무의 키는 Slack message_ts
const keyMatchesKind = (t: z.infer<typeof base>) => t.kind !== 'slack' || /^\d+\.\d+$/.test(t.targetKey);
const target = base.refine(keyMatchesKind);
const postSchema = base.extend({ targetName: z.string().trim().min(1).max(200) }).refine(keyMatchesKind);

// POST /api/staff/dismissals — 업무 로그에서 업무 삭제(숨김). 세션 근무자 이름으로 기록한다.
export async function POST(request: NextRequest) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  const { kind, targetKey, targetName } = parsed.data;
  try {
    return NextResponse.json({ data: { dismissed: await dismiss(kind, targetKey, targetName, staff.name) } });
  } catch (error) {
    console.error('[api/staff/dismissals POST] error:', error);
    return apiError('UPSTREAM_ERROR', '삭제에 실패했습니다.', 502);
  }
}

// DELETE /api/staff/dismissals — 삭제한 업무 복구
export async function DELETE(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();

  const parsed = target.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  try {
    await restore(parsed.data.kind, parsed.data.targetKey);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('[api/staff/dismissals DELETE] error:', error);
    return apiError('UPSTREAM_ERROR', '복구에 실패했습니다.', 502);
  }
}
