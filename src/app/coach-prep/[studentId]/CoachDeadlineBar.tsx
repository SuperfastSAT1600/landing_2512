'use client';

import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import type { CoachRequestInfo } from '@/types/coach-prep';
import { formatKst, lessonOptions, formatRemaining, deadlineProgress } from '@/lib/coach-prep-request';
import { useNow } from './useNow';

function statusText(info: CoachRequestInfo): string {
  if (info.status === 'accepted') {
    const first = lessonOptions(info)[0];
    return `수락함${first ? ` · 옵션 1 첫 수업 ${formatKst(first.first)}` : ''}`;
  }
  if (info.status === 'declined') return '수업 어렵다고 응답함';
  return '아직 응답 전입니다';
}

// 코치별 링크로 들어왔을 때 화면 아래에 떠 있는 응답 마감 바: 남은 시간과 진행 바, 응답 이동 버튼
// unlocked=false(필수 확인 전)이면 응답 폼이 아직 없으므로 버튼은 필수 확인 영역으로 안내한다
export function CoachDeadlineBar({ info, unlocked }: { info: CoachRequestInfo; unlocked: boolean }) {
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
  const progress = now == null ? 0 : deadlineProgress(info.created_at, info.deadline_at, now);

  const bar = closed ? 'bg-gray-400' : urgent ? 'bg-red-500' : 'bg-violet-500';
  const text = closed ? 'text-gray-500' : urgent ? 'text-red-700' : 'text-gray-900';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        <div
          role="progressbar" aria-label="응답 마감까지 지난 시간"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={`${Math.round(progress * 100)}% 경과`}
          className="h-1.5 w-full bg-gray-100"
        >
          <div className={`h-full ${bar} transition-[width] duration-500`} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Clock size={16} className={`shrink-0 ${text}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-semibold ${text}`}>
              {closed ? '응답이 마감되었습니다' : remainingMs == null ? '응답 마감 확인 중' : `${formatRemaining(remainingMs)} 남음`}
            </p>
            <p className="truncate text-xs text-gray-500">{formatKst(info.deadline_at)} 마감 (KST) · {info.coach_name} 코치님 · {statusText(info)}</p>
          </div>
          {!closed && (
            <a href={unlocked ? '#coach-response' : '#confirm'} className="shrink-0 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
              {!unlocked ? '필수 확인하기' : info.status === 'pending' ? '응답하기' : '응답 수정'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
