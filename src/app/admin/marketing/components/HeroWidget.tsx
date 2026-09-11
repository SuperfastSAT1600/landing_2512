'use client';

import type { WeeklyStats } from '@/types/marketing';
import { fmt, fmtRate } from './format';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 이번 주 리드 인입 히어로 위젯.
 *
 * 목표는 marketing_weekly_goals 에서 오며 미설정일 수 있다(weekly_target === null).
 * 미설정일 때 0% 진행률 바를 그리면 "미달"로 오독되므로 바·남은 개수·페이스 판정을 모두 감춘다.
 */
export default function HeroWidget({
  weekly,
  onAddSpend,
  onSetGoal,
}: {
  weekly: WeeklyStats;
  onAddSpend: (group: 'META' | '구글 SEO') => void;
  onSetGoal: () => void;
}) {
  const {
    this_week_total, weekly_target, pace_prediction, yoy_week_total,
    yoy_week_label, week_label, days_elapsed,
    this_week_contact_rate, this_week_conversion_rate,
    this_week_revenue, this_week_roas, this_week_ad_spend,
  } = weekly;

  const hasGoal = weekly_target !== null;
  const todayLabel = days_elapsed === 7 ? '일요일 기준' : `${DAY_LABELS[new Date().getDay()]}요일 기준`;

  const progress = hasGoal && weekly_target > 0
    ? Math.min((this_week_total / weekly_target) * 100, 100)
    : hasGoal ? 100 : 0;

  const progressColor =
    progress >= 100 ? 'bg-emerald-500' :
    progress >= 70  ? 'bg-amber-400' :
    'bg-red-500';

  const statusDot = !hasGoal ? 'bg-gray-500' :
    progress >= 100 ? 'bg-emerald-400' :
    progress >= 70  ? 'bg-amber-400' :
    'bg-red-400';

  const yoyDiff = yoy_week_total != null && yoy_week_total > 0
    ? Math.round(((this_week_total - yoy_week_total) / yoy_week_total) * 100)
    : null;

  const paceStatus = !hasGoal ? null :
    pace_prediction >= weekly_target ? '🟢 목표 달성 페이스' :
    pace_prediction >= weekly_target * 0.7 ? '🟡 목표 근접' :
    '🔴 목표 미달 예상';

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-6 space-y-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusDot} ${hasGoal ? 'animate-pulse' : ''}`} />
          <span className="text-white font-semibold">이번 주 리드 인입</span>
          <span className="text-xs text-gray-500 ml-1">{week_label} · {todayLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {paceStatus && <span className="text-xs text-gray-500">{paceStatus}</span>}
          <button
            onClick={onSetGoal}
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded px-2 py-1 transition-colors"
          >
            {hasGoal ? '목표 수정' : '목표 설정'}
          </button>
        </div>
      </div>

      {/* 목표 대비 진행 */}
      <div>
        <div className="flex items-end gap-3 mb-2">
          <span className="text-4xl font-bold text-white">{this_week_total}</span>
          {hasGoal ? (
            <>
              <span className="text-lg text-gray-500 mb-1">/ {weekly_target}개 목표</span>
              <span className="text-sm text-gray-500 mb-1 ml-auto">
                {this_week_total >= weekly_target
                  ? <span className="text-emerald-400">달성!</span>
                  : <span>{weekly_target - this_week_total}개 남음</span>}
              </span>
            </>
          ) : (
            <span className="text-lg text-gray-500 mb-1">목표 미설정</span>
          )}
        </div>

        {hasGoal && (
          <div className="w-full bg-white/5 rounded-full h-2" data-testid="goal-progress">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex justify-between mt-1.5 text-xs text-gray-600">
          <span>주말 예상 {pace_prediction}개 ({days_elapsed}일 경과)</span>
          <span>
            {yoy_week_total != null
              ? `${yoy_week_label ?? '작년 동기'} ${yoy_week_total}개 (${yoyDiff != null ? `${yoyDiff >= 0 ? '+' : ''}${yoyDiff}%` : '—'})`
              : '작년 데이터 없음'}
          </span>
        </div>
      </div>

      {/* 5대 핵심 지표 */}
      <div className="grid grid-cols-5 gap-3 pt-1 border-t border-white/5">
        <KpiCell label="인입" value={`${this_week_total}명`} />
        <KpiCell label="컨택 성공률" value={fmtRate(this_week_contact_rate)} />
        <KpiCell label="결제 전환율" value={fmtRate(this_week_conversion_rate)} />
        <KpiCell label="결제금액" value={`${fmt(this_week_revenue)}원`} />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">ROAS</span>
          {this_week_roas != null ? (
            <>
              <span className={`text-lg font-bold ${this_week_roas >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {this_week_roas.toFixed(2)}x
              </span>
              <span className="text-xs text-gray-600">{fmt(this_week_ad_spend)}원 지출</span>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold text-gray-600">—</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onAddSpend('META')}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded px-1.5 py-0.5 transition-colors"
                >
                  META
                </button>
                <button
                  onClick={() => onAddSpend('구글 SEO')}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded px-1.5 py-0.5 transition-colors"
                >
                  구글
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
  );
}
