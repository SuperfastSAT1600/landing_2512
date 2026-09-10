'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_RETROSPECTIVE,
  type WeeklyPlan,
  type WeeklyPlanResponse,
  type WeeklyPlanSegment,
} from '@/types/crm';

/** PUT에 보낼 수 있는 필드 — 보낸 키만 서버에서 갱신된다(부분 업데이트). */
export type WeeklyPlanPatch = Partial<
  Pick<WeeklyPlan, 'tracks' | 'targets' | 'actions' | 'focus_strategies' | 'retrospective' | 'execution_notes'>
>;

export function emptyWeeklyPlan(segment: WeeklyPlanSegment, weekStart: string): WeeklyPlan {
  return {
    id: '',
    segment,
    week_start: weekStart,
    tracks: [],
    targets: [],
    actions: [],
    focus_strategies: [],
    retrospective: { ...EMPTY_RETROSPECTIVE },
    execution_notes: [],
    created_at: '',
    updated_at: '',
  };
}

const authHeaders = (adminKey: string) => ({ 'x-admin-key': adminKey });

/** 주차 계획 조회 + 부분 저장. 저장은 낙관적으로 반영하고 실패 시 되돌린다. */
export function useWeeklyPlan(segment: WeeklyPlanSegment, adminKey: string, weekStart: string | null) {
  const [data, setData] = useState<WeeklyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!weekStart) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crm/weekly-plan?segment=${segment}&week_start=${weekStart}`, {
        headers: authHeaders(adminKey),
      });
      const json = await res.json();
      if (res.ok && json.data) setData(json.data as WeeklyPlanResponse);
      else setError(json.error ?? '주차 계획을 불러오지 못했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [segment, weekStart, adminKey]);

  useEffect(() => { load(); }, [load]);

  const plan = data?.plan ?? (weekStart ? emptyWeeklyPlan(segment, weekStart) : null);

  const save = useCallback(
    async (patch: WeeklyPlanPatch) => {
      if (!weekStart) return;
      const prev = data;
      // 낙관적 반영 — 서버 응답(정제 결과)으로 다시 덮는다.
      setData((cur) =>
        cur ? { ...cur, plan: { ...(cur.plan ?? emptyWeeklyPlan(segment, weekStart)), ...patch } } : cur,
      );
      try {
        const res = await fetch('/api/crm/weekly-plan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders(adminKey) },
          body: JSON.stringify({ segment, week_start: weekStart, ...patch }),
        });
        if (!res.ok) throw new Error('save failed');
        const json = await res.json();
        setData((cur) => (cur ? { ...cur, plan: json.data as WeeklyPlan } : cur));
      } catch {
        setData(prev);
        setError('저장에 실패했습니다.');
      }
    },
    [segment, weekStart, adminKey, data],
  );

  return { data, plan, loading, error, reload: load, save };
}

/** 다른 주차에 항목을 이어붙인다(회고 → 다음 주 이어받기). 해당 주차의 기존 내용은 보존. */
export async function appendToWeek(
  segment: WeeklyPlanSegment,
  adminKey: string,
  weekStart: string,
  patchOf: (plan: WeeklyPlan) => WeeklyPlanPatch,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/crm/weekly-plan?segment=${segment}&week_start=${weekStart}`, {
      headers: authHeaders(adminKey),
    });
    const json = await res.json();
    if (!res.ok) return false;
    const target = (json.data as WeeklyPlanResponse).plan ?? emptyWeeklyPlan(segment, weekStart);
    const put = await fetch('/api/crm/weekly-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(adminKey) },
      body: JSON.stringify({ segment, week_start: weekStart, ...patchOf(target) }),
    });
    return put.ok;
  } catch {
    return false;
  }
}
