'use client';

import type { ConsultationEntry } from '@/types/crm';
import { TimelineEntry } from './TimelineEntry';
import { SectionCard } from './SectionCard';
import { resolveCrmLabels, type CrmLabels } from '@/lib/crm-labels';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Props {
  studentId: string;
  adminKey: string;
  timeline: ConsultationEntry[];
  loadingFresh: boolean;
  openSignal?: number;
  /** 미지정 시 한글(기본). 국제학교 데모 등에서 영문 사전을 주입한다. */
  labels?: Partial<CrmLabels>;
  /** true면 섹션을 기본 펼침으로 연다. */
  defaultOpen?: boolean;
  /** true면 항목의 수정·삭제 액션을 감춘다(읽기 전용 표시용). */
  readOnly?: boolean;
  /** 하이라이트할 항목 id — 근거 메모로 점프할 때 사용. */
  highlightId?: string | null;
  /** true면 각 항목을 아코디언으로 접는다(좁은 화면용). 미지정 시 기존 동작. */
  collapsibleEntries?: boolean;
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
  onDeleteMemo: (entryId: string) => void;
}

export function TimelineSection({
  studentId, adminKey, timeline, loadingFresh, openSignal, publishError, publishing, memoSaving, aiLoadingFor,
  pendingEdits, setPendingEdits, onAiCare, onPublish, onDeleteAi, onEditMemo, onDeleteMemo,
  labels, defaultOpen = false, readOnly = false, highlightId = null, collapsibleEntries = false,
}: Props) {
  const L = resolveCrmLabels(labels);
  return (
    <SectionCard
      title={L.timelineTitle}
      count={!loadingFresh ? timeline.length : undefined}
      defaultOpen={defaultOpen}
      openSignal={openSignal}
    >
      {loadingFresh && (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      )}
      {!loadingFresh && timeline.length === 0 && (
        <p className="text-sm text-gray-400">{L.timelineEmpty}</p>
      )}
      {publishError && <p className="mb-2 text-xs text-red-500">{publishError}</p>}
      <div className="space-y-3">
        {timeline.map(entry => (
          <TimelineEntry
            key={entry.id}
            studentId={studentId}
            adminKey={adminKey}
            entry={entry}
            labels={labels}
            readOnly={readOnly}
            collapsible={collapsibleEntries}
            highlighted={highlightId === entry.id}
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
            onDeleteMemo={() => onDeleteMemo(entry.id)}
          />
        ))}
      </div>
    </SectionCard>
  );
}
