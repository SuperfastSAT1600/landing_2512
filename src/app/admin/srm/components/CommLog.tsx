'use client';

import { useState } from 'react';

export interface CommEntry {
  id: string;
  target: 'student' | 'parent' | 'coach';
  channel: 'kakao' | 'call' | 'sms' | 'email' | 'other';
  content: string;
  author: string | null;
  created_at: string;
}

const TARGET_LABELS = { student: '학생', parent: '학부모', coach: '코치' };
const CHANNEL_LABELS = { kakao: '카카오', call: '전화', sms: 'SMS', email: '이메일', other: '기타' };
const CHANNEL_COLORS = {
  kakao: 'bg-yellow-500/20 text-yellow-300',
  call: 'bg-blue-500/20 text-blue-300',
  sms: 'bg-green-500/20 text-green-300',
  email: 'bg-purple-500/20 text-purple-300',
  other: 'bg-gray-500/20 text-gray-300',
};

interface AddFormProps {
  onSave: (data: { target: string; channel: string; content: string }) => Promise<void>;
  saving: boolean;
}

function AddForm({ onSave, saving }: AddFormProps) {
  const [target, setTarget] = useState<string>('student');
  const [channel, setChannel] = useState<string>('kakao');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSave({ target, channel, content: content.trim() });
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 pt-4 mt-4 space-y-3">
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
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="커뮤니케이션 내용 입력..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 resize-none"
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
  onAdd: (data: { target: string; channel: string; content: string }) => Promise<void>;
}

export function CommLog({ entries, loading, saving, onAdd }: Props) {
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
                  → {TARGET_LABELS[e.target]}
                </span>
                <span className="text-[11px] text-gray-600 ml-auto">
                  {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  {e.author && ` · ${e.author}`}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{e.content}</p>
            </div>
          ))}
        </div>
      )}
      <AddForm onSave={onAdd} saving={saving} />
    </div>
  );
}
