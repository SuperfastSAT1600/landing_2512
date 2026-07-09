import type { FunnelStage } from '@/types/crm';

export const SALES_STAGES_ONLY: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];

// 알려진 SAT 시험일 마스터 목록(과거+미래). 라벨 조회는 이 전체 목록을 기준으로 하고,
// 목표 시험일 드롭다운 옵션은 getSatTestDates()로 현재 날짜 이후만 노출한다.
const SAT_TEST_DATES_MASTER: { group: string; dates: { value: string; label: string }[] }[] = [
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

export const SAT_DATE_ALL = SAT_TEST_DATES_MASTER.flatMap(g => g.dates);

// 로컬 타임존 기준 YYYY-MM-DD 문자열 (Date의 UTC 변환 이슈 회피)
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 1·2차 목표 시험일 드롭다운: 오늘(포함) 이후 시험일만, 빈 시즌 그룹은 제거.
export function getSatTestDates(
  now: Date = new Date(),
): { group: string; dates: { value: string; label: string }[] }[] {
  const today = toLocalYmd(now);
  return SAT_TEST_DATES_MASTER
    .map(g => ({ group: g.group, dates: g.dates.filter(d => d.value >= today) }))
    .filter(g => g.dates.length > 0);
}

export function formatSatDate(value: string | null | undefined): string {
  if (!value) return '미정';
  const found = SAT_DATE_ALL.find(d => d.value === value);
  return found ? found.label : value;
}

// SAT 시행 월 패턴(3·5·6·8·10·11·12월) 및 과거 목록 시작 연도.
const SAT_MONTHS = [3, 5, 6, 8, 10, 11, 12];
const SAT_PAST_START_YEAR = 2023;

// 응시함(직전 응시) 드롭다운: 현재 날짜 기준 이미 진행된 시행 월을 YYYY-MM으로 최신순 반환.
export function getSatPastMonths(now: Date = new Date()): { value: string; label: string }[] {
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const out: { value: string; label: string }[] = [];
  for (let year = SAT_PAST_START_YEAR; year <= curYear; year++) {
    for (const month of SAT_MONTHS) {
      if (year < curYear || month <= curMonth) {
        out.push({ value: `${year}-${String(month).padStart(2, '0')}`, label: `${year}년 ${month}월` });
      }
    }
  }
  return out.reverse(); // 최신이 위로
}

// 응시함 저장 값(YYYY-MM) 표시용. 과거/범위 밖 값도 안전하게 포맷.
export function formatSatMonth(value: string | null | undefined): string {
  if (!value) return '(미상)';
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[1]}년 ${Number(m[2])}월`;
}
