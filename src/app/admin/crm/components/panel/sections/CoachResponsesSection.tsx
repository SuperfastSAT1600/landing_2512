'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { CoachPrepRequestView, StudentMessageContext } from '@/types/coach-prep';
import { formatKst, isClosed, lessonOptions } from '@/lib/coach-prep-request';
import { buildStudentMessage } from '@/lib/coach-prep-student-message';
import { SectionCard } from './SectionCard';

interface Props {
  studentId: string;
  adminKey: string;
  /** 값이 바뀌면 다시 불러온다(링크를 새로 만든 직후). */
  version: number;
}

function StatusChip({ r }: { r: CoachPrepRequestView }) {
  if (r.status === 'accepted') return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">수락</span>;
  if (r.status === 'declined') return <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">어려움</span>;
  return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500">{isClosed(r.deadline_at) ? '미응답 · 마감' : '미응답'}</span>;
}

// 코치별 응답과 첫 수업 일정을 비교해 한 명을 선택한다
export function CoachResponsesSection({ studentId, adminKey, version }: Props) {
  const [rows, setRows] = useState<CoachPrepRequestView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [context, setContext] = useState<StudentMessageContext | null>(null);
  const [messageFor, setMessageFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/students/${studentId}/coach-requests`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (res.ok) {
        setRows(json.data.requests as CoachPrepRequestView[]);
        setContext((json.data.student_context as StudentMessageContext | null | undefined) ?? null);
      }
    } catch { /* 네트워크 오류는 다음 새로고침에서 복구 */ }
  }, [studentId, adminKey]);

  useEffect(() => { load(); }, [load, version]);

  async function select(id: string) {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/crm/students/${studentId}/coach-requests/${id}`, {
        method: 'PATCH', headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ selected: true }),
      });
      if (!res.ok) setError((await res.json()).error?.message ?? '선택하지 못했습니다.');
      await load();
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally { setBusy(null); }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
      return;
    }
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  }

  // 학생 채팅방에 붙여 넣을 안내 — 코치가 가능하다고 한 시간을 학생 시간대로 바꾸고 스케줄 등록 안내를 붙인다
  const messageOf = (r: CoachPrepRequestView) => buildStudentMessage({
    coachName: r.coach_name, options: lessonOptions(r),
    timezone: context?.timezone ?? null, language: context?.language ?? null, scheduleUrl: context?.schedule_url ?? null,
  });

  if (rows.length === 0) return null;
  const answered = rows.filter((r) => r.status !== 'pending').length;

  return (
    <SectionCard title="코치 응답 현황" count={rows.length}>
      <p className="mb-2 text-[11px] text-gray-400">{answered}/{rows.length}명 응답 · 수락한 코치 중 담당 코치를 선택하세요</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className={`rounded-lg border px-3 py-2 ${r.selected_at ? 'border-violet-300 bg-violet-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{r.coach_name}</span>
              <StatusChip r={r} />
              {r.selected_at && <span className="flex items-center gap-0.5 text-[11px] font-semibold text-violet-700"><Check size={11} />담당 선택</span>}
              <span className="ml-auto flex items-center gap-2">
                <button onClick={() => copyText(r.id, `${window.location.origin}/coach-prep/${studentId}?t=${r.token}`)} className="text-[11px] text-gray-400 underline underline-offset-2">{copied === r.id ? '복사됨' : '링크 복사'}</button>
                {r.status === 'accepted' && !r.selected_at && (
                  <button onClick={() => select(r.id)} disabled={busy === r.id} className="rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:bg-gray-300">
                    {busy === r.id ? '선택 중…' : '이 코치 선택'}
                  </button>
                )}
              </span>
            </div>
            {lessonOptions(r).map((o) => (
              <p key={o.label} className="mt-1 text-[11px] tabular-nums text-gray-500">
                <span className="mr-1 font-semibold text-violet-700">{o.label}</span>
                첫 수업 <span className="font-semibold text-gray-800">{formatKst(o.first)}</span>
                {' · '}두 번째 수업 <span className="font-semibold text-gray-800">{formatKst(o.second)}</span>
              </p>
            ))}
            {r.status === 'accepted' && lessonOptions(r).length > 0 && (
              <div className="mt-1.5">
                <button onClick={() => setMessageFor(messageFor === r.id ? null : r.id)} className="text-[11px] font-semibold text-violet-700 underline underline-offset-2">
                  {messageFor === r.id ? '학생 안내 메시지 닫기' : '학생 안내 메시지'}
                </button>
                {messageFor === r.id && (
                  <div className="mt-1 space-y-1.5 rounded-md border border-violet-200 bg-violet-50/40 p-2">
                    <pre data-testid="student-message" className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-gray-800">{messageOf(r)}</pre>
                    {!context?.timezone && <p className="text-[11px] text-amber-600">학생 시간대를 찾지 못해 한국 시간(KST)으로 표기했습니다. 학생에게 보내기 전에 확인해 주세요.</p>}
                    {!context?.schedule_url && <p className="text-[11px] text-amber-600">학생 스케줄 링크를 찾지 못해 링크 없이 안내문만 나옵니다.</p>}
                    <button onClick={() => copyText(`msg-${r.id}`, messageOf(r))} className="rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700">
                      {copied === `msg-${r.id}` ? '복사됨' : '메시지 복사'}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 tabular-nums">
              {r.decline_reason && <span>사유: {r.decline_reason}</span>}
              <span>마감 {formatKst(r.deadline_at)}</span>
              <span>{r.first_opened_at ? `열람 ${formatKst(r.first_opened_at)}` : '아직 열람 전'}</span>
              {r.responded_at && <span>응답 {formatKst(r.responded_at)}</span>}
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </SectionCard>
  );
}
