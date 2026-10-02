'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { RenewalOutcomeQuality, RenewalTarget } from '@/types/crm';
import { apiErrorMessage } from '@/lib/api-error';

interface UseRenewalMutationsOptions {
  adminKey: string;
  /** 타임라인·슬랙에 남길 작성자. */
  userName?: string;
  setTargets: Dispatch<SetStateAction<RenewalTarget[]>>;
  setError: (message: string | null) => void;
  refresh: () => Promise<void>;
}

export type OutcomeInput = {
  quality: RenewalOutcomeQuality;
  reasonTag: string;
  reasonNote: string;
} | null;

/** 타깃 추가·수정·삭제 — 낙관적 반영 후 실패 시에만 되돌리는 변경 모음. */
export function useRenewalMutations({
  adminKey,
  userName,
  setTargets,
  setError,
  refresh,
}: UseRenewalMutationsOptions) {
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  const patchTarget = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await fetch(`/api/crm/renewal-targets/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // 사유 검증 400 같은 건 사용자가 이유를 알아야 고칠 수 있다.
        const json = await res.json().catch(() => null);
        throw new Error(apiErrorMessage(json, '단계 변경에 실패했습니다.'));
      }
    },
    [adminKey]
  );

  const handleAdd = async (studentId: string) => {
    setPendingStudentId(studentId);
    try {
      const res = await fetch('/api/crm/renewal-targets', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(json, '추가에 실패했습니다.'));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가에 실패했습니다.');
    } finally {
      setPendingStudentId(null);
    }
  };

  const runPatch = async (target: RenewalTarget, body: Record<string, unknown>, failMsg: string) => {
    try {
      await patchTarget(target.id, body);
      await refresh();
    } catch {
      setError(failMsg);
    }
  };

  /** 메모는 카드에서 바로 저장한다 — 낙관적 반영 후 실패 시에만 되돌린다. */
  const handleMemoSave = async (target: RenewalTarget, memo: string) => {
    const previous = target.memo ?? null;
    const next = memo.trim() === '' ? null : memo.trim();
    if (next === previous) return;

    setTargets((current) =>
      current.map((t) => (t.id === target.id ? { ...t, memo: next } : t))
    );
    try {
      await patchTarget(target.id, { memo: next });
    } catch {
      setTargets((current) =>
        current.map((t) => (t.id === target.id ? { ...t, memo: previous } : t))
      );
      setError('메모 저장에 실패했습니다.');
    }
  };

  /** 컨택 예정일 — 메모와 같이 단계와 독립이며 낙관적으로 반영한다. 정렬이 즉시 따라온다. */
  const handleContactDateSave = async (target: RenewalTarget, date: string | null) => {
    const previous = target.next_contact_date ?? null;
    if (date === previous) return;

    setTargets((current) =>
      current.map((t) => (t.id === target.id ? { ...t, next_contact_date: date } : t))
    );
    try {
      await patchTarget(target.id, { next_contact_date: date });
    } catch {
      setTargets((current) =>
        current.map((t) => (t.id === target.id ? { ...t, next_contact_date: previous } : t))
      );
      setError('컨택 예정일 저장에 실패했습니다.');
    }
  };

  /**
   * 결과 품질·사유 저장. 즉각 반응이 필요하므로 드래그와 같은 낙관적 업데이트를 쓴다.
   * quality 가 null 이면 사유까지 함께 비운다(미분류로 되돌리기).
   */
  const saveOutcome = async (target: RenewalTarget, next: OutcomeInput) => {
    const previous = target;
    setTargets((current) =>
      current.map((t) =>
        t.id === target.id
          ? {
              ...t,
              outcome_quality: next?.quality ?? null,
              outcome_reason_tag: next?.reasonTag ?? null,
              outcome_reason_note: next?.reasonNote || null,
            }
          : t
      )
    );
    try {
      await patchTarget(target.id, {
        outcome_quality: next?.quality ?? null,
        outcome_reason_tag: next?.reasonTag ?? null,
        outcome_reason_note: next?.reasonNote ?? null,
        author: userName,
      });
      await refresh();
    } catch (e) {
      setTargets((current) => current.map((t) => (t.id === previous.id ? previous : t)));
      setError(e instanceof Error ? e.message : '결과 저장에 실패했습니다.');
    }
  };

  const handleRemove = async (target: RenewalTarget) => {
    try {
      const res = await fetch(`/api/crm/renewal-targets/${target.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  return {
    patchTarget,
    pendingStudentId,
    handleAdd,
    runPatch,
    handleMemoSave,
    handleContactDateSave,
    saveOutcome,
    handleRemove,
  };
}
