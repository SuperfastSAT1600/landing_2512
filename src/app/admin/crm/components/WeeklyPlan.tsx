'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { WeeklyPlanSegment, WeeklyRetroNextAction, WeeklyTrack } from '@/types/crm';
import { getWeekDef, weekByOffset, type WeekDef } from '@/lib/week-definitions';
import { appendToWeek, useWeeklyPlan } from './weekly/useWeeklyPlan';
import { WeeklyKpiStrip } from './weekly/WeeklyKpiStrip';
import { WeeklyNotes } from './weekly/WeeklyNotes';
import { WeeklyRetro } from './weekly/WeeklyRetro';
import { WeeklyRetroBanner } from './weekly/WeeklyRetroBanner';
import { WeeklyTrackSections, type SegmentFilter } from './weekly/WeeklyTrackSections';
import { WeeklyWeekNav } from './weekly/WeeklyWeekNav';
import { SEGMENT_LABELS } from './weekly/presets';
import { manwon } from './weekly/format';

interface Props {
  segment: WeeklyPlanSegment; // 워크스페이스 세그먼트 — 회고·보완 기록의 기준
  adminKey: string;
  dailyView?: React.ReactNode; // 있으면 '오늘 실행' 서브뷰 노출(b2c)
  todayISO?: string; // 초기 주차 계산용. 기본 현재 시각.
  onSelectStudent?: (id: string) => void; // 실행 리드 클릭 → 학생 패널
  onOpenStrategyLibrary?: () => void; // 세일즈 전략 > 전략 라이브러리로 이동
}

const CARRY_TRACK_NAME = '지난주 회고 이어받기';

/**
 * 주간 운영 루프 — 이번 주 실적(읽기) → 트랙(목표 + 실행 항목) → 회고 → 다음 주 이어받기.
 *
 * 트랙 진행률은 트랙에 연결된 전략의 주간 집계(students.strategy_history)에서 나온다.
 * 세그먼트별로 저장되지만(weekly_plans는 segment,week_start 유일) 한 화면에서 함께 편집한다.
 */
