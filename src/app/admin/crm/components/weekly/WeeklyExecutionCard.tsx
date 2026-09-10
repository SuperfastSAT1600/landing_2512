'use client';

import type { WeeklyExecutionRow } from '@/types/crm';
import { LeadChips } from './LeadChips';
import { STRATEGY_TYPE_LABELS, manwon } from './format';

interface Props {
  row: WeeklyExecutionRow;
  goal?: string;
  /** 계획이 하나라도 있을 때만 '계획 외'를 표시한다(계획이 없으면 대비 의미가 없다). */
  markUnplanned?: boolean;
  onSelectStudent?: (id: string) => void;
}

/** 전략 1건의 그 주 실행 요약 + 적용된 리드 목록. */
export function WeeklyExecutionCard({ row, goal, markUnplanned, onSelectStudent }: Props) {
  return (
    <li className="rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-gray-900">{row.strategy_name}</span>
        <span className="text-[10px] text-gray-400">{STRATEGY_TYPE_LABELS[row.type]}</span>
        {markUnplanned && !row.planned && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
            계획 외
          </span>
        )}
        {goal && <span className="text-[11px] text-gray-500">목표 {goal}</span>}
      </div>

      {row.applied_count === 0 ? (
        <p className="mt-1.5 text-[11px] text-gray-400">이번 주 적용 기록이 없습니다.</p>
      ) : (
        <>
          <p className="mt-1.5 text-[11px] text-gray-500 tabular-nums">
            적용 {row.applied_count} · 컨택 {row.contacted_count} · 결제 {row.paid_count} · 매출{' '}
            {manwon(row.revenue)}원
          </p>
          <div className="mt-1.5">
            <LeadChips leads={row.leads} onSelectStudent={onSelectStudent} />
          </div>
        </>
      )}
    </li>
  );
}
