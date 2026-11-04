import type { AvailabilitySummary, AvailabilityOccurrence } from '@/lib/student-availability';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const mmdd = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;

function Occurrence({ o }: { o: AvailabilityOccurrence }) {
  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-sm font-semibold text-gray-900">
          {mmdd(o.dateKst)}({WEEKDAYS[o.weekdayKst]}) <span className="font-mono tabular-nums">{o.start} ~ {o.end}</span>
          <span className="ml-1 text-[10px] font-medium text-gray-400">KST</span>
        </span>
        <span className="text-xs text-gray-500">
          학생 현지 {mmdd(o.dateLocal)}({WEEKDAYS[o.weekdayLocal]}) <span className="font-mono tabular-nums">{o.startLocal} ~ {o.endLocal}</span>
        </span>
      </div>
      {o.notes && <p className="mt-0.5 text-xs text-gray-500">{o.notes}</p>}
    </li>
  );
}

// SFv2에 학생이 직접 입력한 코치룸 가능 시간 — 오늘부터 14일간의 실제 날짜로 풀어서 보여 준다 (KST 기준, 학생 현지 시간 병기)
export function AvailabilitySchedule({ availability }: { availability: AvailabilitySummary }) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-gray-500">학생 입력 가능 시간 (SFv2)</p>
        <p className="text-xs text-gray-400">학생 시간대: {availability.studentTz}</p>
        <p className="text-[11px] text-gray-400">오늘부터 14일간의 날짜입니다. 입력한 시간은 매주 반복되며, 설정한 기간 안에서만 유효합니다.</p>
      </div>
      {availability.upcoming.length === 0 ? (
        <p className="text-xs text-gray-500">앞으로 14일 안에 가능한 날짜가 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {availability.upcoming.map((o) => <Occurrence key={`${o.dateKst}-${o.start}`} o={o} />)}
        </ul>
      )}
    </div>
  );
}