export function WeeklyPlan({
  segment, adminKey, dailyView, todayISO, onSelectStudent, onOpenStrategyLibrary,
}: Props) {
  const today = todayISO ?? new Date().toISOString();
  const [subView, setSubView] = useState<'plan' | 'today'>(dailyView ? 'today' : 'plan');
  const [filter, setFilter] = useState<SegmentFilter>('all');
  const [week, setWeek] = useState<WeekDef | null>(() => getWeekDef(today));

  const weekStart = week?.start ?? null;
  // 두 세그먼트를 한 화면에서 편집하므로 항상 둘 다 불러온다(훅은 조건부 호출 불가).
  const b2c = useWeeklyPlan('b2c', adminKey, weekStart);
  const b2b = useWeeklyPlan('b2b', adminKey, weekStart);
  const bySegment = { b2c, b2b } as const;
  const primary = bySegment[segment];

  const visible: WeeklyPlanSegment[] = filter === 'all' ? ['b2c', 'b2b'] : [filter];
  const loading = visible.some((s) => bySegment[s].loading) || !primary.plan;
  const error = visible.map((s) => bySegment[s].error).find(Boolean) ?? '';

  const nextWeek = week ? weekByOffset(week.start, 1) : null;

  // 기록 시각: 이번 주면 지금, 지난 주차를 보고 있으면 그 주 마지막 날 정오(주 범위 안에 들도록).
  const currentWeek = getWeekDef(today);
  const logAt =
    week && currentWeek && week.start === currentWeek.start
      ? new Date().toISOString()
      : `${week?.end ?? today.slice(0, 10)}T12:00:00+09:00`;

  // 한 리드가 여러 전략을 받았을 수 있으므로 리드 단위로 중복 제거해 합산한다.
  const summary = (() => {
    const seen = new Map<string, { paid: boolean; revenue: number }>();
    for (const row of primary.data?.execution ?? []) {
      for (const l of row.leads) seen.set(l.student_id, { paid: l.paid, revenue: l.revenue });
    }
    const leads = [...seen.values()];
    const revenue = leads.reduce((n, l) => n + l.revenue, 0);
    return `이 주 실적: 적용 리드 ${leads.length} · 결제 ${leads.filter((l) => l.paid).length} · 매출 ${manwon(revenue)}원`;
  })();

  /** 회고 항목을 다음 주 '지난주 회고 이어받기' 트랙으로 넘긴다. */
  const carryOver = async (item: WeeklyRetroNextAction) => {
    if (!nextWeek || !week) return false;
    const newItem = {
      id: crypto.randomUUID(),
      text: item.text,
      done: false,
      done_at: null,
      strategy_id: null,
      strategy_name: null,
      strategy_type: null,
    };
    return appendToWeek(segment, adminKey, nextWeek.start, (target) => {
      const existing = target.tracks.find((t) => t.name === CARRY_TRACK_NAME);
      if (existing) {
        return {
          tracks: target.tracks.map((t) =>
            t.id === existing.id ? { ...t, items: [...t.items, newItem] } : t,
          ),
        };
      }
      const carried: WeeklyTrack = {
        id: crypto.randomUUID(),
        name: CARRY_TRACK_NAME,
        goal_text: '',
        metric: null,
        target_value: 0,
        achieved: false,
        items: [newItem],
        carried_from_week: week.start,
      };
      return { tracks: [...target.tracks, carried] };
    });
  };

  return (
    <div className="space-y-5">
      <WeeklyWeekNav
        week={week}
        subView={dailyView ? subView : undefined}
        onSubView={dailyView ? setSubView : undefined}
        onShift={(offset) => week && setWeek(weekByOffset(week.start, offset) ?? week)}
        onThisWeek={() => setWeek(getWeekDef(today))}
      />

      {subView === 'today' && dailyView}

      {subView === 'plan' && (
        loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중…
          </div>
        ) : (
          <>
            {error && <p className="text-xs text-red-500">{error}</p>}

            {primary.data?.prev && !primary.data.prev.retro_filled && (
              <WeeklyRetroBanner
                weekLabel={primary.data.prev.week_label}
                onGoToWeek={() => {
                  const target = weekByOffset(primary.data!.prev!.week_start, 0);
                  if (target) setWeek(target);
                }}
              />
            )}

            <WeeklyKpiStrip
              showSegmentLabel={filter === 'all'}
              adminKey={adminKey}
              week={{ start: week!.start, end: week!.end }}
              onSelectStudent={onSelectStudent}
              rows={visible.map((s) => ({ segment: s, actuals: bySegment[s].data?.actuals ?? {} }))}
            />

            <WeeklyTrackSections
              adminKey={adminKey}
              logAt={logAt}
              filter={filter}
              visible={visible}
              onFilter={setFilter}
              onSelectStudent={onSelectStudent}
              onOpenLibrary={onOpenStrategyLibrary}
              data={{
                b2c: {
                  tracks: b2c.plan?.tracks ?? [],
                  execution: b2c.data?.execution ?? [],
                  onChange: (tracks) => b2c.save({ tracks }),
                  onLogged: b2c.reload,
                },
                b2b: {
                  tracks: b2b.plan?.tracks ?? [],
                  execution: b2b.data?.execution ?? [],
                  onChange: (tracks) => b2b.save({ tracks }),
                  onLogged: b2b.reload,
                },
              }}
            />

            <div className="border-b border-gray-100 pb-6">
              <WeeklyNotes
                notes={primary.plan?.execution_notes ?? []}
                onChange={(execution_notes) => primary.save({ execution_notes })}
              />
            </div>

            <WeeklyRetro
              title={`이 주 회고 · ${SEGMENT_LABELS[segment]}`}
              retro={primary.plan!.retrospective}
              summary={summary}
              nextWeekLabel={nextWeek?.label ?? null}
              onChange={(retrospective) => primary.save({ retrospective })}
              onCarryOver={carryOver}
            />
          </>
        )
      )}
    </div>
  );
}
