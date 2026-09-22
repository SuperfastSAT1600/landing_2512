'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { PerStrategyRow } from '@/lib/strategy-stats';

interface Props {
  row: PerStrategyRow;
  active: boolean;
  adminKey: string;
  onClick: () => void;
  /** 삭제 성공 — 상위가 통계를 재조회한다. */
  onDeleted: (strategyId: string) => void;
}

/**
 * 전략 통계 좌측 목록의 카드 1장.
 *
 * 삭제는 `row.exists`(= retry_strategies 에 실재)인 행에만 연다. 이력에만 남은 전략은
 * 지울 대상이 없어 눌러도 아무 일이 없으므로, 버튼 대신 '삭제됨' 배지로 상태를 드러낸다.
 * 이력이 있는 전략을 지우면 라이브러리에서는 사라지지만 통계 목록에는 과거 기록으로 남는다 —
 * 집계 기준이 strategy_history 라서 그렇고, 숨기면 과거 실적이 사라져 통계가 틀린다.
 *
 * 선택 버튼과 삭제 버튼은 **형제**로 둔다. 카드를 role="button"으로 만들고 그 안에 버튼을
 * 중첩하면 부모가 자식의 접근성 이름을 흡수해 삭제 버튼을 이름으로 집을 수 없게 된다
 * (보조기술도 같은 이유로 둘을 구분하지 못한다).
 */
export function StrategyStatsListItem({ row, active, adminKey, onClick, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const zero = row.assigned === 0;

  async function handleDelete() {
    const warn = row.assigned > 0 ? `\n\n이 기간 배정 ${row.assigned}명 · 과거 기록은 통계에 남습니다.` : '';
    if (!confirm(`"${row.strategy_name}" 전략을 삭제할까요?${warn}`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/retry-strategies/${row.strategy_id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) onDeleted(row.strategy_id);
      else alert('삭제에 실패했습니다.');
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left rounded-lg border px-3 py-2.5 pr-9 transition-colors ${
          active
            ? 'border-gray-900 bg-gray-900/[0.03] ring-1 ring-gray-900'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <p className={`text-sm font-semibold truncate ${zero ? 'text-gray-400' : 'text-gray-900'}`}>
          {row.strategy_name}
        </p>
        {zero ? (
          <p className="mt-0.5 text-[11px] text-gray-400">이 기간 배정 없음</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
            전환율 {row.conversion_rate}% · 결제 {row.paid} · 배정 {row.assigned}
          </p>
        )}
      </button>

      {row.exists ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="전략 삭제"
          title="전략 삭제"
          className="absolute right-2 top-2.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      ) : (
        <span className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-400">
          삭제됨
        </span>
      )}
    </div>
  );
}
