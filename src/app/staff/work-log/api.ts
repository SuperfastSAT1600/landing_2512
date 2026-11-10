import type { ContactTaskGroup } from '@/lib/contact-tasks';
import type { StudentOption } from '@/lib/work-item-students';
import type { WorkItem } from '@/lib/work-log';
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
  contactTasks: () => call<{ generatedAt: string; groups: ContactTaskGroup[] }>('/api/staff/contact-tasks'),
  searchStudents: (q: string) => call<{ students: StudentOption[] }>(`/api/staff/students?q=${encodeURIComponent(q)}`).then(d => d.students),
};
