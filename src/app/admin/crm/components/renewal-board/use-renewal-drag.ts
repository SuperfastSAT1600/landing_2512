'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  RENEWAL_OPEN_STAGES,
  RENEWAL_STAGES,
  isRenewalCarried,
  type RenewalStage,
  type RenewalTarget,
} from '@/types/crm';

interface UseRenewalDragOptions {
  targets: RenewalTarget[];
  setTargets: Dispatch<SetStateAction<RenewalTarget[]>>;
  setError: (message: string | null) => void;
  refresh: () => Promise<void>;
  patchTarget: (id: string, body: Record<string, unknown>) => Promise<void>;
}

/** 진행 단계(1~3) 사이의 드래그 이동 — 낙관적 반영 후 실패 시 되돌린다. */
export function useRenewalDrag({
  targets,
  setTargets,
  setError,
  refresh,
  patchTarget,
}: UseRenewalDragOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const target = targets.find((t) => t.id === active.id);
    if (!target) return;
    // 이월된 행은 다음 주차로 넘어가 종결됐다 — 되살리지 않는다.
    if (isRenewalCarried(target)) return;

    const overStage = RENEWAL_STAGES.includes(over.id as RenewalStage)
      ? (over.id as RenewalStage)
      : targets.find((t) => t.id === over.id)?.stage;
    if (!overStage || overStage === target.stage) return;
    // 터미널 단계는 드래그로 오갈 수 없다 — 결제/미전환 버튼만이 진입 경로다.
    if (!RENEWAL_OPEN_STAGES.includes(overStage) || !RENEWAL_OPEN_STAGES.includes(target.stage)) {
      return;
    }

    const previous = target;
    setTargets((current) =>
      current.map((t) =>
        t.id === target.id
          ? { ...t, stage: overStage, stage_updated_at: new Date().toISOString() }
          : t
      )
    );
    try {
      await patchTarget(target.id, { stage: overStage });
      await refresh();
    } catch (e) {
      setTargets((current) => current.map((t) => (t.id === previous.id ? previous : t)));
      setError(e instanceof Error ? e.message : '이동에 실패했습니다.');
    }
  };

  return { activeId, handleDragStart, handleDragEnd };
}
