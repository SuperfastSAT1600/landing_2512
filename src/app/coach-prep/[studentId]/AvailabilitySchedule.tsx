import type { AvailabilitySummary, AvailabilityLine } from '@/lib/student-availability';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const mmdd = (iso: string | null) => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}` : '');

function Line({ line }: { line: AvailabilityLine }) {
  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-sm font-semibold text-gray-900">
          {line.dateKst && <>{mmdd(line.dateKst)} </>}{WEEKDAYS[line.weekdayKst]}요일 <span className="font-mono tabular-nums">{line.start} ~ {line.end}</span>
          <span className="ml-1 text-[10px] font-medium text-gray-400">KST</span>
          {!line.dateKst && <span className="ml-1.5 text-[10px] font-medium text-amber-600">유효 기간 지남</span>}
        </span>
        <span className="text-xs text-gray-500">
          학생 현지 {line.dateLocal && <>{mmdd(line.dateLocal)} </>}{WEEKDAYS[line.weekdayLocal]}요일 <span className="font-mono tabular-nums">{line.startLocal} ~ {line.endLocal}</span>
        </span>
      </div>
      {line.notes && <p className="mt-0.5 text-xs text-gray-500">{line.notes}</p>}
    </li>
  );
}

// SFv2에 학생이 직접 입력한 코치룸 가능 시간 (KST 기준, 학생 현지 시간 병기)
export function AvailabilitySchedule({ availability }: { availability: AvailabilitySummary }) {
  const single = availability.blocks.length === 1;
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-gray-500">학생 입력 가능 시간 (SFv2)</p>
        <p className="text-xs text-gray-400">학생 시간대: {availability.studentTz}</p>
        {single && <p className="text-xs text-gray-400">기간: {availability.blocks[0].period}</p>}
        <p className="text-[11px] text-gray-400">날짜는 오늘 이후 가장 가까운 해당 요일입니다. 매주 반복되며, 기간 안에서만 유효합니다.</p>
      </div>
      {availability.blocks.map((block) => (
        <div key={block.period} className="space-y-1.5">
          {!single && <p className="text-[11px] font-semibold text-violet-600">기간 {block.period}</p>}
          <ul className="space-y-1.5">
            {block.lines.map((line, i) => <Line key={i} line={line} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}
