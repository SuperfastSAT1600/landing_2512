'use client';

import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { kstDateStr, type InsightPeriod } from '@/types/crm';

const today = () => kstDateStr(Date.now());

/** 기본 분석 기간 = 오늘로부터 직전 한 달(최근 30일: 오늘−29일 ~ 오늘, KST). '최근 30일' 프리셋과 동일. */
export function defaultPeriod(): InsightPeriod {
  const t = today();
  return { from: format(subDays(parseISO(t), 29), 'yyyy-MM-dd'), to: t };
}
export const isDefaultPeriod = (p: InsightPeriod) => {
  const d = defaultPeriod();
  return p.from === d.from && p.to === d.to;
};

interface Preset {
  id: string;
  label: string;
  range: () => InsightPeriod;
}
const PRESETS: Preset[] = [
  { id: '7d', label: '최근 7일', range: () => ({ from: format(subDays(parseISO(today()), 6), 'yyyy-MM-dd'), to: today() }) },
  { id: '30d', label: '최근 30일', range: () => defaultPeriod() },
  { id: 'month', label: '이번 달', range: () => ({ from: `${today().slice(0, 7)}-01`, to: today() }) },
  {
    id: 'prevMonth',
    label: '지난 달',
    range: () => {
      const pm = subMonths(parseISO(today()), 1);
      return { from: format(startOfMonth(pm), 'yyyy-MM-dd'), to: format(endOfMonth(pm), 'yyyy-MM-dd') };
    },
  },
];
function matchPreset(p: InsightPeriod): string {
  const hit = PRESETS.find((ps) => {
    const r = ps.range();
    return r.from === p.from && r.to === p.to;
  });
  return hit?.id ?? 'custom';
}

interface Props {
  period: InsightPeriod;
  onApply: (p: InsightPeriod) => void;
  disabled?: boolean;
}

/** 분석 기간 선택 UI — 프리셋 + 시작·종료일 직접 입력. 배너·전략 대화가 공유. */
export function PeriodPicker({ period, onApply, disabled }: Props) {
  const [draftFrom, setDraftFrom] = useState(period.from);
  const [draftTo, setDraftTo] = useState(period.to);

  // 외부에서 period가 바뀌면(프리셋 적용 등) draft 동기화 — 렌더 중 이전값 비교(effect 없이).
  const [seen, setSeen] = useState(period);
  if (seen.from !== period.from || seen.to !== period.to) {
    setSeen(period);
    setDraftFrom(period.from);
    setDraftTo(period.to);
  }

  const activePreset = matchPreset(period);

  function applyCustom() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    const t = today();
    const to = draftTo > t ? t : draftTo; // 미래 종료일 클램프
    onApply({ from: draftFrom, to });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((ps) => (
          <button
            key={ps.id}
            onClick={() => onApply(ps.range())}
            disabled={disabled}
            className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors disabled:opacity-50 ${
              activePreset === ps.id
                ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                : 'border-indigo-200 text-indigo-500 hover:bg-indigo-100/50'
            }`}
          >
            {ps.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-indigo-200" />
        <input
          type="date"
          value={draftFrom}
          max={today()}
          onChange={(e) => setDraftFrom(e.target.value)}
          disabled={disabled}
          className="text-[11px] border border-indigo-200 rounded-md px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
        />
        <span className="text-[11px] text-indigo-400">~</span>
        <input
          type="date"
          value={draftTo}
          max={today()}
          onChange={(e) => setDraftTo(e.target.value)}
          disabled={disabled}
          className="text-[11px] border border-indigo-200 rounded-md px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={applyCustom}
          disabled={disabled || !draftFrom || !draftTo || draftFrom > draftTo}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          조회
        </button>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-400">
        <CalendarRange size={11} /> 분석 기간 {period.from} ~ {period.to}
      </p>
    </div>
  );
}
