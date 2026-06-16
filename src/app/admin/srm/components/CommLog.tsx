'use client';

import { useState } from 'react';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';

export type { CommEntry };

const PARTY_LABELS: Record<string, string> = {
  student: '학생',
  parent: '학부모',
  coach: '코치',
  us: '우리',
};

const PARTY_COLORS: Record<string, string> = {
  student: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  parent: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  coach: 'bg-green-500/20 text-green-300 border-green-500/30',
  us: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const PARTY_ACTIVE: Record<string, string> = {
  student: 'bg-blue-500 text-white border-blue-500',
  parent: 'bg-purple-500 text-white border-purple-500',
  coach: 'bg-green-500 text-white border-green-500',
  us: 'bg-red-500 text-white border-red-500',
};

const CHANNEL_LABELS = { kakao: '카카오', call: '전화', sms: 'SMS', email: '이메일', other: '기타' };
const CHANNEL_COLORS: Record<string, string> = {
  kakao: 'bg-yellow-500/20 text-yellow-300',
  call: 'bg-blue-500/20 text-blue-300',
  sms: 'bg-green-500/20 text-green-300',
  email: 'bg-purple-500/20 text-purple-300',
  other: 'bg-gray-500/20 text-gray-300',
};

const TRIGGER_BADGE_LABELS: Record<string, string> = {
  no_show: '미접속',
  late: '지각',
  no_class: '수업미잡힘',
  no_study_hall: '스터디홀미세팅',
};

const RESOLUTION_LABELS: Record<string, string> = {
  scheduled: '일정잡음',
  will_contact: '다음연락',
  no_intent: '의향없음',
  unreachable: '연락불가',
  resolved: '해결됨',
  other: '기타',
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
  const [resolution, setResolution] = useState('');

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
      resolution: resolution || undefined,
    });
    setContent('');
    setReason('');
    setResolution('');
    setParties(new Set(['student']));
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-3${noBorder ? '' : ' border-t border-white/10 pt-4 mt-4'}`}>
      {triggerContext && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
          <span className="text-orange-400 text-xs">!</span>
          <span className="text-xs text-orange-300">{triggerContext.label}</span>
        </div>
      )}

      {/* 이벤트 컨텍스트 */}
      {eventContext && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md">
          <span className="text-[11px] text-gray-500">이벤트</span>
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
            eventContext.type === 'coachRoom' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
          }`}>
            {eventContext.type === 'coachRoom' ? '수업' : '스터디홀'}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">{eventContext.time}</span>
        </div>
      )}

      {/* 관련 대상 — 복수 선택 */}
      <div>
        <p className="text-[11px] text-gray-500 mb-1.5">관련 대상</p>
        <div className="flex gap-1.5">
          {ALL_PARTIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleParty(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                parties.has(p) ? PARTY_ACTIVE[p] : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
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
        className="w-full bg-[#1a1c1f] border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500 [color-scheme:dark]"
      >
        <option value="kakao" className="bg-[#1a1c1f] text-gray-200">카카오</option>
        <option value="call" className="bg-[#1a1c1f] text-gray-200">전화</option>
        <option value="sms" className="bg-[#1a1c1f] text-gray-200">SMS</option>
        <option value="email" className="bg-[#1a1c1f] text-gray-200">이메일</option>
        <option value="other" className="bg-[#1a1c1f] text-gray-200">기타</option>
      </select>

      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="지각 이유, 스케줄 미잡힌 이유 등 (선택)"
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="커뮤니케이션 내용 입력..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 resize-none"
      />
      <select
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        className="w-full bg-[#1a1c1f] border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500 [color-scheme:dark]"
      >
        <option value="" className="bg-[#1a1c1f] text-gray-200">결과 선택 (선택)</option>
        <option value="scheduled" className="bg-[#1a1c1f] text-gray-200">일정 잡음</option>
        <option value="will_contact" className="bg-[#1a1c1f] text-gray-200">다음에 연락</option>
        <option value="no_intent" className="bg-[#1a1c1f] text-gray-200">의향 없음</option>
        <option value="unreachable" className="bg-[#1a1c1f] text-gray-200">연락 불가</option>
        <option value="resolved" className="bg-[#1a1c1f] text-gray-200">해결됨</option>
        <option value="other" className="bg-[#1a1c1f] text-gray-200">기타</option>
      </select>
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
        {[1, 2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
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
              <div key={e.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLORS[e.channel]}`}>
                    {CHANNEL_LABELS[e.channel]}
                  </span>
                  {effectiveParties.map((p) => (
                    <span key={p} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${PARTY_COLORS[p] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {PARTY_LABELS[p] ?? p}
                    </span>
                  ))}
                  {e.trigger_type && e.trigger_type !== 'manual' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                      {TRIGGER_BADGE_LABELS[e.trigger_type] ?? e.trigger_type}
                    </span>
                  )}
                  {e.resolution && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-400 ml-auto">
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
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{e.content}</p>
              </div>
            );
          })}
        </div>
      )}
      <AddForm onSave={onAdd} saving={saving} triggerContext={triggerContext} eventContext={eventContext} />
    </div>
  );
}
