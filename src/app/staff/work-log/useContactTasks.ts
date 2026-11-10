'use client';

import { useCallback, useEffect, useState } from 'react';
import { kstDate } from '@/lib/kst-date';
import type { ContactTask, ContactTaskKind } from '@/lib/contact-tasks';
import type { WorkItem } from '@/lib/work-log';
import { staffApi } from '../briefing/api';
import type { ContactLog, ContactsByStudent } from '../briefing/types';
import { workLogApi } from './api';

type Loaded = Awaited<ReturnType<typeof workLogApi.contactTasks>>;

/** 연락 업무, 대상별 연락 이력, 학생이 지정된 운영 할 일. refreshKey 가 바뀔 때마다 다시 읽는다 */
export function useContactTasks(refreshKey: number) {
  const [data, setData] = useState<Loaded | null>(null);
  const [contacts, setContacts] = useState<ContactsByStudent>({});
  const [workItems, setWorkItems] = useState<Record<string, WorkItem[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);

  useEffect(() => {
    workLogApi.contactTasks()
      .then(async d => {
        const ids = [...new Set(d.groups.flatMap(g => g.tasks.map(t => t.targetId)))];
        const studentIds = ids.filter(id => !id.startsWith('coach:'));
        const [byTarget, byStudent] = await Promise.all([
          ids.length ? staffApi.contacts(ids) : {},
          studentIds.length ? workLogApi.studentWorkItems(studentIds) : {},
        ]);
        setData(d);
        setContacts(byTarget);
        setWorkItems(byStudent);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => setLoadedKey(refreshKey));
  }, [refreshKey]);

  const addContact = useCallback(async (task: ContactTask, kind: ContactTaskKind, note?: string) => {
    const log = await staffApi.addContact({ studentId: task.targetId, studentName: task.name, briefingDate: kstDate(new Date()), listKey: kind, note });
    setContacts(prev => ({ ...prev, [task.targetId]: [log, ...(prev[task.targetId] ?? [])] }));
  }, []);

  const removeContact = useCallback(async (log: ContactLog) => {
    await staffApi.removeContact(log.id);
    setContacts(prev => ({ ...prev, [log.studentId]: (prev[log.studentId] ?? []).filter(l => l.id !== log.id) }));
  }, []);

  return { data, contacts, workItems, error, loading: loadedKey !== refreshKey, addContact, removeContact };
}
