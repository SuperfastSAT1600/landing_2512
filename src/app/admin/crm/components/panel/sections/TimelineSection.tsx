'use client';

import type { ConsultationEntry } from '@/types/crm';
import { TimelineEntry } from './TimelineEntry';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Props {
  timeline: ConsultationEntry[];
  loadingFresh: boolean;
  publishError: string;
  publishing: boolean;
  aiLoadingFor: string | null;
  pendingEdits: Record<string, PendingEdit>;
  setPendingEdits: (updater: (prev: Record<string, PendingEdit>) => Record<string, PendingEdit>) => void;
  onAiCare: (entry: ConsultationEntry) => void;
  onPublish: (entryId: string, edit: PendingEdit) => void;
  onUnpublish: (entryId: string) => void;
  onDeleteAi: (entryId: string) => void;
}

export function TimelineSection({
  timeline, loadingFresh, publishError, publishing, aiLoadingFor,
  pendingEdits, setPendingEdits, onAiCare, onPublish, onDeleteAi,
}: Props) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-2" style={{ letterSpacing: '0.3px' }}>
        상담 타임라인
        {!loadingFresh && timeline.length > 0 && (
          <span className="text-gray-400 font-normal ml-1">({timeline.length}건)</span>
        )}
      </p>
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
            entry={entry}
            aiLoading={aiLoadingFor === entry.id}
            pendingEdit={pendingEdits[entry.id] ?? null}
            publishing={publishing}
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
          />
        ))}
      </div>
    </section>
  );
}
