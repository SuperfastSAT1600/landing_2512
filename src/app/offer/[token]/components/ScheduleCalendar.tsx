'use client';

import { toZonedTime, format } from 'date-fns-tz';
import type { WeeklySlot } from '@/types/crm';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  otDatetime: string | null;
  weeklySchedule: WeeklySlot[] | null;
  coachTimezone: string | null;
}

function convertSlotToCoachTimezone(
  slot: WeeklySlot,
  coachTimezone: string
): { day: number; hour: number; minute: number } {
  // Build a reference date for this slot in the slot's timezone
  // Use a fixed reference week (2024-01-07 is a Sunday)
  const refSundayUTC = new Date('2024-01-07T00:00:00Z');
  const dayOffsetMs = slot.day_of_week * 24 * 60 * 60 * 1000;
  const hourOffsetMs = slot.hour * 60 * 60 * 1000;
  const minuteOffsetMs = slot.minute * 60 * 1000;

  // Get UTC offset for slot's timezone at reference date
  const refDate = new Date(refSundayUTC.getTime() + dayOffsetMs + hourOffsetMs + minuteOffsetMs);
  const slotZonedRef = toZonedTime(refDate, slot.timezone);

  // Compute UTC time: refDate is already UTC-equivalent if we treat slot times as local
  // We need to convert slot local time → UTC → coachTimezone
  // Format the slot local time string
  const slotLocalStr = format(slotZonedRef, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: slot.timezone });

  // Parse it as UTC to get the UTC equivalent
  const slotUtcDate = new Date(slotLocalStr + 'Z');

  // Now convert UTC to coach timezone
  const coachZoned = toZonedTime(slotUtcDate, coachTimezone);
  const dayOfWeek = coachZoned.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const hour = coachZoned.getHours();
  const minute = coachZoned.getMinutes() as 0 | 30;

  return { day: dayOfWeek, hour, minute };
}

function formatTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, '0');
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getSlotKey(day: number, hour: number, minute: number): string {
  return `${day}-${hour}-${minute}`;
}

export function ScheduleCalendar({ otDatetime, weeklySchedule, coachTimezone }: Props) {
  if (!coachTimezone) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-gray-400 text-sm">타임존을 먼저 선택해주세요.</p>
      </div>
    );
  }

  const convertedSlots = new Set<string>();
  if (weeklySchedule) {
    for (const slot of weeklySchedule) {
      try {
        const converted = convertSlotToCoachTimezone(slot, coachTimezone);
        convertedSlots.add(getSlotKey(converted.day, converted.hour, converted.minute));
      } catch {
        // Skip invalid slots
      }
    }
  }

  // Collect all unique hours that have slots
  const allHours = new Set<number>();
  if (weeklySchedule) {
    for (const slot of weeklySchedule) {
      try {
        const converted = convertSlotToCoachTimezone(slot, coachTimezone);
        allHours.add(converted.hour);
        if (converted.minute === 30) allHours.add(converted.hour);
      } catch {
        // Skip
      }
    }
  }

  // Build time rows: collect all (hour, minute) pairs from converted slots
  const timeRows: { hour: number; minute: number }[] = [];
  if (weeklySchedule && weeklySchedule.length > 0) {
    const timeSet = new Set<string>();
    for (const slot of weeklySchedule) {
      try {
        const converted = convertSlotToCoachTimezone(slot, coachTimezone);
        const key = `${converted.hour}-${converted.minute}`;
        if (!timeSet.has(key)) {
          timeSet.add(key);
          timeRows.push({ hour: converted.hour, minute: converted.minute });
        }
      } catch {
        // Skip
      }
    }
    timeRows.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  }

  let otFormatted: string | null = null;
  if (otDatetime) {
    try {
      const otZoned = toZonedTime(new Date(otDatetime), coachTimezone);
      otFormatted = format(otZoned, 'yyyy년 M월 d일 (EEE) HH:mm', { timeZone: coachTimezone });
    } catch {
      otFormatted = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* OT datetime */}
      {otFormatted && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">OT 희망 일시</p>
          <p className="text-white font-semibold text-base">{otFormatted}</p>
        </div>
      )}

      {/* Weekly schedule grid */}
      {weeklySchedule && weeklySchedule.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">정규 수업 가능 시간</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="bg-white/5 px-3 py-2 text-gray-400 font-medium text-left w-14">시간</th>
                  {DAY_LABELS.map((day, i) => (
                    <th
                      key={i}
                      className="bg-white/5 px-2 py-2 text-gray-400 font-medium text-center min-w-[40px]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeRows.map(({ hour, minute }) => (
                  <tr key={`${hour}-${minute}`} className="border-t border-white/5">
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                      {formatTime(hour, minute)}
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const active = convertedSlots.has(getSlotKey(day, hour, minute));
                      return (
                        <td key={day} className="px-2 py-1.5 text-center">
                          {active ? (
                            <span className="inline-block w-5 h-5 rounded bg-blue-600" aria-label="가능" />
                          ) : (
                            <span className="inline-block w-5 h-5 rounded bg-white/5" aria-label="불가" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ 시간은 {coachTimezone}으로 표시됩니다. DST(서머타임)가 적용된 경우 실제 시간이 다를 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-gray-400 text-sm">아직 정규 스케줄이 입력되지 않았습니다.</p>
        </div>
      )}
    </div>
  );
}
