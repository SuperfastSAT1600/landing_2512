'use client';

import { useState } from 'react';
import type { ConsultationEntry } from '@/types/crm';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Params {
  studentId: string;
  adminKey: string;
  userName?: string;
  setTimeline: (updater: (prev: ConsultationEntry[]) => ConsultationEntry[]) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

export function useMemoSection({ studentId, adminKey, userName, setTimeline, onUpdate }: Params) {
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
    if (!memoText.trim()) return;
    setSavingMemo(true);
    setMemoError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/memo`, {
        method: 'POST', headers, body: JSON.stringify({ raw_memo: memoText.trim(), author: userName || undefined }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const newEntry: ConsultationEntry = json.data;
        setTimeline(prev => [newEntry, ...prev]);
        setMemoText('');
        onUpdate(studentId, { last_contacted_at: new Date().toISOString() });
        triggerAiCare(newEntry);
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
