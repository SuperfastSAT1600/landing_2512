'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { WeeklyPlanSegment, WeeklyRetroNextAction } from '@/types/crm';
import { getWeekDef, weekByOffset, type WeekDef } from '@/lib/week-definitions';
import { appendToWeek, useWeeklyPlan } from './weekly/useWeeklyPlan';
import { WeeklyActions } from './weekly/WeeklyActions';
import { WeeklyExecution } from './weekly/WeeklyExecution';
import { WeeklyFocusStrategies } from './weekly/WeeklyFocusStrategies';
import { WeeklyNotes } from './weekly/WeeklyNotes';
import { WeeklyRetro } from './weekly/WeeklyRetro';
import { WeeklyRetroBanner } from './weekly/WeeklyRetroBanner';
import { WeeklyTargets } from './weekly/WeeklyTargets';
import { manwon } from './weekly/format';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  dailyView?: React.ReactNode; // 있으면 '오늘 실행' 서브뷰 노출(b2c)
  todayISO?: string; // 초기 주차 계산용. 기본 현재 시각.
  onSelectStudent?: (id: string) => void; // 실행 리드 클릭 → 학생 패널
  onOpenStrategyLibrary?: () => void; // 세일즈 전략 > 전략 라이브러리로 이동
}

/**
 * 주간 운영 루프 — 계획(집중 전략·목표·할 일) → 실행·결과(자동 집계) → 회고 → 다음 주 이어받기.
 * 실행 기록은 students.strategy_history를 주 범위로 집계한 결과다(이중 입력 없음).
 */
export function WeeklyPlan({
  segment, adminKey, dailyView, todayISO, onSelectStudent, onOpenStrategyLibrary,
}: Props) {
  const today = todayISO ?? new Date().toISOString();
  const [subView, setSubView] = useState<'plan' | 'today'>('today');
  const [week, setWeek] = useState<WeekDef | null>(() => getWeekDef(today));

  const { data, plan, loading, error, reload, save } = useWeeklyPlan(segment, adminKey, week?.start ?? null);

  const nextWeek = week ? weekByOffset(week.start, 1) : null;
  const goToWeek = (weekStart: string) => {
    const target = weekByOffset(weekStart, 0);
    if (target) setWeek(target);
  };

  // 기록 시각: 이번 주면 지금, 지난 주차를 보고 있으면 그 주 마지막 날 정오(주 범위 안에 들도록).
  const currentWeek = getWeekDef(today);
  const logAt =
    week && currentWeek && week.start === currentWeek.start
      ? new Date().toISOString()
      : `${week?.end ?? today.slice(0, 10)}T12:00:00+09:00`;

  const execution = data?.execution ?? [];
  // 한 리드가 여러 전략을 받았을 수 있으므로 리드 단위로 중복 제거해 합산한다.
  const summary = (() => {
    const seen = new Map<string, { paid: boolean; revenue: number }>();
    for (const row of execution) {
      for (const l of row.leads) seen.set(l.student_id, { paid: l.paid, revenue: l.revenue });
    }
    const leads = [...seen.values()];
    const paid = leads.filter((l) => l.paid).length;
    const revenue = leads.reduce((n, l) => n + l.revenue, 0);
    return `이 주 실적: 적용 리드 ${leads.length} · 결제 ${paid} · 매출 ${manwon(revenue)}원`;
  })();

  const carryOver = async (item: WeeklyRetroNextAction) => {
    if (!nextWeek) return false;
    return appendToWeek(segment, adminKey, nextWeek.start, (target) => ({
      actions: [
        ...target.actions,
        { id: crypto.randomUUID(), text: item.text, done: false, done_at: null },
      ],
    }));
  };

  return (
    <div className="space-y-5">
      {/* 서브뷰 + 주 네비 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {dailyView ? (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([['plan', '주간 계획'], ['today', '오늘 실행']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSubView(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  subView === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : <div />}

        {subView === 'plan' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => week && setWeek(weekByOffset(week.start, -1) ?? week)}
              className="p-1 rounded text-gray-400 hover:bg-gray-100"
              aria-label="이전 주"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
              {week?.label ?? '-'}
            </span>
            <button
              onClick={() => week && setWeek(weekByOffset(week.start, 1) ?? week)}
              className="p-1 rounded text-gray-400 hover:bg-gray-100"
              aria-label="다음 주"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setWeek(getWeekDef(today))}
              className="ml-1 px-2.5 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-100"
            >
              이번 주
            </button>
          </div>
        )}
      </div>

      {subView === 'today' && dailyView}

      {subView === 'plan' && (
        loading || !plan ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중…
          </div>
        ) : (
          <>
            {error && <p className="text-xs text-red-500">{error}</p>}

            {data?.prev && !data.prev.retro_filled && (
              <WeeklyRetroBanner
                weekLabel={data.prev.week_label}
                onGoToWeek={() => goToWeek(data.prev!.week_start)}
              />
            )}

            <WeeklyFocusStrategies
              segment={segment}
              adminKey={adminKey}
              focus={plan.focus_strategies}
              onChange={(focus_strategies) => save({ focus_strategies })}
              onOpenLibrary={onOpenStrategyLibrary}
            />

            <WeeklyExecution
              segment={segment}
              adminKey={adminKey}
              execution={execution}
              focus={plan.focus_strategies}
              logAt={logAt}
              onLogged={reload}
              onSelectStudent={onSelectStudent}
            />

            <WeeklyTargets
              targets={plan.targets}
              actuals={data?.actuals ?? {}}
              onSave={(targets) => save({ targets })}
            />

            <div className="border-b border-gray-100 pb-6">
              <WeeklyActions actions={plan.actions} onChange={(actions) => save({ actions })} />
              <WeeklyNotes
                notes={plan.execution_notes}
                onChange={(execution_notes) => save({ execution_notes })}
              />
            </div>

            <WeeklyRetro
              retro={plan.retrospective}
              summary={summary}
              nextWeekLabel={nextWeek?.label ?? null}
              onChange={(retrospective) => save({ retrospective })}
              onCarryOver={carryOver}
            />
          </>
        )
      )}
    </div>
  );
}
