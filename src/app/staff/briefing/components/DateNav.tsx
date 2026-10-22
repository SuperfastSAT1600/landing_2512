'use client';

import { kstDate } from '@/lib/kst-date';
import { addDays } from '../format';

/** 날짜는 자유롭게 고른다. 저장된 브리핑이 없는 날은 화면에서 안내한다. */
export function DateNav({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = kstDate(new Date());
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label="이전 날짜"
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm">◀</button>
      <input type="date" value={date} onChange={e => e.target.value && onChange(e.target.value)} aria-label="날짜 선택"
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm" />
      <button type="button" onClick={() => onChange(addDays(date, 1))} aria-label="다음 날짜"
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm">▶</button>
      {date !== today && (
        <button type="button" onClick={() => onChange(today)} className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600">오늘</button>
      )}
    </div>
  );
}
