// 두 기간 지표 비교 — 순수 함수, I/O 없음.
import type { CrmStatsData } from './crm-stats-service';

export interface ComparisonRow {
  key: string;
  label: string;
  a: number;
  b: number;
  /** 절대 증감 (a − b) */
  abs: number;
  /** 증감률 % (b=0이면 null) */
  pct: number | null;
  format: 'count' | 'rate' | 'won';
}

export function calcDiff(a: number, b: number): { abs: number; pct: number | null } {
  const abs = a - b;
  const pct = b !== 0 ? Math.round((abs / Math.abs(b)) * 1000) / 10 : null;
  return { abs, pct };
}

export function buildComparisonRows(
  a: CrmStatsData,
  b: CrmStatsData,
  renewalRateA: number | null,
  renewalRateB: number | null,
): ComparisonRow[] {
  const row = (
    key: string,
    label: string,
    aVal: number,
    bVal: number,
    format: ComparisonRow['format'],
  ): ComparisonRow => ({ key, label, a: aVal, b: bVal, ...calcDiff(aVal, bVal), format });

  return [
    row('leads', '신규 리드', a.overview.total_leads, b.overview.total_leads, 'count'),
    row('contact_rate', '컨택 성공률', a.overview.contact_rate, b.overview.contact_rate, 'rate'),
    row('conversion_rate', '최초결제 전환율', a.overview.conversion_rate, b.overview.conversion_rate, 'rate'),
    row(
      'renewal_rate',
      '재결제 전환율',
      renewalRateA ?? 0,
      renewalRateB ?? 0,
      'rate',
    ),
    row('gross_revenue', '총 매출', a.overview.gross_revenue, b.overview.gross_revenue, 'won'),
    row('refund', '환불', Math.abs(a.overview.total_refund), Math.abs(b.overview.total_refund), 'won'),
    row('net_revenue', '순매출', a.overview.total_revenue, b.overview.total_revenue, 'won'),
    row('net_profit', '순 수익', a.overview.total_net_revenue, b.overview.total_net_revenue, 'won'),
  ];
}
