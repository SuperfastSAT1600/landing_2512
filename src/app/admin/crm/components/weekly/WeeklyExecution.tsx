'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { WeeklyExecutionRow, WeeklyFocusStrategy, WeeklyPlanSegment } from '@/types/crm';
import { WeeklyExecutionCard } from './WeeklyExecutionCard';
import { WeeklyQuickLog } from './WeeklyQuickLog';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  execution: WeeklyExecutionRow[];
  focus: WeeklyFocusStrategy[];
  /** 기록 시각 — 보고 있는 주차 안의 시각(이번 주면 지금). */
  logAt: string;
  onLogged: () => void;
  onSelectStudent?: (id: string) => void;
}

/**
 * 이번 주 실행·결과. students.strategy_history의 그 주 적용 이력을 자동 집계한 결과이며,
 * 계획된 전략을 먼저, 계획에 없던 실행은 '계획 외' 배지로 이어서 보여준다.
 */
export function WeeklyExecution({
  segment, adminKey, execution, focus, logAt, onLogged, onSelectStudent,
}: Props) {
  const [logging, setLogging] = useState(false);

  const goalOf = (strategyId: string) => focus.find((f) => f.strategy_id === strategyId)?.goal || undefined;
  // 한 리드가 여러 전략을 받을 수 있어 리드 단위로 중복 제거해 센다.
  const totalApplied = new Set(execution.flatMap((r) => r.leads.map((l) => l.student_id))).size;

  return (
    <section className="border-b border-gray-100 pb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400">
          이번 주 실행·결과{' '}
          <span className="text-gray-300 font-normal">(적용 리드 {totalApplied}명)</span>
        </p>
        {!logging && (
          <button
            onClick={() => setLogging(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> 전략 적용 기록
          </button>
        )}
      </div>

      {logging && (
        <div className="mb-3">
          <WeeklyQuickLog
            segment={segment}
            adminKey={adminKey}
            appliedAt={logAt}
            onLogged={onLogged}
            onClose={() => setLogging(false)}
          />
        </div>
      )}

      {execution.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          이번 주 전략 적용 기록이 없습니다. ‘전략 적용 기록’으로 남기면 결과가 자동 집계됩니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {execution.map((row) => (
            <WeeklyExecutionCard
              key={row.strategy_id}
              row={row}
              goal={goalOf(row.strategy_id)}
              markUnplanned={focus.length > 0}
              onSelectStudent={onSelectStudent}
            />
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-gray-400">
        결제·매출은 적용 리드의 최초결제 기준(누적) — 전환이 다음 주에 일어나도 이 주 실적에 반영됩니다.
      </p>
    </section>
  );
}
