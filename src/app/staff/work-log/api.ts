import type { ContactTasks } from '@/lib/contact-tasks';
import type { StudentOption } from '@/lib/work-item-students';
import type { WorkItem } from '@/lib/work-log';
import type { DismissKind, Dismissal } from '@/lib/work-log-dismissals';
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
  searchStudents: (q: string) => call<{ students: StudentOption[] }>(`/api/staff/students?q=${encodeURIComponent(q)}`).then(d => d.students),
};
