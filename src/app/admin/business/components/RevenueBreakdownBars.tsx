'use client';

export interface BreakdownBarRow {
  key: string;
  label: string;
  total: number;
  share: number; // %
  note: string; // 우측 보조 문구 (예: "3건 · 재$0")
  muted?: boolean; // 미지정처럼 비교 대상이 아닌 행
}

interface Props {
  rows: BreakdownBarRow[];
  /** 각 행에 붙일 data-testid */
  rowTestId: string;
  formatAmount: (n: number) => string;
}

/**
 * 매출 비중 막대 목록 — 국가별·결제 방식별 통계가 같은 모양을 공유한다.
 * recharts를 쓰지 않는다: 한 축짜리 비중 표시에 차트 번들을 더할 이유가 없다.
 */
export function RevenueBreakdownBars({ rows, rowTestId, formatAmount }: Props) {
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.key} data-testid={rowTestId} className="flex items-center gap-3">
          <span title={row.label} className="w-56 shrink-0 truncate text-xs font-medium text-gray-700">
            {row.label}
          </span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${row.muted ? 'bg-gray-300' : 'bg-blue-500'}`}
              style={{ width: `${Math.max(row.share, 1.5)}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-semibold text-gray-800 tabular-nums">
            {formatAmount(row.total)}
          </span>
          <span className="w-12 shrink-0 text-right text-[11px] text-gray-400 tabular-nums">
            {row.share.toFixed(0)}%
          </span>
          <span className="w-20 shrink-0 text-right text-[11px] text-gray-400 tabular-nums">{row.note}</span>
        </div>
      ))}
    </div>
  );
}
