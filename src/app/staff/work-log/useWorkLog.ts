'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorkItem } from '@/lib/work-log';
import { ApiFailure, staffApi } from '../briefing/api';
import type { StaffUser } from '../briefing/types';
import { workLogApi } from './api';

type SessionState = 'loading' | 'signed-out' | StaffUser;

export function useWorkLog() {
  const [session, setSession] = useState<SessionState>('loading');
  const [items, setItems] = useState<WorkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await workLogApi.items());
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 401) setSession('signed-out');
      else setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    staffApi.session().then(user => { setSession(user); return load(); }).catch(() => setSession('signed-out'));
  }, [load]);

  const login = useCallback(async (email: string, password: string) => {
    setSession(await staffApi.login(email, password));
    await load();
  }, [load]);

  const logout = useCallback(async () => {
    await staffApi.logout();
    setSession('signed-out');
    setItems([]);
  }, []);

  const setStudent = useCallback(async (messageTs: string, studentId: string | null) => {
    setError(null);
    try {
      const student = await workLogApi.setStudent(messageTs, studentId);
      setItems(prev => prev.map(i => (i.messageTs === messageTs ? { ...i, student } : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '학생을 저장하지 못했습니다.');
    }
  }, []);

  const dismiss = useCallback(async (item: WorkItem) => {
    setError(null);
    try {
      const dismissed = await workLogApi.dismiss('slack', item.messageTs, item.text.slice(0, 80) || '(첨부만 있는 글)');
      setItems(prev => prev.map(i => (i.messageTs === item.messageTs ? { ...i, dismissed } : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
    }
  }, []);

  const restore = useCallback(async (messageTs: string) => {
    setError(null);
    try {
      await workLogApi.restore('slack', messageTs);
      setItems(prev => prev.map(i => (i.messageTs === messageTs ? { ...i, dismissed: null } : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '복구하지 못했습니다.');
    }
  }, []);

  return { session, items, error, loading, load, login, logout, setStudent, dismiss, restore };
}
