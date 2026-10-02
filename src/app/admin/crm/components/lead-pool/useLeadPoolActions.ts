'use client';

import { useState } from 'react';
import type { Student, RetryStrategy } from '@/types/crm';

interface UseLeadPoolActionsArgs {
  adminKey: string;
  currentList: Student[];
  onRetryAssignSuccess?: () => void;
}

/** 선택 토글 + 일괄 성공 배너 + 재시도 전략 배정(피커). */
export function useLeadPoolActions({
  adminKey,
  currentList,
  onRetryAssignSuccess,
}: UseLeadPoolActionsArgs) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // ─── Retry strategy assignment ──────────────────────────────────────────────
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [pickerStrategies, setPickerStrategies] = useState<RetryStrategy[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ─── Selection ─────────────────────────────────────────────────────────────

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((s) => s.id)));
    }
  }

  async function openStrategyPicker() {
    setShowStrategyPicker(true);
    if (pickerStrategies.length > 0) return;
    setPickerLoading(true);
    try {
      const res = await fetch('/api/crm/retry-strategies', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setPickerStrategies(json.data ?? []);
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleAssignToStrategy(strategyId: string, strategyName: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/crm/retry-strategies/${strategyId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ student_ids: ids }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setShowStrategyPicker(false);
        setBulkSuccessMessage(`${ids.length}명이 "${strategyName}" 전략에 배정되었습니다.`);
        onRetryAssignSuccess?.();
      } else {
        alert('배정에 실패했습니다.');
      }
    } finally {
      setAssigning(false);
    }
  }

  return {
    selectedIds,
    setSelectedIds,
    bulkSuccessMessage,
    setBulkSuccessMessage,
    showStrategyPicker,
    setShowStrategyPicker,
    pickerStrategies,
    pickerLoading,
    assigning,
    toggleStudent,
    toggleAll,
    openStrategyPicker,
    handleAssignToStrategy,
  };
}
