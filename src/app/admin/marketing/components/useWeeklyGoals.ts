'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';

/**
 * 한 주차의 총합 목표와 소스별 실적을 읽고, 목표만 저장하는 훅.
 *
 * 입력값이 빈 문자열이면 DELETE 로 "미설정"으로 되돌리고, 0 은 PUT 으로 저장한다(다른 상태다).
 * 주차를 빠르게 넘기면 응답이 순서를 뒤집어 도착할 수 있어 requested ref 로 막는다.
 */
export function useWeeklyGoals(weekStart: string, adminKey: string) {
  const [snapshot, setSnapshot] = useState<WeeklyGoalRow | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const requested = useRef(weekStart);

  const load = useCallback(async () => {
    requested.current = weekStart;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/marketing/goal-history?week_start=${weekStart}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (requested.current !== weekStart) return; // 더 최신 주차 요청이 있었다
      const row = json.data?.weeks?.[0];
      if (row) {
        setSnapshot(row);
        setDraft(row.target === null ? '' : String(row.target));
      }
    } catch {
      /* 조회 실패 시 이전 화면을 유지한다 */
    } finally {
      if (requested.current === weekStart) setLoading(false);
    }
  }, [weekStart, adminKey]);

  // 주차가 바뀌면 새 데이터가 오기 전에 비운다 — 라벨과 값이 어긋나면 그대로 오독된다.
  useEffect(() => {
    setSnapshot(null);
    setDraft('');
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const baseline = snapshot?.target == null ? '' : String(snapshot.target);
  const dirty = draft !== baseline;

  const save = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };
      const res = draft === ''
        ? await fetch(`/api/crm/marketing/goals?week_start=${weekStart}`, { method: 'DELETE', headers })
        : await fetch('/api/crm/marketing/goals', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ week_start: weekStart, target_count: Number(draft) }),
          });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? '목표 저장에 실패했습니다.');
        return false;
      }
      await load();
      return true;
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, weekStart, adminKey, load]);

  return { snapshot, draft, setDraft, loading, saving, dirty, save, reload: load };
}
