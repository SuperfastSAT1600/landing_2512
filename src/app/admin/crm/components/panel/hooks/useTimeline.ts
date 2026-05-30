'use client';

import { useState } from 'react';
import type { ConsultationEntry } from '@/types/crm';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Params {
  studentId: string;
  adminKey: string;
  setTimeline: (updater: (prev: ConsultationEntry[]) => ConsultationEntry[]) => void;
  setPendingEdits: (updater: (prev: Record<string, PendingEdit>) => Record<string, PendingEdit>) => void;
}

export function useTimeline({ studentId, adminKey, setTimeline, setPendingEdits }: Params) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function handlePublish(entryId: string, edit: PendingEdit) {
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/publish-memo`, {
        method: 'POST', headers,
        body: JSON.stringify({
          entry_id: entryId, ai_purified: edit.purified,
          ai_deleted_items: edit.deletedItems, ai_coach_history: edit.coachHistory,
        }),
      });
      if (res.ok) {
        setTimeline(prev => prev.map(e =>
          e.id === entryId
            ? { ...e, ai_purified: edit.purified, ai_coach_history: edit.coachHistory, ai_deleted_items: edit.deletedItems, published: true }
            : e
        ));
        setPendingEdits(prev => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      } else {
        const json = await res.json();
        setPublishError(json.error?.message ?? '게시에 실패했습니다.');
      }
    } catch {
      setPublishError('네트워크 오류가 발생했습니다.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish(entryId: string) {
    const res = await fetch(`/api/crm/students/${studentId}/publish-memo`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ entry_id: entryId, action: 'unpublish' }),
    });
    if (res.ok) {
      setTimeline(prev => prev.map(e => e.id === entryId ? { ...e, published: false } : e));
    }
  }

  async function handleDeleteAi(entryId: string) {
    if (!confirm('AI 변환 내용을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/crm/students/${studentId}/publish-memo`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ entry_id: entryId, action: 'delete_ai' }),
    });
    if (res.ok) {
      setTimeline(prev => prev.map(e =>
        e.id === entryId
          ? { ...e, published: false, ai_purified: undefined, ai_deleted_items: undefined, ai_coach_history: undefined }
          : e
      ));
      setPendingEdits(prev => { const next = { ...prev }; delete next[entryId]; return next; });
    }
  }

  return { publishing, publishError, handlePublish, handleUnpublish, handleDeleteAi };
}
