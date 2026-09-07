'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';
import { shiftWeekStart, weekEndOf, weekLabelOf } from '@/lib/marketing-week';
import { achievementRate } from './format';
import { useWeeklyGoals } from './useWeeklyGoals';

/** 이번 주 기준 오프셋을 사람이 읽는 라벨로. 이번 주/지난주 혼동이 이 기능의 최대 리스크다. */
function offsetBadge(offset: number): { text: string; className: string } {
  if (offset === 0) return { text: '이번 주', className: 'bg-blue-600 text-white' };
  if (offset === -1) return { text: '지난주', className: 'bg-amber-500 text-black' };
  if (offset === 1) return { text: '다음 주', className: 'bg-emerald-600 text-white' };
  if (offset < -1) return { text: `${-offset}주 전`, className: 'bg-white/10 text-gray-300' };
  return { text: `${offset}주 후`, className: 'bg-white/10 text-gray-300' };
}

function weeksBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / (7 * 86400000));
}

/**
 * 주차별 리드 목표 편집기 — 목표는 주차 총합 하나다.
 *
 * 주차를 이동하면 그 주차의 목표·실적으로 교체되고, 어느 주차를 보고 있는지 배지로 못 박는다.
 * 읽어온 주차 데이터는 onSnapshot 으로 상위에 올린다 — 소스 구성표가 같은 주차를 따라가도록.
 */
export default function WeeklyGoalEditor({
  adminKey,
  currentWeekStart,
  onSaved,
  onSnapshot,
}: {
  adminKey: string;
  currentWeekStart: string;
  onSaved: () => void;
  onSnapshot?: (row: WeeklyGoalRow | null) => void;
}) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const { snapshot, draft, setDraft, loading, saving, dirty, save } = useWeeklyGoals(weekStart, adminKey);

  const badge = offsetBadge(weeksBetween(currentWeekStart, weekStart));
  const actualTotal = snapshot?.actual_total ?? 0;
  const target = draft === '' ? null : Number(draft);
  const rate = achievementRate(actualTotal, target);

  // 읽어온 주차 데이터를 상위에 올린다 (주차 이동·저장 후 모두 반영된다).
  useEffect(() => {
    onSnapshot?.(snapshot);
  }, [snapshot, onSnapshot]);

  async function handleSave() {
    if (await save()) onSaved();
  }

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5 space-y-4">
      {/* 주차 네비게이션 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">주차 리드 목표</h3>
          <div className="flex items-center gap-1">
            <button
              aria-label="이전 주차"
              onClick={() => setWeekStart(shiftWeekStart(weekStart, -1))}
              className="w-7 h-7 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
            >
              ◀
            </button>
            <span
              data-testid="week-label"
              className="text-sm text-gray-200 font-medium min-w-[8.5rem] text-center"
            >
              {weekLabelOf(weekStart)}
            </span>
            <button
              aria-label="다음 주차"
              onClick={() => setWeekStart(shiftWeekStart(weekStart, 1))}
              className="w-7 h-7 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
            >
              ▶
            </button>
          </div>
          <span
            data-testid="week-offset-badge"
            className={`text-xs px-2 py-0.5 rounded font-medium ${badge.className}`}
          >
            {badge.text}
          </span>
          {loading && <Loader2 size={13} className="animate-spin text-gray-500" />}
        </div>
        <span className="text-xs text-gray-500">
          {weekStart} ~ {weekEndOf(weekStart)}
        </span>
      </div>

      {/* 목표 입력 + 실적 */}
      <div className="flex items-end gap-6 flex-wrap pt-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="weekly-target" className="text-xs text-gray-500">목표 리드 수</label>
          <div className="flex items-center gap-2">
            <input
              id="weekly-target"
              aria-label="주차 목표 리드 수"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="미설정"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-28 bg-[#151719] border border-white/10 rounded-md px-3 py-2 text-lg text-white text-right outline-none focus:border-blue-500"
            />
            <span className="text-sm text-gray-500">개</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500">실적</span>
          <span className="text-lg font-bold text-white pb-1.5" data-testid="actual-total">
            {actualTotal}개
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500">달성률</span>
          <span
            data-testid="achievement-rate"
            className={`text-lg font-bold pb-1.5 ${
              rate === null ? 'text-gray-600' :
              rate >= 100 ? 'text-emerald-400' :
              rate >= 70 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {rate === null ? '—' : `${rate}%`}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md bg-blue-600 text-white disabled:bg-white/5 disabled:text-gray-600 hover:bg-blue-500 disabled:hover:bg-white/5 transition-colors"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          저장
        </button>
      </div>

      <p className="text-xs text-gray-600 pt-1 border-t border-white/5">
        비우고 저장하면 목표 미설정으로 되돌아갑니다. 0 은 &quot;0개 목표&quot;로 저장됩니다.
      </p>
    </div>
  );
}
