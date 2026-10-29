import { T } from '@/lib/guide/targets';
import AppFrame from './AppFrame';

const SAMPLE = 'weekday evenings 7-9pm, weekends 2-6pm';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function CalendarView({ saved }: { saved: boolean }) {
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">My availability</h3>
        <button type="button" data-tutorial-id={T.availEdit} aria-label="편집" className="rounded border border-gray-200 px-1.5 py-0.5 text-xs">
          &#9998;
        </button>
      </div>
      <p className={`mb-3 text-xs ${saved ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}`}>
        {saved ? 'Availability saved.' : 'Update your availability.'}
      </p>
      <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-gray-400">
        {DAYS.map((d) => (
          <div key={d} className="h-24 rounded border border-gray-100">{d}</div>
        ))}
      </div>
    </div>
  );
}

function AvailabilityDialog({ typed }: { typed: boolean }) {
  return (
    <div className="absolute inset-x-3 top-24 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
      <h3 className="mb-2 text-sm font-bold">My availability</h3>
      <p className="mb-2 border-l-4 border-blue-600 pl-2 text-xs leading-relaxed text-gray-700">
        When can you study for the SAT? Include everything and aim for the widest range. e.g. &quot;{SAMPLE}&quot;.
      </p>
      <div data-tutorial-id={T.availInput} className="mb-3 min-h-10 rounded-lg border border-blue-200 bg-blue-50/40 px-2 py-2 text-xs text-gray-800">
        {typed ? SAMPLE : <span className="text-gray-400">Type your answer...</span>}
      </div>
      <div className="text-right">
        <button
          type="button"
          {...(typed ? { 'data-tutorial-id': T.availSave } : {})}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${typed ? 'bg-gray-900' : 'bg-gray-400'}`}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// index: 0 홈 / 1 스케줄 / 2 입력창 열림 / 3 문장 입력됨 / 4 저장 완료
export default function ScheduleMock({ index }: { index: number }) {
  if (index === 0) {
    return (
      <AppFrame active="Home">
        <div className="p-3">
          <h3 className="text-base font-bold">Good evening.</h3>
          <div className="mt-3 h-14 rounded-xl bg-gray-100" />
          <div className="mt-2 h-14 rounded-xl bg-gray-100" />
        </div>
      </AppFrame>
    );
  }
  return (
    <AppFrame active="Schedule">
      <CalendarView saved={index >= 4} />
      {index === 2 || index === 3 ? <AvailabilityDialog typed={index === 3} /> : null}
    </AppFrame>
  );
}
