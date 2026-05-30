import type { FunnelStage } from '@/types/crm';

export const SALES_STAGES_ONLY: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];

export const SAT_TEST_DATES: { group: string; dates: { value: string; label: string }[] }[] = [
  {
    group: '2025–26 시즌',
    dates: [
      { value: '2026-06-06', label: '2026년 6월 6일 (토)' },
    ],
  },
  {
    group: '2026–27 시즌',
    dates: [
      { value: '2026-08-22', label: '2026년 8월 22일 (토)' },
      { value: '2026-09-12', label: '2026년 9월 12일 (토)' },
      { value: '2026-10-03', label: '2026년 10월 3일 (토)' },
      { value: '2026-11-07', label: '2026년 11월 7일 (토)' },
      { value: '2026-12-05', label: '2026년 12월 5일 (토)' },
      { value: '2027-03-06', label: '2027년 3월 6일 (토)' },
      { value: '2027-05-01', label: '2027년 5월 1일 (토)' },
      { value: '2027-06-05', label: '2027년 6월 5일 (토)' },
    ],
  },
  {
    group: '2027–28 시즌',
    dates: [
      { value: '2027-08-28', label: '2027년 8월 28일 (토)' },
      { value: '2027-09-18', label: '2027년 9월 18일 (토)' },
      { value: '2027-10-02', label: '2027년 10월 2일 (토)' },
      { value: '2027-11-06', label: '2027년 11월 6일 (토)' },
      { value: '2027-12-04', label: '2027년 12월 4일 (토)' },
      { value: '2028-03-04', label: '2028년 3월 4일 (토)' },
      { value: '2028-05-06', label: '2028년 5월 6일 (토)' },
      { value: '2028-06-03', label: '2028년 6월 3일 (토)' },
    ],
  },
];

export const SAT_DATE_ALL = SAT_TEST_DATES.flatMap(g => g.dates);

export function formatSatDate(value: string | null | undefined): string {
  if (!value) return '미정';
  const found = SAT_DATE_ALL.find(d => d.value === value);
  return found ? found.label : value;
}

export const SAT_PAST_MONTHS: { value: string; label: string }[] = [
  { value: '2026-05', label: '2026년 5월' },
  { value: '2026-03', label: '2026년 3월' },
  { value: '2025-12', label: '2025년 12월' },
  { value: '2025-11', label: '2025년 11월' },
  { value: '2025-10', label: '2025년 10월' },
  { value: '2025-08', label: '2025년 8월' },
  { value: '2025-06', label: '2025년 6월' },
  { value: '2025-05', label: '2025년 5월' },
  { value: '2025-03', label: '2025년 3월' },
  { value: '2024-12', label: '2024년 12월' },
  { value: '2024-11', label: '2024년 11월' },
  { value: '2024-10', label: '2024년 10월' },
  { value: '2024-08', label: '2024년 8월' },
  { value: '2024-06', label: '2024년 6월' },
  { value: '2024-05', label: '2024년 5월' },
  { value: '2024-03', label: '2024년 3월' },
  { value: '2023-12', label: '2023년 12월' },
  { value: '2023-11', label: '2023년 11월' },
  { value: '2023-10', label: '2023년 10월' },
  { value: '2023-08', label: '2023년 8월' },
  { value: '2023-06', label: '2023년 6월' },
  { value: '2023-05', label: '2023년 5월' },
  { value: '2023-03', label: '2023년 3월' },
];
