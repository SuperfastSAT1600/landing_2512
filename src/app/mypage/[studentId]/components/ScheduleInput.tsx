'use client';

import { useState, useMemo } from 'react';
import { toZonedTime, format, fromZonedTime } from 'date-fns-tz';
import type { WeeklySlot } from '@/types/crm';

const TIMEZONES = [
  { value: 'Asia/Seoul', label: '서울 / 서울 (KST, UTC+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: '상하이 (CST, UTC+8)' },
  { value: 'Asia/Singapore', label: '싱가포르 (SGT, UTC+8)' },
  { value: 'Asia/Dubai', label: '두바이 (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: '인도 (IST, UTC+5:30)' },
  { value: 'Europe/London', label: '런던 (GMT/BST)' },
  { value: 'Europe/Paris', label: '파리 / 프랑크푸르트 (CET)' },
  { value: 'America/New_York', label: '뉴욕 / 동부 (ET)' },
  { value: 'America/Chicago', label: '시카고 / 중부 (CT)' },
  { value: 'America/Denver', label: '덴버 / 산악 (MT)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스 / 서부 (PT)' },
  { value: 'America/Anchorage', label: '앵커리지 (AKT)' },
  { value: 'Pacific/Honolulu', label: '호놀룰루 (HST)' },
  { value: 'America/Toronto', label: '토론토 (ET)' },
  { value: 'America/Vancouver', label: '밴쿠버 (PT)' },
  { value: 'America/Sao_Paulo', label: '상파울루 (BRT)' },
  { value: 'Australia/Sydney', label: '시드니 (AEDT)' },
  { value: 'Pacific/Auckland', label: '오클랜드 (NZST)' },
  { value: 'Pacific/Guam', label: '괌 (ChST, UTC+10)' },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function generateTimeSlots(): { hour: number; minute: 0 | 30; label: string }[] {
  const slots = [];
  for (let h = 6; h < 24; h++) {
    slots.push({ hour: h, minute: 0 as const, label: `${String(h).padStart(2, '0')}:00` });
    slots.push({ hour: h, minute: 30 as const, label: `${String(h).padStart(2, '0')}:30` });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

interface Props {
  studentId: string;
  passcode: string;
  onSaved: () => void;
}

type Step = 'timezone' | 'ot' | 'schedule';

function getSlotKey(day: number, hour: number, minute: number): string {
  return `${day}-${hour}-${minute}`;
}

export function ScheduleInput({ studentId, passcode, onSaved }: Props) {
  const [step, setStep] = useState<Step>('timezone');
  const [timezone, setTimezone] = useState('');
  const [otDatetimeLocal, setOtDatetimeLocal] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const krConfirmText = useMemo(() => {
    if (!otDatetimeLocal || !timezone) return null;
    try {
      const utcDate = fromZonedTime(otDatetimeLocal, timezone);
      const krZoned = toZonedTime(utcDate, 'Asia/Seoul');
      return format(krZoned, 'yyyy년 M월 d일 HH:mm', { timeZone: 'Asia/Seoul' });
    } catch {
      return null;
    }
  }, [otDatetimeLocal, timezone]);

  function toggleSlot(day: number, hour: number, minute: number) {
    const key = getSlotKey(day, hour, minute);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const otUtc = otDatetimeLocal && timezone
        ? fromZonedTime(otDatetimeLocal, timezone).toISOString()
        : null;

      const weeklySchedule: WeeklySlot[] = Array.from(selectedSlots).map((key) => {
        const [day, hour, minute] = key.split('-').map(Number);
        return {
          day_of_week: day as WeeklySlot['day_of_week'],
          hour,
          minute: minute as WeeklySlot['minute'],
          timezone,
        };
      });

      const res = await fetch(`/api/mypage/${studentId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Passcode': passcode,
        },
        body: JSON.stringify({ ot_datetime: otUtc, weekly_schedule: weeklySchedule, timezone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? '저장 중 오류가 발생했습니다.');
        return;
      }
      onSaved();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'timezone') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">스케줄 입력</h3>
          <p className="text-sm text-gray-500">먼저 현재 거주 지역의 타임존을 선택해주세요.</p>
        </div>
        <div>
          <label htmlFor="schedule-timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
            타임존
          </label>
          <select
            id="schedule-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none"
          >
            <option value="">타임존 선택</option>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { if (timezone) setStep('ot'); }}
          disabled={!timezone}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
        >
          다음
        </button>
      </div>
    );
  }

  if (step === 'ot') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">OT 희망 일시</h3>
          <p className="text-sm text-gray-500">
            희망하시는 OT(오리엔테이션) 일시를 선택해주세요.
          </p>
        </div>
        <div>
          <label htmlFor="ot-datetime" className="block text-sm font-medium text-gray-700 mb-1.5">
            날짜 및 시간 ({TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone} 기준)
          </label>
          <input
            id="ot-datetime"
            type="datetime-local"
            value={otDatetimeLocal}
            onChange={(e) => setOtDatetimeLocal(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
          />
          {krConfirmText && (
            <p className="text-xs text-blue-600 mt-1.5">
              입력하신 시간은 한국 기준 {krConfirmText} 입니다.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('timezone')}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            이전
          </button>
          <button
            onClick={() => setStep('schedule')}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  // step === 'schedule'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">정규 수업 가능 시간</h3>
        <p className="text-sm text-gray-500">
          {TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone} 기준으로 수업 가능한 시간을 모두 선택해주세요.
        </p>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[360px]">
          <thead>
            <tr>
              <th className="bg-gray-50 px-2 py-2 text-gray-500 font-medium text-left sticky left-0 w-12 border-b border-gray-100">
                시간
              </th>
              {DAY_LABELS.map((day, i) => (
                <th
                  key={i}
                  className="bg-gray-50 px-1 py-2 text-gray-500 font-medium text-center min-w-[36px] border-b border-gray-100"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(({ hour, minute, label }) => (
              <tr key={label} className="border-t border-gray-50">
                <td className="px-2 py-1 text-gray-400 whitespace-nowrap sticky left-0 bg-white text-xs">
                  {label}
                </td>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const key = getSlotKey(day, hour, minute);
                  const active = selectedSlots.has(key);
                  return (
                    <td key={day} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSlot(day, hour, minute)}
                        aria-label={`${DAY_LABELS[day]}요일 ${label} ${active ? '선택 해제' : '선택'}`}
                        aria-pressed={active}
                        className={`w-7 h-6 rounded transition-colors ${
                          active
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        선택된 슬롯: {selectedSlots.size}개
      </p>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setStep('ot')}
          className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
