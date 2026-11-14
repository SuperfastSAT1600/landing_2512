import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, unauthorized } from '@/lib/api-response';
import { REASON_KINDS } from '@/lib/contact-tasks';
import { buildDraftContext, DRAFT_MODEL, fillName, generateMessageDraft, type DraftTarget } from '@/lib/message-draft';
import { saveDraft } from '@/lib/message-drafts';
import { listContacts } from '@/lib/staff-contacts';
import { getStaffUser } from '@/lib/staff-request';
import { listStudentWorkItems } from '@/lib/student-work-items';
import type { WorkItem } from '@/lib/work-log';

export const maxDuration = 60;

const name = z.string().trim().min(1).max(100);
const bodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('student'), targetId: z.string().trim().min(1).max(100), name, remainingHours: z.number(),
    reasons: z.array(z.object({
      kind: z.enum(REASON_KINDS), coachNames: z.array(z.string()).optional(), lastDate: z.string().optional(), isNew: z.boolean().optional(),
    })).min(1).max(4),
  }),
  z.object({ kind: z.literal('coach'), targetId: z.string().regex(/^coach:.+$/).max(100), name, studentNames: z.array(z.string()).min(1).max(50) }),
]);

// POST /api/staff/message-drafts — 수업 관리 업무 대상에게 보낼 메시지 초안. 연락 이력·운영 업무는 서버가 모은다.
export async function POST(request: NextRequest) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  const { targetId, ...target } = parsed.data;
  try {
    const [contacts, workItems] = await Promise.all([
      listContacts([targetId]),
      target.kind === 'student' ? listStudentWorkItems([targetId]) : Promise.resolve<Record<string, WorkItem[]>>({}),
    ]);
    const context = buildDraftContext(target as DraftTarget, contacts[targetId] ?? [], workItems[targetId] ?? [], new Date());
    const draft = await generateMessageDraft(context);
    const message = fillName(draft.message, target.name);
    const handoff = draft.handoff && fillName(draft.handoff, target.name);
    const basis = draft.basis.map(b => fillName(b, target.name));
    const id = await saveDraft({
      targetId, targetName: target.name, purposes: target.kind === 'student' ? target.reasons.map(r => r.kind) : ['coach'],
      draft: message, basis, handoff, model: DRAFT_MODEL, createdBy: staff.name,
    });
    return NextResponse.json({ data: { id, message, basis, handoff } });
  } catch (error) {
    console.error('[api/staff/message-drafts POST] error:', error);
    return apiError('UPSTREAM_ERROR', '메시지 초안을 만들지 못했습니다.', 502);
  }
}
