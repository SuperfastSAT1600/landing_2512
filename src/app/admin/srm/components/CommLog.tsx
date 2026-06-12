'use client';

import { useState } from 'react';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';

export type { CommEntry };

const TARGET_LABELS = { student: '학생', parent: '학부모', coach: '코치' };
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

interface AddFormProps {
  onSave: (data: { target: string; channel: string; content: string; reason?: string; resolution?: string }) => Promise<void>;
  saving: boolean;
  triggerContext?: TriggerContext;
}

function AddForm({ onSave, saving, triggerContext }: AddFormProps) {
  const [target, setTarget] = useState<string>('student');
  const [channel, setChannel] = useState<string>('kakao');
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSave({
      target,
      channel,
      content: content.trim(),
      reason: reason.trim() || undefined,
      resolution: resolution || undefined,
    });
    setContent('');
    setReason('');
    setResolution('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 pt-4 mt-4 space-y-3">
      {triggerContext && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
          <span className="text-orange-400 text-xs">!</span>
          <span className="text-xs text-orange-300">{triggerContext.label}</span>
        </div>
      )}
      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="student">학생</option>
          <option value="parent">학부모</option>
          <option value="coach">코치</option>
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="kakao">카카오</option>
          <option value="call">전화</option>
          <option value="sms">SMS</option>
          <option value="email">이메일</option>
          <option value="other">기타</option>
        </select>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="지각 이유, 스케줄 미잡힌 이유 등"
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
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500"
      >
        <option value="">결과 선택(선택)</option>
        <option value="scheduled">일정 잡음</option>
        <option value="will_contact">다음에 연락</option>
        <option value="no_intent">의향 없음</option>
        <option value="unreachable">연락 불가</option>
        <option value="resolved">해결됨</option>
        <option value="other">기타</option>
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
  onAdd: (data: { target: string; channel: string; content: string; reason?: string; resolution?: string }) => Promise<void>;
  triggerContext?: TriggerContext;
}

export function CommLog({ entries, loading, saving, onAdd, triggerContext }: Props) {
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
          {entries.map((e) => (
            <div key={e.id} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLORS[e.channel]}`}>
                  {CHANNEL_LABELS[e.channel]}
                </span>
                <span className="text-[11px] text-gray-500">
                  {TARGET_LABELS[e.target]}
                </span>
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
          ))}
        </div>
      )}
      <AddForm onSave={onAdd} saving={saving} triggerContext={triggerContext} />
    </div>
  );
}
