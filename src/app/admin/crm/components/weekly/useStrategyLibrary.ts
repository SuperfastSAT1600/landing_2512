'use client';

import { useEffect, useState } from 'react';
import type { RetryStrategy, WeeklyPlanSegment } from '@/types/crm';

/** 세그먼트별 전략 라이브러리 조회 — 항목 전략 연결과 적용 기록이 함께 쓴다. */
export function useStrategyLibrary(segment: WeeklyPlanSegment, adminKey: string, enabled = true) {
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch(`/api/crm/retry-strategies?segment=${segment}`, { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((j) => { if (alive) setStrategies((j.data ?? []) as RetryStrategy[]); })
      .catch(() => { if (alive) setStrategies([]); });
    return () => { alive = false; };
  }, [segment, adminKey, enabled]);

  return strategies;
}
