'use client';

import { useState } from 'react';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import {
  PARTY_LABELS,
  PARTY_COLORS,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
  TRIGGER_BADGE_LABELS,
  RESOLUTION_LABELS,
} from '@/app/admin/srm/comm-constants';

export type { CommEntry };

const PARTY_ACTIVE: Record<string, string> = {
  student: 'bg-blue-600 text-white border-blue-600',
  parent: 'bg-purple-600 text-white border-purple-600',
  coach: 'bg-green-600 text-white border-green-600',
  us: 'bg-red-600 text-white border-red-600',
};

export interface TriggerContext {
  type: string;
  label: string;
  autoCount?: number;
}

export interface EventContext {
  eventId: string;
  time: string;
  type: 'coachRoom' | 'studyHall';
}

interface AddFormProps {
  onSave: (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => Promise<void>;
  saving: boolean;
  triggerContext?: TriggerContext;
  eventContext?: EventContext;
  noBorder?: boolean;
}

const ALL_PARTIES = ['student', 'parent', 'coach', 'us'] as const;

export function AddForm({ onSave, saving, triggerContext, eventContext, noBorder }: AddFormProps) {
  const [parties, setParties] = useState<Set<string>>(new Set(['student']));
  const [channel, setChannel] = useState<string>('kakao');
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');

  const toggleParty = (p: string) => {
    setParties((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev; // 최소 1개 유지
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || parties.size === 0) return;
    await onSave({
      parties: Array.from(parties),
      channel,
      content: content.trim(),
      reason: reason.trim() || undefined,
    });
    setContent('');
    setReason('');
    setParties(new Set(['student']));
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-3${noBorder ? '' : ' border-t border-gray-200 pt-4 mt-4'}`}>
      {triggerContext && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md">
          <span className="text-orange-600 text-xs">!</span>
          <span className="text-xs text-orange-700">{triggerContext.label}</span>
        </div>
      )}

      {/* 이벤트 컨텍스트 */}
      {eventContext && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
          <span className="text-[11px] text-gray-500">이벤트</span>
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
            eventContext.type === 'coachRoom' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {eventContext.type === 'coachRoom' ? '수업' : '스터디홀'}
          </span>
          <span className="text-[11px] text-gray-600 font-mono">{eventContext.time}</span>
        </div>
      )}

      {/* 관련 대상 — 복수 선택 */}
      <div>
        <p className="text-[11px] text-gray-600 mb-1.5">관련 대상</p>
        <div className="flex gap-1.5">
          {ALL_PARTIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleParty(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                parties.has(p) ? PARTY_ACTIVE[p] : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {PARTY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 채널 */}
      <select
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-500"
      >
        <option value="kakao" className="bg-white text-gray-800">카카오</option>
        <option value="call" className="bg-white text-gray-800">전화</option>
        <option value="sms" className="bg-white text-gray-800">SMS</option>
        <option value="email" className="bg-white text-gray-800">이메일</option>
        <option value="slack" className="bg-white text-gray-800">슬랙</option>
        <option value="other" className="bg-white text-gray-800">기타</option>
      </select>

      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="지각 이유, 스케줄 미잡힌 이유 등 (선택)"
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="커뮤니케이션 내용 입력..."
        rows={3}
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 resize-none"
      />
      <button
        type="submit"
        disabled={saving || !content.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-md transition-colors"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}

interface Props {
  entries: CommEntry[];
  loading: boolean;
  saving: boolean;
  onAdd: (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => Promise<void>;
  triggerContext?: TriggerContext;
  eventContext?: EventContext;
}

function resolveParties(entry: CommEntry): string[] {
  if (entry.parties && entry.parties.length > 0) return entry.parties;
  if (entry.target) return [entry.target];
  return [];
}

export function CommLog({ entries, loading, saving, onAdd, triggerContext, eventContext }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-600 py-2">기록된 커뮤니케이션이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const effectiveParties = resolveParties(e);
            return (
              <div key={e.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLORS[e.channel]}`}>
                    {CHANNEL_LABELS[e.channel]}
                  </span>
                  {effectiveParties.map((p) => (
                    <span key={p} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${PARTY_COLORS[p] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {PARTY_LABELS[p] ?? p}
                    </span>
                  ))}
                  {e.trigger_type && e.trigger_type !== 'manual' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {TRIGGER_BADGE_LABELS[e.trigger_type] ?? e.trigger_type}
                    </span>
                  )}
                  {e.resolution && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 ml-auto">
                      {RESOLUTION_LABELS[e.resolution] ?? e.resolution}
                    </span>
                  )}
                  <span className={`text-[11px] text-gray-600 ${e.resolution ? '' : 'ml-auto'}`}>
                    {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    {e.author && ` · ${e.author}`}
                  </span>
                </div>
                {e.reason && (
                  <p className="text-[11px] text-gray-500 mb-1">사유: {e.reason}</p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{e.content}</p>
              </div>
            );
          })}
        </div>
      )}
      <AddForm onSave={onAdd} saving={saving} triggerContext={triggerContext} eventContext={eventContext} />
    </div>
  );
}
