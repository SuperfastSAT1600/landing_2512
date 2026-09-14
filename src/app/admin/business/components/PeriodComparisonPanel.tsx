'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ComparisonRow } from '@/lib/business-comparison';

function fmt(value: number, format: ComparisonRow['format']): string {
  if (format === 'count') return value.toLocaleString();
  if (format === 'rate') return `${value}%`;
  // won
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만원`;
  return `${value.toLocaleString()}원`;
}

function DiffBadge({ row, invertColor = false }: { row: ComparisonRow; invertColor?: boolean }) {
  const { abs, pct, format } = row;
  if (abs === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
        <Minus size={10} /> 변동 없음
      </span>
    );
  }

  // 환불은 증가가 나쁜 것이므로 색 반전
  const positive = invertColor ? abs < 0 : abs > 0;
  const colorClass = positive ? 'text-emerald-600' : 'text-red-500';
  const Icon = abs > 0 ? TrendingUp : TrendingDown;
  const sign = abs > 0 ? '+' : '';
  const absStr = format === 'rate' ? `${sign}${abs.toFixed(1)}%p` : `${sign}${fmt(abs, format)}`;
  const pctStr = pct !== null ? ` (${abs > 0 ? '+' : ''}${pct}%)` : '';

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${colorClass}`}>
      <Icon size={10} />
      {absStr}{pctStr}
    </span>
  );
}

export default function PeriodComparisonPanel({
  rows,
  labelA,
  labelB,
}: {
  rows: ComparisonRow[];
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 pb-1 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-400">지표</span>
        <span className="text-xs font-medium text-blue-600 text-right min-w-[80px]">A · {labelA}</span>
        <span className="text-xs font-medium text-gray-500 text-right min-w-[80px]">B · {labelB}</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-start px-3 py-2 rounded-lg hover:bg-gray-50/60 transition-colors"
        >
          {/* 지표명 + 증감 */}
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">{row.label}</p>
            <div className="mt-0.5">
              <DiffBadge row={row} invertColor={row.key === 'refund'} />
            </div>
          </div>

          {/* A 값 */}
          <div className="text-right min-w-[80px]">
            <span className="text-sm font-semibold text-blue-700 tabular-nums">
              {fmt(row.a, row.format)}
            </span>
          </div>

          {/* B 값 */}
          <div className="text-right min-w-[80px]">
            <span className="text-sm font-medium text-gray-500 tabular-nums">
              {fmt(row.b, row.format)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
