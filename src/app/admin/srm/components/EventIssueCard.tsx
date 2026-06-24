'use client';

import { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle, Trash2, Save } from 'lucide-react';
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
  resolution_note: string | null;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  cancellation: '취소/재예약',
  coach_change: '코치 교체',
  no_show: '노쇼',
  schedule_pending: '스케줄 조율 중',
  coach_pending: '코치 배정 중',
  renewal_needed: '재결제 필요',
  schedule: '스케줄 변경',
  payment_no_response: '지급 무응답',
  request_no_response: '요청 무응답',
  custom: '기타',
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
  cancellation: 'bg-red-100 text-red-700 border-red-200',
  coach_change: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  no_show: 'bg-orange-100 text-orange-700 border-orange-200',
  schedule_pending: 'bg-blue-100 text-blue-700 border-blue-200',
  coach_pending: 'bg-green-100 text-green-700 border-green-200',
  renewal_needed: 'bg-purple-100 text-purple-700 border-purple-200',
  schedule: 'bg-teal-100 text-teal-700 border-teal-200',
  payment_no_response: 'bg-rose-100 text-rose-700 border-rose-200',
  request_no_response: 'bg-amber-100 text-amber-700 border-amber-200',
  custom: 'bg-gray-100 text-gray-600 border-gray-200',
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
  const [noteValue, setNoteValue] = useState(issue.resolution_note ?? '');
  const [noteDirty, setNoteDirty] = useState(false);
  const [noteHighlight, setNoteHighlight] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const doneCount = issue.checklist.filter((c) => c.done).length;
  const totalCount = issue.checklist.length;
  const isResolved = issue.status === 'resolved';

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) onUpdated(await res.json() as BaseIssue);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const updated = issue.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c,
    );
    patch({ checklist: updated });
  };

  const toggleResolved = async () => {
    const newStatus = issue.status === 'open' ? 'resolved' : 'open';
    // 해결됨으로 전환 시 해결책 비어있으면 입력란 강조
    if (newStatus === 'resolved' && !noteValue.trim()) {
      setExpanded(true);
      setNoteHighlight(true);
      setTimeout(() => {
        noteRef.current?.focus();
        setNoteHighlight(false);
      }, 150);
    }
    await patch({ status: newStatus });
  };

  const saveNote = async () => {
    await patch({ resolution_note: noteValue.trim() || null });
    setNoteDirty(false);
  };

  const deleteIssue = async () => {
    setSaving(true);
    const res = await fetch(`${apiBase}/${issue.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted?.(issue.id);
    setSaving(false);
    setConfirmDelete(false);
  };

  return (
    <div className={`rounded-lg border ${isResolved ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}>
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {!isResolved && <AlertTriangle size={13} className="text-orange-600 shrink-0" />}
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${ISSUE_TYPE_COLORS[issue.issue_type]}`}>
          {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
        </span>
        <span className={`text-sm font-medium flex-1 ${isResolved ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {issue.title}
        </span>
        {totalCount > 0 && (
          <span className={`text-[11px] font-medium tabular-nums ${doneCount === totalCount ? 'text-green-600' : 'text-gray-500'}`}>
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

          {/* 체크리스트 */}
          {issue.checklist.map((item: IssueChecklist) => (
            <button
              key={item.id}
              onClick={() => !saving && toggleItem(item.id)}
              disabled={saving}
              className="flex items-center gap-2 w-full text-left group"
            >
              {item.done
                ? <CheckSquare size={13} className="text-green-600 shrink-0" />
                : <Square size={13} className="text-gray-300 group-hover:text-gray-600 shrink-0" />
              }
              <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </button>
          ))}

          {/* 해결책 입력 */}
          <div className="pt-2 space-y-1">
            <label className="text-[11px] font-medium text-gray-500">해결책</label>
            {isResolved && !noteDirty ? (
              <div
                onClick={() => { if (!isResolved) return; setNoteDirty(true); noteRef.current?.focus(); }}
                className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1.5 min-h-[40px] whitespace-pre-wrap cursor-default"
              >
                {noteValue || <span className="text-gray-300 italic">기록 없음</span>}
              </div>
            ) : (
              <div className="relative">
                <textarea
                  ref={noteRef}
                  value={noteValue}
                  onChange={(e) => { setNoteValue(e.target.value); setNoteDirty(true); }}
                  disabled={saving}
                  placeholder="어떻게 해결했는지 입력..."
                  rows={3}
                  className={`w-full text-xs rounded border px-2 py-1.5 resize-none focus:outline-none focus:ring-1 transition-all ${
                    noteHighlight
                      ? 'border-orange-400 ring-1 ring-orange-300 bg-orange-50'
                      : 'border-gray-200 focus:ring-blue-300 bg-white'
                  }`}
                />
              </div>
            )}
            {noteDirty && (
              <button
                onClick={saveNote}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
              >
                <Save size={10} />
                저장
              </button>
            )}
          </div>

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
                  className="text-[11px] text-gray-500 hover:text-gray-600"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors"
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
                  ? 'border-gray-200 text-gray-500 hover:text-gray-700'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
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
