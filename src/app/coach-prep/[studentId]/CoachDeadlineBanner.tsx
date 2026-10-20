'use client';

import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import type { CoachRequestInfo } from '@/types/coach-prep';
import { formatKst, lessonOptions, formatRemaining } from '@/lib/coach-prep-request';
import { useNow } from './useNow';

function statusText(info: CoachRequestInfo): string {
  if (info.status === 'accepted') {
    const first = lessonOptions(info)[0];
    return `수락함${first ? ` · 옵션 1 첫 수업 ${formatKst(first.first)}` : ''}`;
  }
  if (info.status === 'declined') return '수업 어렵다고 응답함';
  return '아직 응답 전입니다';
}

// 코치별 링크로 들어왔을 때 상단에 응답 마감과 남은 시간을 보여준다
export function CoachDeadlineBanner({ info }: { info: CoachRequestInfo }) {
  const now = useNow();

  // 링크를 실제로 연 브라우저에서만 열람을 기록한다(카카오톡·Slack 미리보기 봇은 JS를 실행하지 않는다)
  useEffect(() => {
    fetch('/api/coach-prep/opened', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: info.token }),
      keepalive: true,
    }).catch(() => { /* 열람 기록 실패가 응답을 막지 않는다 */ });
  }, [info.token]);

  const remainingMs = now == null ? null : Date.parse(info.deadline_at) - now;
  const closed = remainingMs != null && remainingMs <= 0;
  const urgent = remainingMs != null && remainingMs > 0 && remainingMs < 6 * 60 * 60_000;

  const tone = closed
    ? 'bg-gray-100 border-gray-300 text-gray-600'
    : urgent
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-amber-50 border-amber-200 text-amber-900';

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Clock size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">
            {closed
              ? '응답이 마감되었습니다'
              : `${info.coach_name} 코치님, ${formatKst(info.deadline_at)} (KST)까지 응답해 주세요`}
          </p>
          <p className="text-xs">
            {remainingMs != null && !closed && <span className="font-semibold">{formatRemaining(remainingMs)} 남음 · </span>}
            {statusText(info)}
          </p>
          {!closed && (
            <a href="#coach-response" className="inline-block pt-1 text-xs font-semibold underline underline-offset-2">
              자료를 확인한 뒤 아래에서 응답하기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
