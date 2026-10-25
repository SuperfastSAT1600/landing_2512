'use client';

import { useCallback, useEffect, useState } from 'react';
import { kstDate } from '@/lib/kst-date';
import { ApiFailure, staffApi } from './api';
import { coachContactId } from './format';
import type { BriefingResponse, ContactLog, ContactsByStudent, ListKey, StaffUser } from './types';

type SessionState = 'loading' | 'signed-out' | StaffUser;

/** 연락 이력을 불러올 대상: 목록의 학생, 코치별 학생, 코치 본인 */
function contactTargetIds(data: BriefingResponse): string[] {
  const { endingSoon, noSchedule, neverScheduled, coaches } = data.payload;
  const ids = [...endingSoon, ...noSchedule, ...neverScheduled].map(e => e.userId);
  for (const c of coaches) {
    ids.push(coachContactId(c.key));
    for (const s of c.students) ids.push(s.userId);
  }
  return [...new Set(ids)];
}

export function useStaffBriefing() {
  const [session, setSession] = useState<SessionState>('loading');
  const [date, setDate] = useState(() => kstDate(new Date()));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  /** null 이면 선택한 날짜에 저장된 브리핑이 없다 */
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [contacts, setContacts] = useState<ContactsByStudent>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** 날짜를 주면 그 날, 안 주면 가장 최근 저장본 */
  const loadDate = useCallback(async (target?: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await staffApi.briefing(target);
      setData(next);
      setDate(next.date);
      setAvailableDates(next.availableDates);
      setContacts(await staffApi.contacts(contactTargetIds(next)));
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 401) setSession('signed-out');
      else if (e instanceof ApiFailure && e.status === 404) {
        setData(null);
        if (target) setDate(target);
        setAvailableDates(e.data?.availableDates ?? []);
      } else setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    staffApi.session().then(user => { setSession(user); return loadDate(); }).catch(() => setSession('signed-out'));
  }, [loadDate]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await staffApi.login(email, password);
    setSession(user);
    await loadDate();
  }, [loadDate]);

  const logout = useCallback(async () => {
    await staffApi.logout();
    setSession('signed-out');
    setData(null);
  }, []);

  const addContact = useCallback(async (targetId: string, targetName: string, listKey: ListKey, note?: string) => {
    if (!data) return;
    const log = await staffApi.addContact({ studentId: targetId, studentName: targetName, briefingDate: data.date, listKey, note });
    setContacts(prev => ({ ...prev, [targetId]: [log, ...(prev[targetId] ?? [])] }));
  }, [data]);

  const removeContact = useCallback(async (log: ContactLog) => {
    await staffApi.removeContact(log.id);
    setContacts(prev => ({ ...prev, [log.studentId]: (prev[log.studentId] ?? []).filter(l => l.id !== log.id) }));
  }, []);

  return { session, date, availableDates, data, contacts, error, loading, loadDate, login, logout, addContact, removeContact };
}
