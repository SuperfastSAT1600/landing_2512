'use client';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getKstDateStr(offsetDays: number): string {
  const d = new Date();
  d.setTime(d.getTime() + 9 * 60 * 60 * 1000); // shift to KST
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTabLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = DAY_LABELS[date.getDay()];
  return `${m}/${d}(${dow})`;
}

interface Props {
  selected: string;
  onChange: (date: string) => void;
}

export function DayTabs({ selected, onChange }: Props) {
  const dates = [0, 1, 2].map(getKstDateStr);

  return (
    <div className="flex gap-1 mb-6">
      {dates.map((date, i) => {
        const isActive = selected === date;
        return (
          <button
            key={date}
            onClick={() => onChange(date)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-gray-900 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {i === 0 ? '오늘 ' : i === 1 ? '내일 ' : '모레 '}
            {formatTabLabel(date)}
          </button>
        );
      })}
    </div>
  );
}

export { getKstDateStr };
