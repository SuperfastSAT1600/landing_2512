'use client';

import { useState, useEffect } from 'react';
import { useWinbackPlays } from '../winback/hooks/useWinbackPlays';

export type PlayTarget = { rank: number | null; score: number | null; sent: boolean };

interface UseLeadPoolPlayArgs {
  winback: ReturnType<typeof useWinbackPlays>;
  selectedIds: Set<string>;
  clearSelection: () => void;
  setBulkSuccessMessage: (message: string | null) => void;
}

// ─── Winback play ───────────────────────────────────────────────────────────
// 리드풀에서 진행 중 플레이를 고르면 카드에 타겟 배지가 붙고 선택 리드를 그 플레이에 담을 수 있다.
export function useLeadPoolPlay({
  winback,
  selectedIds,
  clearSelection,
  setBulkSuccessMessage,
}: UseLeadPoolPlayArgs) {
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [playTargets, setPlayTargets] = useState<Map<string, PlayTarget>>(new Map());
  const [addingToPlay, setAddingToPlay] = useState(false);

  // 선택한 플레이의 타겟 현황 — 리드 카드에 배지로 표시한다.
  useEffect(() => {
    if (!selectedPlayId) {
      setPlayTargets(new Map());
      return;
    }
    let cancelled = false;
    winback
      .fetchPlay(selectedPlayId)
      .then((play) => {
        if (cancelled) return;
        setPlayTargets(
          new Map(
            play.targets.map((t) => [
              t.student_id,
              { rank: t.rank, score: t.score, sent: Boolean(t.sent_at) },
            ])
          )
        );
      })
      .catch(() => {
        if (!cancelled) setPlayTargets(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlayId, winback.fetchPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Winback: 선택한 리드를 플레이에 담기 ───────────────────────────────────

  async function handleAddToPlay() {
    const ids = Array.from(selectedIds);
    if (!selectedPlayId || ids.length === 0) return;
    setAddingToPlay(true);
    try {
      const result = await winback.addTargets(selectedPlayId, { student_ids: ids });
      clearSelection();
      const skipped = result.skipped > 0 ? ` (중복 ${result.skipped}명 제외)` : '';
      setBulkSuccessMessage(`${result.inserted.length}명을 캠페인에 추가했습니다.${skipped}`);
      setPlayTargets((prev) => {
        const next = new Map(prev);
        for (const t of result.inserted) next.set(t.student_id, { rank: t.rank, score: t.score, sent: false });
        return next;
      });
    } catch (err) {
      setBulkSuccessMessage(null);
      alert(`캠페인 추가에 실패했습니다: ${(err as Error).message}`);
    } finally {
      setAddingToPlay(false);
    }
  }

  return {
    selectedPlayId,
    setSelectedPlayId,
    showPlayModal,
    setShowPlayModal,
    playTargets,
    addingToPlay,
    handleAddToPlay,
  };
}
