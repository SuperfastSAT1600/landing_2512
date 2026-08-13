'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  WinbackCandidate,
  WinbackPlay,
  WinbackPlayVariant,
  WinbackRecommendStats,
  WinbackTarget,
} from '@/types/crm';
import type { WinbackDashboard } from '@/lib/winback/dashboard';

export interface PlayRollup {
  targeted: number;
  sent: number;
  responded: number;
  converted: number;
}

export interface WinbackPlayListItem extends WinbackPlay {
  rollup: PlayRollup;
}

export interface WinbackTargetRow extends WinbackTarget {
  student: { id: string; name: string; grade: string; parent_phone?: string | null; lead_status: string; churn_tag: string | null } | null;
}

export interface WinbackPlayDetailData extends WinbackPlay {
  variants: WinbackPlayVariant[];
  targets: WinbackTargetRow[];
}

/** 플레이 목록 + 상세 + 변경 액션. 실패는 문자열 에러로 노출한다(조용히 삼키지 않음). */
export function useWinbackPlays(adminKey: string) {
  const [plays, setPlays] = useState<WinbackPlayListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const call = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? '요청에 실패했습니다.');
      return json.data as T;
    },
    // headers는 adminKey에서만 파생된다.
    [adminKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchPlays = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError(null);
    try {
      setPlays(await call<WinbackPlayListItem[]>('/api/crm/winback-plays'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, call]);

  useEffect(() => {
    fetchPlays();
  }, [fetchPlays]);

  const createPlay = useCallback(
    (input: Record<string, unknown>) =>
      call<WinbackPlayDetailData>('/api/crm/winback-plays', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((play) => {
        fetchPlays();
        return play;
      }),
    [call, fetchPlays]
  );

  const fetchPlay = useCallback(
    (playId: string) => call<WinbackPlayDetailData>(`/api/crm/winback-plays/${playId}`),
    [call]
  );

  const updatePlay = useCallback(
    (playId: string, patch: Record<string, unknown>) =>
      call<WinbackPlay>(`/api/crm/winback-plays/${playId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }).then((play) => {
        fetchPlays();
        return play;
      }),
    [call, fetchPlays]
  );

  const recommend = useCallback(
    (input: Record<string, unknown>) =>
      call<{ candidates: WinbackCandidate[]; stats: WinbackRecommendStats }>(
        '/api/crm/winback/recommend',
        { method: 'POST', body: JSON.stringify(input) }
      ),
    [call]
  );

  const addTargets = useCallback(
    (playId: string, payload: { candidates?: WinbackCandidate[]; student_ids?: string[] }) =>
      call<{ inserted: WinbackTargetRow[]; skipped: number }>(
        `/api/crm/winback-plays/${playId}/targets`,
        { method: 'POST', body: JSON.stringify(payload) }
      ).then((result) => {
        fetchPlays();
        return result;
      }),
    [call, fetchPlays]
  );

  const patchTarget = useCallback(
    (targetId: string, patch: Record<string, unknown>) =>
      call<WinbackTargetRow>(`/api/crm/winback-targets/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    [call]
  );

  const generateDraft = useCallback(
    (targetId: string) =>
      call<WinbackTargetRow>(`/api/crm/winback-targets/${targetId}/draft`, { method: 'POST' }),
    [call]
  );

  const fetchDashboard = useCallback(
    (playId: string) => call<WinbackDashboard>(`/api/crm/winback-plays/${playId}/dashboard`),
    [call]
  );

  const deletePlay = useCallback(
    (playId: string) =>
      call<{ id: string }>(`/api/crm/winback-plays/${playId}`, { method: 'DELETE' }).then(() => {
        fetchPlays();
      }),
    [call, fetchPlays]
  );

  const bulkTargets = useCallback(
    (payload: {
      target_ids: string[];
      action: string;
      author?: string;
      variant_id?: string | null;
      messages?: Record<string, string>;
    }) =>
      call<{ updated: WinbackTargetRow[]; failed: { id: string; error: string }[] }>(
        '/api/crm/winback-targets/bulk',
        { method: 'POST', body: JSON.stringify(payload) }
      ).then((result) => {
        fetchPlays();
        return result;
      }),
    [call, fetchPlays]
  );

  return {
    plays,
    loading,
    error,
    fetchPlays,
    createPlay,
    fetchPlay,
    updatePlay,
    deletePlay,
    recommend,
    addTargets,
    patchTarget,
    generateDraft,
    fetchDashboard,
    bulkTargets,
  };
}
