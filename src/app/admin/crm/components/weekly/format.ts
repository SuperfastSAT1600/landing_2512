import {
  WEEKLY_PLAN_CURRENCY_METRICS,
  type StrategyHistoryType,
  type WeeklyPlanMetricKey,
} from '@/types/crm';

export const STRATEGY_TYPE_LABELS: Record<StrategyHistoryType, string> = {
  initial_contact: '최초 컨텍',
  initial_sales: '최초 세일즈',
  retry: '재시도',
};

/** 원화 → 만원 단위 축약. 0은 '0'. */
export const manwon = (n: number) => (n === 0 ? '0' : `${Math.round(n / 10000).toLocaleString()}만`);

export const isCurrencyMetric = (k: WeeklyPlanMetricKey) => WEEKLY_PLAN_CURRENCY_METRICS.includes(k);

export const formatMetric = (k: WeeklyPlanMetricKey, n: number) =>
  isCurrencyMetric(k) ? manwon(n) : n.toLocaleString();

/** ISO/naive → 'MM/DD' (KST 표기). */
export const shortDay = (ts: string) => {
  const day = ts.slice(0, 10);
  const [, m, d] = day.split('-');
  return m && d ? `${m}/${d}` : day;
};
