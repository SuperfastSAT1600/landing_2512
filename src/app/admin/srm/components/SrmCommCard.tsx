'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import {
  PARTY_LABELS,
  PARTY_COLORS,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
  RESOLUTION_LABELS,
  TRIGGER_BADGE_LABELS,
} from '@/app/admin/srm/comm-constants';

interface Props {
  entry: CommEntry;
  onUpdated: (updated: CommEntry) => void;
}

export function SrmCommCard({ entry, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [reason, setReason] = useState(entry.reason ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await srmFetch(`/api/admin/srm/communications/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, reason }),
      });
      if (res.ok) {
        const updated = await res.json() as CommEntry;
        onUpdated(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(entry.content);
    setReason(entry.reason ?? '');
    setEditing(false);
  };

  const effectiveParties = (entry.parties && entry.parties.length > 0) ? entry.parties : (entry.target ? [entry.target] : []);

  return (
    <div className="bg-white/5 rounded-lg p-3 group">
      {/* 헤더 행 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLORS[entry.channel] ?? 'bg-gray-500/20 text-gray-300'}`}>
          {CHANNEL_LABELS[entry.channel] ?? entry.channel}
        </span>
        {effectiveParties.map((p) => (
          <span key={p} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${PARTY_COLORS[p] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
            {PARTY_LABELS[p] ?? p}
          </span>
        ))}
        {entry.trigger_type && entry.trigger_type !== 'manual' && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
            {TRIGGER_BADGE_LABELS[entry.trigger_type] ?? entry.trigger_type}
          </span>
        )}
        {!editing && entry.resolution && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 ml-auto">
            {RESOLUTION_LABELS[entry.resolution] ?? entry.resolution}
          </span>
        )}
        <span className={`text-[11px] text-gray-600 ${!editing && entry.resolution ? '' : 'ml-auto'}`}>
          {new Date(entry.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          {entry.author ? ` · ${entry.author}` : ''}
        </span>

        {/* 편집 버튼 (호버 시 표시) */}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-600 hover:text-gray-300"
            title="수정"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-1.5 mt-1">
          {entry.reason !== undefined && (
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유 (선택)"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
            />
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 outline-none focus:border-blue-500/50 resize-none"
          />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 border border-white/10 rounded"
            >
              <X size={11} /> 취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded"
            >
              <Check size={11} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {entry.reason && <p className="text-[11px] text-gray-500 mb-1">사유: {entry.reason}</p>}
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
        </>
      )}
    </div>
  );
}
