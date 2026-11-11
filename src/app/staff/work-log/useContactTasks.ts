'use client';

import { useCallback, useEffect, useState } from 'react';
import { kstDate } from '@/lib/kst-date';
import type { WorkItem } from '@/lib/work-log';
import type { Dismissal } from '@/lib/work-log-dismissals';
import { staffApi } from '../briefing/api';
import type { ContactLog, ContactsByStudent } from '../briefing/types';
import { workLogApi } from './api';

type Loaded = Awaited<ReturnType<typeof workLogApi.contactTasks>>;

/** 수업 관리 업무, 대상별 연락 이력, 학생이 지정된 운영 업무, 삭제한 대상. refreshKey 가 바뀔 때마다 다시 읽는다 */
export function useContactTasks(refreshKey: number) {
  const [data, setData] = useState<Loaded | null>(null);
  const [contacts, setContacts] = useState<ContactsByStudent>({});
  const [workItems, setWorkItems] = useState<Record<string, WorkItem[]>>({});
  const [dismissed, setDismissed] = useState<Record<string, Dismissal>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);

  useEffect(() => {
    workLogApi.contactTasks()
      .then(async d => {
        const studentIds = d.students.map(s => s.studentId);
        const ids = [...studentIds, ...d.coaches.map(c => c.targetId)];
        const [byTarget, byStudent] = await Promise.all([
          ids.length ? staffApi.contacts(ids) : {},
          studentIds.length ? workLogApi.studentWorkItems(studentIds) : {},
        ]);
        setData(d);
        setContacts(byTarget);
        setWorkItems(byStudent);
        setDismissed(d.dismissed ?? {});
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => setLoadedKey(refreshKey));
  }, [refreshKey]);

  /** targetId 는 학생 profile id 또는 coach:<key>, listKey 는 용건 */
  const addContact = useCallback(async (targetId: string, name: string, listKey: string, note: string) => {
    const log = await staffApi.addContact({ studentId: targetId, studentName: name, briefingDate: kstDate(new Date()), listKey, note });
    setContacts(prev => ({ ...prev, [targetId]: [log, ...(prev[targetId] ?? [])] }));
  }, []);

  const removeContact = useCallback(async (log: ContactLog) => {
    await staffApi.removeContact(log.id);
    setContacts(prev => ({ ...prev, [log.studentId]: (prev[log.studentId] ?? []).filter(l => l.id !== log.id) }));
  }, []);

  const dismiss = useCallback(async (targetId: string, name: string) => {
    const d = await workLogApi.dismiss('contact', targetId, name);
    setDismissed(prev => ({ ...prev, [targetId]: d }));
  }, []);

  const restore = useCallback(async (targetId: string) => {
    await workLogApi.restore('contact', targetId);
    setDismissed(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== targetId)));
  }, []);

  return { data, contacts, workItems, dismissed, error, loading: loadedKey !== refreshKey, addContact, removeContact, dismiss, restore };
}
