'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import type { StrategyTransitionRow } from '@/lib/strategy-stats';

/**
 * 콜 전에 준비한 전략(계획)이 실제로 어떤 전략으로 바뀌었는지.
 *
 * 전략별 전환율만 보면 "무엇이 잘 팔리나"는 알아도 "무엇으로 갈아타야 하나"는 모른다.
 * 계획 → 실제 쌍으로 묶어야 그 판단이 선다. 카테고리 안에서만 본다.
 */
export function TransitionPanel({ transitions }: { transitions: StrategyTransitionRow[] }) {
  const [open, setOpen] = useState(true);
  if (!transitions.length) return null;

  const kept = sum(transitions.filter((t) => !t.changed && t.applied_id));
  const changed = sum(transitions.filter((t) => t.changed));
  const missing = sum(transitions.filter((t) => !t.applied_id));

  return (
    <div className="rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          {open ? <ChevronDown size={12} className="text-gray-300" /> : <ChevronRight size={12} className="text-gray-300" />}
          계획 → 실제 전환
        </span>
        <span className="text-[11px] text-gray-400 tabular-nums">
          계획 유지 {kept} · 변경 {changed}
          {missing > 0 && ` · 실제 미기록 ${missing}`}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-gray-400">
                <th className="text-left font-medium pb-1.5">진행 전 (계획)</th>
                <th className="text-left font-medium pb-1.5 pl-6">진행 후 (실제)</th>
                <th className="text-right font-medium pb-1.5">리드</th>
                <th className="text-right font-medium pb-1.5">결제</th>
                <th className="text-right font-medium pb-1.5">전환율</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t) => (
                <tr key={`${t.planned_id ?? '-'}>${t.applied_id ?? '-'}`} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 text-gray-700 max-w-[220px] truncate">
                    {t.planned_name ?? <span className="text-gray-300">기록 없음</span>}
                  </td>
                  <td className="py-1.5 pl-6 pr-2 max-w-[260px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ArrowRight size={11} className="shrink-0 text-gray-300" />
                      {t.applied_id === null ? (
                        <span className="text-gray-300">기록 없음</span>
                      ) : t.changed ? (
                        <>
                          <span className="truncate text-gray-900 font-medium">{t.applied_name}</span>
                          <span className="shrink-0 rounded px-1 py-0.5 text-[10px] bg-amber-50 text-amber-600">변경</span>
                        </>
                      ) : t.planned_id ? (
                        // 계획과 같은 전략이라 이름을 반복하지 않는다.
                        <span className="text-gray-400">계획과 동일</span>
                      ) : (
                        // 계획 기록 자체가 없는 줄. '동일'이라고 쓰면 거짓말이고, 실제 전략명을 보여줘야 한다.
                        <span className="truncate text-gray-700">{t.applied_name}</span>
                      )}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-600">{t.leads}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-600">{t.paid}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold text-gray-900">
                    {Math.round(t.rate)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const sum = (rows: StrategyTransitionRow[]) => rows.reduce((n, t) => n + t.leads, 0);
