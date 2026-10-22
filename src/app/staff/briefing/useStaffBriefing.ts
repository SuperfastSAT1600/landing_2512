'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiFailure, staffApi } from './api';
import type { BriefingResponse, ContactLog, ContactsByStudent, ListKey, StaffUser } from './types';

type SessionState = 'loading' | 'signed-out' | StaffUser;

function studentIdsOf(data: BriefingResponse): string[] {
  const { endingSoon, noSchedule, neverScheduled, coaches } = data.payload;
  const ids = [...endingSoon, ...noSchedule, ...neverScheduled].map(e => e.userId);
  for (const c of coaches) for (const s of c.students) ids.push(s.userId);
  return [...new Set(ids)];
}

const urlDate = (): string | undefined => new URLSearchParams(window.location.search).get('date') ?? undefined;

export function useStaffBriefing() {
  const [session, setSession] = useState<SessionState>('loading');
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [contacts, setContacts] = useState<ContactsByStudent>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDate = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await staffApi.briefing(date);
      setData(next);
      setContacts(await staffApi.contacts(studentIdsOf(next)));
      window.history.replaceState(null, '', `?date=${next.date}`);
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 401) setSession('signed-out');
      else setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
      if (e instanceof ApiFailure && e.status === 404) setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    staffApi.session().then(user => { setSession(user); return loadDate(urlDate()); }).catch(() => setSession('signed-out'));
  }, [loadDate]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await staffApi.login(email, password);
    setSession(user);
    await loadDate(urlDate());
  }, [loadDate]);

  const logout = useCallback(async () => {
    await staffApi.logout();
    setSession('signed-out');
    setData(null);
  }, []);

  const addContact = useCallback(async (studentId: string, studentName: string, listKey: ListKey, note?: string) => {
    if (!data) return;
    const log = await staffApi.addContact({ studentId, studentName, briefingDate: data.date, listKey, note });
    setContacts(prev => ({ ...prev, [studentId]: [log, ...(prev[studentId] ?? [])] }));
  }, [data]);

  const removeContact = useCallback(async (log: ContactLog) => {
    await staffApi.removeContact(log.id);
    setContacts(prev => ({ ...prev, [log.studentId]: (prev[log.studentId] ?? []).filter(l => l.id !== log.id) }));
  }, []);

  return { session, data, contacts, error, loading, loadDate, login, logout, addContact, removeContact };
}
