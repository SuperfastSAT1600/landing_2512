'use client';

interface Props {
  selectedDate: string;
  onSelect: (date: string) => void;
}

function getLocalDateString(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatLabel(dateStr: string): string {
  const today = getLocalDateString(0);
  const yesterday = getLocalDateString(-1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [, m, d] = dateStr.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`;
}

function offsetFromToday(dateStr: string): number {
  const today = new Date(getLocalDateString(0) + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function DateNavigator({ selectedDate, onSelect }: Props) {
  const offset = offsetFromToday(selectedDate);
  const canGoForward = offset < 0;

  function go(delta: number) {
    const next = new Date(selectedDate + 'T00:00:00');
    next.setDate(next.getDate() + delta);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    onSelect(`${y}-${m}-${d}`);
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={() => go(-1)}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        aria-label="Previous day"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="text-center">
        <p className="text-base font-bold text-gray-900">{formatLabel(selectedDate)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{selectedDate}</p>
      </div>

      <button
        onClick={() => go(1)}
        disabled={!canGoForward}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next day"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
