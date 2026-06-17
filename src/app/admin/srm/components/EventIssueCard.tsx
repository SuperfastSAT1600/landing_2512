'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle, Trash2 } from 'lucide-react';
import type { IssueChecklist } from '@/app/api/admin/srm/issues/route';

export interface BaseIssue {
  id: string;
  issue_type: string;
  title: string;
  description: string | null;
  checklist: IssueChecklist[];
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  cancellation: '취소/재예약',
  coach_change: '코치 교체',
  no_show: '노쇼',
  schedule_pending: '스케줄 조율 중',
  coach_pending: '코치 배정 중',
  renewal_needed: '재결제 필요',
  custom: '기타',
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
  cancellation: 'bg-red-500/20 text-red-400 border-red-500/30',
  coach_change: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  no_show: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  schedule_pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coach_pending: 'bg-green-500/20 text-green-400 border-green-500/30',
  renewal_needed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

interface Props {
  issue: BaseIssue;
  onUpdated: (updated: BaseIssue) => void;
  onDeleted?: (id: string) => void;
  apiBase?: string; // 기본값: /api/admin/srm/issues
}

export function EventIssueCard({ issue, onUpdated, onDeleted, apiBase = '/api/admin/srm/issues' }: Props) {
  const [expanded, setExpanded] = useState(issue.status === 'open');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doneCount = issue.checklist.filter((c) => c.done).length;
  const totalCount = issue.checklist.length;

  const toggleItem = async (itemId: string) => {
    const updated = issue.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c,
    );
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updated }),
      });
      if (res.ok) onUpdated(await res.json() as BaseIssue);
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async () => {
    const newStatus = issue.status === 'open' ? 'resolved' : 'open';
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onUpdated(await res.json() as BaseIssue);
    } finally {
      setSaving(false);
    }
  };

  const deleteIssue = async () => {
    setSaving(true);
    const res = await fetch(`${apiBase}/${issue.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted?.(issue.id);
    setSaving(false);
    setConfirmDelete(false);
  };

  const isResolved = issue.status === 'resolved';

  return (
    <div className={`rounded-lg border ${isResolved ? 'border-white/5 bg-white/3' : 'border-orange-500/20 bg-orange-500/5'}`}>
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {!isResolved && <AlertTriangle size={13} className="text-orange-400 shrink-0" />}
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${ISSUE_TYPE_COLORS[issue.issue_type]}`}>
          {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
        </span>
        <span className={`text-sm font-medium flex-1 ${isResolved ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
          {issue.title}
        </span>
        {totalCount > 0 && (
          <span className={`text-[11px] font-medium tabular-nums ${doneCount === totalCount ? 'text-green-400' : 'text-gray-500'}`}>
            {doneCount}/{totalCount}
          </span>
        )}
        {expanded ? <ChevronUp size={13} className="text-gray-600" /> : <ChevronDown size={13} className="text-gray-600" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <span>{new Date(issue.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
            {issue.created_by && <span>· {issue.created_by}</span>}
          </div>
          {issue.description && (
            <p className="text-xs text-gray-500 mb-2">{issue.description}</p>
          )}

          {issue.checklist.map((item: IssueChecklist) => (
            <button
              key={item.id}
              onClick={() => !saving && toggleItem(item.id)}
              disabled={saving}
              className="flex items-center gap-2 w-full text-left group"
            >
              {item.done
                ? <CheckSquare size={13} className="text-green-400 shrink-0" />
                : <Square size={13} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
              }
              <span className={`text-xs ${item.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                {item.label}
              </span>
            </button>
          ))}

          <div className="flex items-center justify-between pt-1">
            {/* 삭제 */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-400">정말 삭제?</span>
                <button
                  onClick={deleteIssue}
                  disabled={saving}
                  className="text-[11px] text-red-400 hover:text-red-300 underline"
                >
                  삭제
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] text-gray-500 hover:text-gray-300"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
                삭제
              </button>
            )}

            {/* 해결 */}
            <button
              onClick={toggleResolved}
              disabled={saving}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
                isResolved
                  ? 'border-white/10 text-gray-500 hover:text-gray-300'
                  : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
              }`}
            >
              <Check size={11} />
              {isResolved ? '다시 열기' : '해결됨으로 표시'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
