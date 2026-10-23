import { resolveTz, type AvailabilitySlot } from '@/lib/student-availability';

interface LocalMoment { date: string; weekday: number; minute: number }

// 슬롯 시간대(DST 포함)에서 본 날짜·요일(0 = 월요일)·하루 중 분
function localMoment(iso: string, tz: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso));
  const n = (t: string) => parts.find((p) => p.type === t)!.value;
  const date = `${n('year')}-${n('month')}-${n('day')}`;
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return { date, weekday, minute: Number(n('hour')) * 60 + Number(n('minute')) };
}

/**
 * 수업 시작 시각이 학생이 SFv2에 입력한 가능 시간(요일·시간, 유효 기간) 안인지.
 * 가능 시간을 하나도 입력하지 않은 학생은 제한할 근거가 없어 true. 시작 시각만 본다(수업 길이 기준 아님).
 */
export function isWithinAvailability(iso: string, slots: AvailabilitySlot[]): boolean {
  if (slots.length === 0) return true;
  return slots.some((s) => {
    const m = localMoment(iso, resolveTz(s.tz));
    return m.weekday === s.weekday
      && m.minute >= s.start_minute_local && m.minute < s.end_minute_local
      && (!s.effective_from || m.date >= s.effective_from.slice(0, 10))
      && (!s.effective_until || m.date <= s.effective_until.slice(0, 10));
  });
}

/** 응답에 담긴 수업 시각 중 가능 시간 밖에 있는 것들(입력 순서 유지) */
export function outsideAvailability(times: (string | null | undefined)[], slots: AvailabilitySlot[]): string[] {
  return times.filter((t): t is string => !!t && !isWithinAvailability(t, slots));
}
