'use client';

import { useState } from 'react';
import type { CoachRequestInfo, CoachPrepStatus, LessonTimes } from '@/types/coach-prep';
import { formatKst, isoToKstInput, kstInputDayLabel, kstInputToIso, lessonOptions } from '@/lib/coach-prep-request';
import { useNow } from './useNow';

type Choice = 'accept' | 'decline';
interface Saved extends LessonTimes { status: CoachPrepStatus; decline_reason: string | null }
type Inputs = { first: string; second: string; first2: string; second2: string };

const toInputs = (t: LessonTimes): Inputs => ({
  first: t.first_lesson_at ? isoToKstInput(t.first_lesson_at) : '',
  second: t.second_lesson_at ? isoToKstInput(t.second_lesson_at) : '',
  first2: t.option2_first_lesson_at ? isoToKstInput(t.option2_first_lesson_at) : '',
  second2: t.option2_second_lesson_at ? isoToKstInput(t.option2_second_lesson_at) : '',
});

function Summary({ saved }: { saved: Saved }) {
  if (saved.status === 'accepted') {
    return (
      <div className="space-y-1 text-sm text-gray-800">
        <p className="font-semibold text-emerald-700">수업 가능</p>
        {lessonOptions(saved).map((o) => (
          <p key={o.label}>
            <span className="mr-1.5 text-xs font-semibold text-violet-700">{o.label}</span>
            첫 수업 <span className="font-semibold">{formatKst(o.first)}</span> · 두 번째 수업 <span className="font-semibold">{formatKst(o.second)}</span>
            <span className="ml-1 text-[10px] text-gray-400">KST</span>
          </p>
        ))}
      </div>
    );
  }
  return (
    <p className="text-sm text-gray-800">
      <span className="font-semibold text-red-600">수업이 어렵습니다</span>
      {saved.decline_reason && <> · {saved.decline_reason}</>}
    </p>
  );
}

function LessonInput({ label, value, min, onChange }: { label: string; value: string; min: string | undefined; onChange: (v: string) => void }) {
  const day = kstInputDayLabel(value);
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between text-xs font-semibold text-gray-600">
        {label}
        {day && <span className="font-bold text-violet-700">{day}</span>}
      </span>
      <input
        type="datetime-local" value={value} min={min} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
      />
    </label>
  );
}

// 코치가 수업 수락 여부와 첫 수업 일시를 남기는 폼 (마감 전에는 수정 가능)
export function CoachResponseForm({ info }: { info: CoachRequestInfo }) {
  const now = useNow();
  const initial: Saved | null = info.status === 'pending' ? null : info;
  const [saved, setSaved] = useState<Saved | null>(initial);
  const [editing, setEditing] = useState(initial == null);
  const [choice, setChoice] = useState<Choice | null>(initial ? (initial.status === 'accepted' ? 'accept' : 'decline') : null);
  const [inputs, setInputs] = useState<Inputs>(initial ? toInputs(initial) : { first: '', second: '', first2: '', second2: '' });
  const setInput = (k: keyof Inputs) => (v: string) => setInputs((p) => ({ ...p, [k]: v }));
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
      setInputs(toInputs(saved));
      setReason(saved.decline_reason ?? '');
    }
    setEditing(false);
    setError(null);
  }

  async function submit() {
    setError(null);
    const first = kstInputToIso(inputs.first);
    const second = kstInputToIso(inputs.second);
    const first2 = kstInputToIso(inputs.first2);
    const second2 = kstInputToIso(inputs.second2);
    if (choice === 'accept') {
      if (!first || !second) { setError('옵션 1의 첫 수업과 두 번째 수업 일시를 모두 입력해 주세요.'); return; }
      if (Date.parse(second) <= Date.parse(first)) { setError('옵션 1의 두 번째 수업은 첫 수업보다 늦어야 합니다.'); return; }
      if (!!first2 !== !!second2) { setError('옵션 2는 첫 수업과 두 번째 수업을 모두 입력하거나 모두 비워 주세요.'); return; }
      if (first2 && second2 && Date.parse(second2) <= Date.parse(first2)) { setError('옵션 2의 두 번째 수업은 첫 수업보다 늦어야 합니다.'); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/coach-prep/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: info.token, action: choice, ...(choice === 'accept'
          ? { first_lesson_at: first, second_lesson_at: second, ...(first2 && second2 ? { option2_first_lesson_at: first2, option2_second_lesson_at: second2 } : {}) }
          : { reason: reason.trim() || undefined }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === 'DEADLINE_PASSED') setClosedByServer(true);
        setError(json.error?.message ?? '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setSaved(json.data as Saved);
      setEditing(false);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="coach-response" className="bg-white rounded-xl border border-violet-200 shadow-sm p-5 space-y-4 scroll-mt-14">
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
            <div className="space-y-4">
              <p className="text-[11px] text-gray-400">희망하시는 첫 수업·두 번째 수업 조합을 옵션으로 남겨 주세요. 시간은 한국 시간(KST) 기준입니다.</p>
              <fieldset className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/30 p-3">
                <legend className="px-1 text-xs font-bold text-violet-700">옵션 1 (필수)</legend>
                <LessonInput label="첫 수업" value={inputs.first} min={minInput} onChange={setInput('first')} />
                <LessonInput label="두 번째 수업" value={inputs.second} min={inputs.first || minInput} onChange={setInput('second')} />
              </fieldset>
              <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
                <legend className="px-1 text-xs font-bold text-gray-500">옵션 2 (선택)</legend>
                <LessonInput label="첫 수업" value={inputs.first2} min={minInput} onChange={setInput('first2')} />
                <LessonInput label="두 번째 수업" value={inputs.second2} min={inputs.first2 || minInput} onChange={setInput('second2')} />
              </fieldset>
            </div>
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
