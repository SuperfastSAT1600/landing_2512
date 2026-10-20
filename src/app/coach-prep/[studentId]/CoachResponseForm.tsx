'use client';

import { useState } from 'react';
import type { CoachRequestInfo, CoachPrepStatus } from '@/types/coach-prep';
import { formatKst, isoToKstInput, kstInputToIso } from '@/lib/coach-prep-request';
import { useNow } from './useNow';

type Choice = 'accept' | 'decline';
interface Saved { status: CoachPrepStatus; first_lesson_at: string | null; decline_reason: string | null }

function Summary({ saved }: { saved: Saved }) {
  if (saved.status === 'accepted') {
    return (
      <p className="text-sm text-gray-800">
        <span className="font-semibold text-emerald-700">수업 가능</span>
        {saved.first_lesson_at && <> · 첫 수업 <span className="font-semibold">{formatKst(saved.first_lesson_at)} (KST)</span></>}
      </p>
    );
  }
  return (
    <p className="text-sm text-gray-800">
      <span className="font-semibold text-red-600">수업이 어렵습니다</span>
      {saved.decline_reason && <> · {saved.decline_reason}</>}
    </p>
  );
}

// 코치가 수업 수락 여부와 첫 수업 일시를 남기는 폼 (마감 전에는 수정 가능)
export function CoachResponseForm({ info }: { info: CoachRequestInfo }) {
  const now = useNow();
  const initial: Saved | null = info.status === 'pending' ? null : { status: info.status, first_lesson_at: info.first_lesson_at, decline_reason: info.decline_reason };
  const [saved, setSaved] = useState<Saved | null>(initial);
  const [editing, setEditing] = useState(initial == null);
  const [choice, setChoice] = useState<Choice | null>(initial ? (initial.status === 'accepted' ? 'accept' : 'decline') : null);
  const [lessonInput, setLessonInput] = useState(initial?.first_lesson_at ? isoToKstInput(initial.first_lesson_at) : '');
  const [reason, setReason] = useState(initial?.decline_reason ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedByServer, setClosedByServer] = useState(false);

  const closed = closedByServer || (now != null && now > Date.parse(info.deadline_at));
  const minInput = now != null ? isoToKstInput(new Date(now).toISOString()) : undefined;

  // 취소하면 저장된 값으로 되돌려, 다음 "수정하기"에 저장 안 된 입력이 남아 있지 않게 한다
  function cancelEdit() {
    if (saved) {
      setChoice(saved.status === 'accepted' ? 'accept' : 'decline');
      setLessonInput(saved.first_lesson_at ? isoToKstInput(saved.first_lesson_at) : '');
      setReason(saved.decline_reason ?? '');
    }
    setEditing(false);
    setError(null);
  }

  async function submit() {
    setError(null);
    const firstLessonAt = lessonInput ? kstInputToIso(lessonInput) : null;
    if (choice === 'accept' && !firstLessonAt) { setError('첫 수업 일시를 입력해 주세요.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/coach-prep/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: info.token, action: choice, ...(choice === 'accept' ? { first_lesson_at: firstLessonAt } : { reason: reason.trim() || undefined }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === 'DEADLINE_PASSED') setClosedByServer(true);
        setError(json.error?.message ?? '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setSaved({ status: json.data.status, first_lesson_at: json.data.first_lesson_at, decline_reason: json.data.decline_reason });
      setEditing(false);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="coach-response" className="bg-white rounded-xl border border-violet-200 shadow-sm p-5 space-y-4 scroll-mt-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">수업 가능 여부 응답</h2>

      {closed ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">응답이 마감되었습니다. ({formatKst(info.deadline_at)} KST)</p>
          {saved && <Summary saved={saved} />}
        </div>
      ) : saved && !editing ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-emerald-600">응답이 기록되었습니다</p>
          <Summary saved={saved} />
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-violet-700 underline underline-offset-2">
            응답 수정하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="수업 가능 여부">
            {([['accept', '수업 가능합니다'], ['decline', '어렵습니다']] as const).map(([value, label]) => (
              <button
                key={value} type="button" role="radio" aria-checked={choice === value} onClick={() => setChoice(value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${choice === value
                  ? value === 'accept' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {choice === 'accept' && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-600">첫 수업 일시 (한국 시간, KST)</span>
              <input
                type="datetime-local" value={lessonInput} min={minInput} onChange={(e) => setLessonInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </label>
          )}

          {choice === 'decline' && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-600">사유 (선택)</span>
              <textarea
                value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)}
                placeholder="예: 해당 시간대에 수업 일정이 가득 찼습니다"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </label>
          )}

          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button" onClick={submit} disabled={!choice || submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? '저장 중…' : saved ? '수정 저장' : '응답 보내기'}
            </button>
            {saved && (
              <button type="button" onClick={cancelEdit} className="text-xs text-gray-500 underline underline-offset-2">
                취소
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
