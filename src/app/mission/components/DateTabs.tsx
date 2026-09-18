'use client';

interface Props {
  selectedDate: string;
  onSelect: (date: string) => void;
}

function getLocalDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tabLabel(dateStr: string, index: number): string {
  if (index === 0) return '오늘';
  if (index === 1) return '어제';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function DateTabs({ selectedDate, onSelect }: Props) {
  const dates = Array.from({ length: 7 }, (_, i) => getLocalDateString(i));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
      {dates.map((date, i) => {
        const active = date === selectedDate;
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              active
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tabLabel(date, i)}
          </button>
        );
      })}
    </div>
  );
}
