'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import type { EventIssue, IssueChecklist } from '@/app/api/admin/srm/issues/route';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  cancellation: '취소/재예약',
  coach_change: '코치 교체',
  no_show: '노쇼',
  custom: '기타',
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
  cancellation: 'bg-red-500/20 text-red-400 border-red-500/30',
  coach_change: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  no_show: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

interface Props {
  issue: EventIssue;
  onUpdated: (updated: EventIssue) => void;
}

export function EventIssueCard({ issue, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(issue.status === 'open');
  const [saving, setSaving] = useState(false);

  const doneCount = issue.checklist.filter((c) => c.done).length;
  const totalCount = issue.checklist.length;

  const toggleItem = async (itemId: string) => {
    const updated = issue.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c,
    );
    setSaving(true);
    const res = await fetch(`/api/admin/srm/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updated }),
    });
    if (res.ok) onUpdated(await res.json() as EventIssue);
    setSaving(false);
  };

  const toggleResolved = async () => {
    const newStatus = issue.status === 'open' ? 'resolved' : 'open';
    setSaving(true);
    const res = await fetch(`/api/admin/srm/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) onUpdated(await res.json() as EventIssue);
    setSaving(false);
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

          <div className="flex justify-end pt-1">
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
