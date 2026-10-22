'use client';

export function DateNav({ date, availableDates, onChange }: { date: string; availableDates: string[]; onChange: (date: string) => void }) {
  // availableDates는 최신순 — 앞 인덱스가 더 최근 날짜
  const index = availableDates.indexOf(date);
  const older = index >= 0 ? availableDates[index + 1] : undefined;
  const newer = index > 0 ? availableDates[index - 1] : undefined;

  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={!older} onClick={() => older && onChange(older)} aria-label="이전 날짜"
        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">◀</button>
      <select value={date} onChange={e => onChange(e.target.value)} aria-label="날짜 선택"
        className="rounded border border-gray-300 px-2 py-1 text-sm">
        {!availableDates.includes(date) && <option value={date}>{date}</option>}
        {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <button type="button" disabled={!newer} onClick={() => newer && onChange(newer)} aria-label="다음 날짜"
        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">▶</button>
    </div>
  );
}
