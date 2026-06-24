'use client';

import { useState, useEffect } from 'react';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import type { CoachOfferPayload } from '@/types/crm';
import { SCHOOL_TYPE_LABELS } from '@/types/crm';

const TIMEZONES = [
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/Denver', label: 'Denver (MT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Anchorage', label: 'Anchorage (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

const DESIRED_SUBJECTS_LABELS: Record<string, string> = {
  RW: 'Reading & Writing',
  Math: 'Math',
  Both: 'Reading & Writing + Math',
};

const VOCAB_WEAKNESS_LABELS: Record<string, string> = {
  none: '없음',
  low: '낮음',
  high: '높음',
  medium: '중간',
};

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function useCountdown(deadline: string): CountdownState {
  const [state, setState] = useState<CountdownState>(() => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setState({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return state;
}

type ResponseAction = 'accepted' | 'rejected' | 'considering';

interface Props {
  payload: CoachOfferPayload;
  token: string;
}

export function CoachOfferPageClient({ payload, token }: Props) {
  const countdown = useCountdown(payload.response_deadline);
  const [coachTimezone, setCoachTimezone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<ResponseAction | null>(null);
  const [error, setError] = useState('');

  const alreadyResponded =
    payload.status === 'accepted' ||
    payload.status === 'rejected' ||
    payload.status === 'considering';

  async function handleRespond(action: ResponseAction) {
    if (!coachTimezone) {
      setError('타임존을 먼저 선택해주세요.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offer/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, coach_timezone: coachTimezone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? '오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }
      setSubmittedAction(action);
      setSubmitted(true);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && submittedAction) {
    return (
      <div className="min-h-screen bg-[#0d0f10] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${
              submittedAction === 'accepted'
                ? 'bg-blue-900/40'
                : submittedAction === 'rejected'
                ? 'bg-red-900/40'
                : 'bg-yellow-900/40'
            }`}
          >
            <svg
              className={`w-7 h-7 ${
                submittedAction === 'accepted'
                  ? 'text-blue-400'
                  : submittedAction === 'rejected'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {submittedAction === 'accepted' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              )}
              {submittedAction === 'rejected' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
              {submittedAction === 'considering' && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">
            {submittedAction === 'accepted' && '수락 완료'}
            {submittedAction === 'rejected' && '거절 완료'}
            {submittedAction === 'considering' && '응답 완료'}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {submittedAction === 'accepted' && '수락하셨습니다. 담당자가 확인 후 연락드리겠습니다.'}
            {submittedAction === 'rejected' && '거절하셨습니다. 다음 기회에 또 함께 해요.'}
            {submittedAction === 'considering' && '더 고민해보겠다고 전달했습니다. 담당자가 확인하겠습니다.'}
          </p>
        </div>
      </div>
    );
  }

  const { student } = payload;

  return (
    <div className="min-h-screen bg-[#0d0f10] text-gray-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-10 space-y-6">

        {/* Countdown + Reviewing count */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">응답 마감</p>
              {countdown.expired ? (
                <p className="text-red-400 font-semibold text-sm">응답 기간이 지났습니다</p>
              ) : (
                <p className="font-mono text-white font-bold text-xl tabular-nums">
                  {countdown.days > 0 && `${countdown.days}일 `}
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/30 rounded-full px-4 py-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
              <span className="text-blue-300 text-xs font-semibold">
                현재 {payload.reviewing_count}명의 코치가 검토 중
              </span>
            </div>
          </div>
        </div>

        {/* Student info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">학생 정보</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="이름" value={student.name} />
            <InfoItem label="학년" value={student.grade} />
            <InfoItem label="재학 유형" value={SCHOOL_TYPE_LABELS[student.school_type]} />
            <InfoItem label="희망 과목" value={DESIRED_SUBJECTS_LABELS[student.desired_subjects] ?? student.desired_subjects} />
          </div>

          {/* Scores */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SAT 점수</p>
            {student.previous_score_status === 'never_taken' ? (
              <p className="text-gray-400 text-sm">응시 이력 없음</p>
            ) : student.previous_score_status === 'dont_remember' ? (
              <p className="text-gray-400 text-sm">점수 기억 못함</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  label="직전 RW 점수"
                  value={student.previous_rw_score != null ? `${student.previous_rw_score}점` : '-'}
                />
                <InfoItem
                  label="직전 Math 점수"
                  value={student.previous_math_score != null ? `${student.previous_math_score}점` : '-'}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <InfoItem
                label="목표 점수"
                value={student.target_score != null ? `${student.target_score}점` : '-'}
              />
              <InfoItem
                label="목표 시험 일자"
                value={student.target_test_date || '-'}
              />
            </div>
          </div>

          {/* Diagnostic summary */}
          {student.diagnostic_summary && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">진단테스트 요약</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoItem
                  label="총점"
                  value={`${student.diagnostic_summary.total_correct} / ${student.diagnostic_summary.total_questions}`}
                />
                {student.diagnostic_summary.rw_score != null && (
                  <InfoItem label="RW 점수" value={`${student.diagnostic_summary.rw_score}점`} />
                )}
                {student.diagnostic_summary.math_score != null && (
                  <InfoItem label="Math 점수" value={`${student.diagnostic_summary.math_score}점`} />
                )}
                <InfoItem
                  label="어휘 약점"
                  value={VOCAB_WEAKNESS_LABELS[student.diagnostic_summary.vocab_weakness_level]}
                />
              </div>
              {student.diagnostic_summary.weak_areas.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">취약 영역</p>
                  <div className="flex flex-wrap gap-2">
                    {student.diagnostic_summary.weak_areas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 text-xs rounded-full bg-red-900/30 border border-red-700/30 text-red-300"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coach history */}
          {student.coach_history && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">이전 교육 이력</p>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{student.coach_history}</p>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">스케줄</h2>

          {/* Timezone selector */}
          <div>
            <label htmlFor="coach-timezone" className="block text-xs text-gray-400 mb-1.5">
              내 타임존 선택
            </label>
            <select
              id="coach-timezone"
              value={coachTimezone}
              onChange={(e) => { setCoachTimezone(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-sm appearance-none"
            >
              <option value="">타임존을 선택하세요</option>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <ScheduleCalendar
            otDatetime={payload.ot_datetime}
            weeklySchedule={payload.weekly_schedule}
            coachTimezone={coachTimezone || null}
          />
        </div>

        {/* Response buttons */}
        {!alreadyResponded && !countdown.expired && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">응답</h2>

            {error && (
              <p className="text-red-400 text-sm pb-2">{error}</p>
            )}

            <button
              onClick={() => handleRespond('accepted')}
              disabled={submitting || !coachTimezone}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors text-sm"
            >
              {submitting ? '처리 중...' : '수락하기'}
            </button>
            <button
              onClick={() => handleRespond('considering')}
              disabled={submitting || !coachTimezone}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-xl font-semibold text-gray-300 transition-colors text-sm"
            >
              좀 더 고민해볼게요
            </button>
            <button
              onClick={() => handleRespond('rejected')}
              disabled={submitting || !coachTimezone}
              className="w-full py-3 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              이번엔 어렵습니다
            </button>

            {!coachTimezone && (
              <p className="text-gray-500 text-xs text-center pt-1">
                응답하려면 타임존을 먼저 선택해주세요.
              </p>
            )}
          </div>
        )}

        {alreadyResponded && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-gray-400 text-sm">이미 응답하셨습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 px-3 py-2.5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-200">{value}</p>
    </div>
  );
}
