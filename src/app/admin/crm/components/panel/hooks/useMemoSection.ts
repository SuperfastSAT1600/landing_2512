'use client';

import { useState } from 'react';
import type { ConsultationEntry, Attachment } from '@/types/crm';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Params {
  studentId: string;
  adminKey: string;
  userName?: string;
  setTimeline: (updater: (prev: ConsultationEntry[]) => ConsultationEntry[]) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  /** 저장 시 함께 보낼 업로드 완료된 첨부 (없으면 빈 배열). */
  getAttachments?: () => Attachment[];
  /** 저장 성공 후 staged 첨부 초기화. */
  clearAttachments?: () => void;
}

export function useMemoSection({ studentId, adminKey, userName, setTimeline, onUpdate, getAttachments, clearAttachments }: Params) {
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoError, setMemoError] = useState('');
  const [aiLoadingFor, setAiLoadingFor] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function triggerAiCare(entry: ConsultationEntry) {
    setAiLoadingFor(entry.id);
    try {
      const res = await fetch('/api/crm/ai-care', {
        method: 'POST', headers, body: JSON.stringify({ raw_memo: entry.raw_memo }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setPendingEdits(prev => ({
          ...prev,
          [entry.id]: {
            purified: json.data.purified,
            coachHistory: json.data.coach_history,
            deletedItems: json.data.deleted_items,
          },
        }));
      }
    } finally {
      setAiLoadingFor(null);
    }
  }

  async function handleAddMemo() {
    const attachments = getAttachments?.() ?? [];
    if (!memoText.trim() && attachments.length === 0) return;
    setSavingMemo(true);
    setMemoError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/memo`, {
        method: 'POST', headers,
        body: JSON.stringify({ raw_memo: memoText.trim(), author: userName || undefined, attachments }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const newEntry: ConsultationEntry = json.data;
        // 재진입 시(DB append 순서)와 동일하게 created_at 오름차순으로 정렬해 표시
        setTimeline(prev => [...prev, newEntry].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
        setMemoText('');
        clearAttachments?.();
        onUpdate(studentId, { last_contacted_at: new Date().toISOString() });
        // AI 변환 기능 숨김(2026-08-07): UI 제거에 맞춰 메모 저장 시 자동 AI 변환도 중단(불필요한 API 비용 방지).
        // 되살리려면 아래 한 줄을 복원: if (newEntry.raw_memo.trim()) triggerAiCare(newEntry);
      } else {
        setMemoError(json.error?.message ?? '메모 저장에 실패했습니다.');
      }
    } catch {
      setMemoError('네트워크 오류가 발생했습니다.');
    } finally {
      setSavingMemo(false);
    }
  }

  return {
    memoText, setMemoText,
    savingMemo, memoError, setMemoError,
    aiLoadingFor,
    pendingEdits, setPendingEdits,
    handleAddMemo, triggerAiCare,
  };
}
