'use client';

import type { ConsultationEntry } from '@/types/crm';
import { TimelineEntry } from './TimelineEntry';
import { SectionCard } from './SectionCard';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Props {
  studentId: string;
  adminKey: string;
  timeline: ConsultationEntry[];
  loadingFresh: boolean;
  publishError: string;
  publishing: boolean;
  memoSaving: string | null;
  aiLoadingFor: string | null;
  pendingEdits: Record<string, PendingEdit>;
  setPendingEdits: (updater: (prev: Record<string, PendingEdit>) => Record<string, PendingEdit>) => void;
  onAiCare: (entry: ConsultationEntry) => void;
  onPublish: (entryId: string, edit: PendingEdit) => void;
  onUnpublish: (entryId: string) => void;
  onDeleteAi: (entryId: string) => void;
  onEditMemo: (entryId: string, newMemo: string) => Promise<boolean>;
}

export function TimelineSection({
  studentId, adminKey, timeline, loadingFresh, publishError, publishing, memoSaving, aiLoadingFor,
  pendingEdits, setPendingEdits, onAiCare, onPublish, onDeleteAi, onEditMemo,
}: Props) {
  return (
    <SectionCard
      title="상담 타임라인"
      count={!loadingFresh ? timeline.length : undefined}
      defaultOpen={false}
    >
      {loadingFresh && (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      )}
      {!loadingFresh && timeline.length === 0 && (
        <p className="text-sm text-gray-400">상담 메모가 없습니다.</p>
      )}
      {publishError && <p className="mb-2 text-xs text-red-500">{publishError}</p>}
      <div className="space-y-3">
        {timeline.map(entry => (
          <TimelineEntry
            key={entry.id}
            studentId={studentId}
            adminKey={adminKey}
            entry={entry}
            aiLoading={aiLoadingFor === entry.id}
            pendingEdit={pendingEdits[entry.id] ?? null}
            publishing={publishing}
            memoSaving={memoSaving === entry.id}
            onAiCare={() => onAiCare(entry)}
            onPublish={() => {
              const edit = pendingEdits[entry.id];
              if (edit) onPublish(entry.id, edit);
            }}
            onChangePurified={v => setPendingEdits(prev =>
              prev[entry.id] ? { ...prev, [entry.id]: { ...prev[entry.id], purified: v } } : prev
            )}
            onStartEdit={() => setPendingEdits(prev => ({
              ...prev,
              [entry.id]: {
                purified: entry.ai_purified ?? '',
                coachHistory: entry.ai_coach_history ?? '',
                deletedItems: entry.ai_deleted_items ?? [],
              },
            }))}
            onDeleteAi={() => onDeleteAi(entry.id)}
            onEditMemo={(newMemo) => onEditMemo(entry.id, newMemo)}
          />
        ))}
      </div>
    </SectionCard>
  );
}
