import type { BriefingResponse, ContactLog, ContactsByStudent, StaffUser } from './types';

export class ApiFailure extends Error {
  constructor(public status: number, message: string, public data?: { availableDates?: string[] }) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiFailure(res.status, body?.error?.message ?? '요청에 실패했습니다.', body?.data);
  return body.data as T;
}

const CONTACT_CHUNK = 150;

export const staffApi = {
  session: () => call<{ user: StaffUser }>('/api/staff/session').then(d => d.user),
  login: (email: string, password: string) =>
    call<{ user: StaffUser }>('/api/staff/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(d => d.user),
  logout: () => call<{ ok: boolean }>('/api/staff/logout', { method: 'POST' }),
  briefing: (date?: string) => call<BriefingResponse>(`/api/staff/briefing${date ? `?date=${date}` : ''}`),
  async contacts(studentIds: string[]): Promise<ContactsByStudent> {
    const merged: ContactsByStudent = {};
    for (let i = 0; i < studentIds.length; i += CONTACT_CHUNK) {
      const ids = studentIds.slice(i, i + CONTACT_CHUNK).join(',');
      Object.assign(merged, (await call<{ byStudent: ContactsByStudent }>(`/api/staff/contacts?studentIds=${encodeURIComponent(ids)}`)).byStudent);
    }
    return merged;
  },
  addContact: (input: { studentId: string; studentName: string; briefingDate: string; listKey: string; note?: string }) =>
    call<{ log: ContactLog }>('/api/staff/contacts', { method: 'POST', body: JSON.stringify(input) }).then(d => d.log),
  removeContact: (id: string) => call<{ ok: boolean }>(`/api/staff/contacts/${id}`, { method: 'DELETE' }),
};
