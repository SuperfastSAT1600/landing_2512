import type { ContactTasks } from '@/lib/contact-tasks';
import type { StudentOption } from '@/lib/work-item-students';
import type { WorkItem } from '@/lib/work-log';
import type { DismissKind, Dismissal } from '@/lib/work-log-dismissals';
import type { Reason } from '@/lib/contact-tasks';

/** 메시지 초안 요청 대상. 학생은 용건, 코치는 미예약 학생 */
export type DraftRequest =
  | { targetId: string; name: string; kind: 'student'; remainingHours: number; reasons: Reason[] }
  | { targetId: string; name: string; kind: 'coach'; studentNames: string[] };
export interface DraftResult { id: string; message: string; basis: string[]; handoff: string | null }
import { ApiFailure } from '../briefing/api';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiFailure(res.status, body?.error?.message ?? '요청에 실패했습니다.');
  return body.data as T;
}

export const workLogApi = {
  items: () => call<{ items: WorkItem[] }>('/api/staff/work-items').then(d => d.items),
  setStudent: (messageTs: string, studentId: string | null) =>
    call<{ student: WorkItem['student'] }>('/api/staff/work-items', { method: 'PUT', body: JSON.stringify({ messageTs, studentId }) }).then(d => d.student),
  contactTasks: () => call<ContactTasks & { generatedAt: string; dismissed?: Record<string, Dismissal> }>('/api/staff/contact-tasks'),
  dismiss: (kind: DismissKind, targetKey: string, targetName: string) =>
    call<{ dismissed: Dismissal }>('/api/staff/dismissals', { method: 'POST', body: JSON.stringify({ kind, targetKey, targetName }) }).then(d => d.dismissed),
  restore: (kind: DismissKind, targetKey: string) =>
    call<{ ok: true }>('/api/staff/dismissals', { method: 'DELETE', body: JSON.stringify({ kind, targetKey }) }).then(() => undefined),
  studentWorkItems: (studentIds: string[]) =>
    call<{ byStudent: Record<string, WorkItem[]> }>(`/api/staff/student-work-items?studentIds=${encodeURIComponent(studentIds.join(','))}`).then(d => d.byStudent),
  messageDraft: (req: DraftRequest) => call<DraftResult>('/api/staff/message-drafts', { method: 'POST', body: JSON.stringify(req) }),
  markDraftSent: (id: string, sentText: string) =>
    call<{ ok: true }>(`/api/staff/message-drafts/${id}`, { method: 'PATCH', body: JSON.stringify({ sentText }) }).then(() => undefined),
  searchStudents: (q: string) => call<{ students: StudentOption[] }>(`/api/staff/students?q=${encodeURIComponent(q)}`).then(d => d.students),
};
