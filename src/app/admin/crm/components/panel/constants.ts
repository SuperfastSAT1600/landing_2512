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

/** 로컬 기준 오늘 'YYYY-MM-DD'. SAT 날짜 값(YYYY-MM-DD 문자열)과 사전식 비교에 사용. */
function ymd(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 오늘(당일 포함) 이후의 SAT 시험일만 그룹으로. 지난 시험일은 목표 후보에서 제외(실시간). 빈 그룹 드롭. */
export function futureSatTestDates(now: Date = new Date()): typeof SAT_TEST_DATES {
  const today = ymd(now);
  return SAT_TEST_DATES
    .map(g => ({ group: g.group, dates: g.dates.filter(d => d.value >= today) }))
    .filter(g => g.dates.length > 0);
}

/**
 * 목표 시험일 드롭다운 그룹. futureSatTestDates + 이미 저장된 값이 과거라 목록에 없으면
 * '선택된 시험일' 그룹으로 앞에 추가해 선택이 사라지지 않게 한다.
 */
export function targetSatDateGroups(
  selected: string | null | undefined,
  now: Date = new Date()
): typeof SAT_TEST_DATES {
  const groups = futureSatTestDates(now);
  if (selected && !groups.some(g => g.dates.some(d => d.value === selected))) {
    return [{ group: '선택된 시험일', dates: [{ value: selected, label: formatSatDate(selected) }] }, ...groups];
  }
  return groups;
}

// SAT 국제 시험이 열리는 월(3·5·6·8·10·11·12월) — 과거 응시 월 옵션 생성용.
const SAT_MONTHS = [3, 5, 6, 8, 10, 11, 12];

/**
 * 오늘 기준 과거 SAT 응시 월 옵션(YYYY-MM), 최신월 우선. 기본 4년치.
 * 현재 월까지 포함(<= 오늘의 월)이라 7월엔 직전 6월 시험이 바로 잡힌다.
 * 하드코딩 리스트(stale) 대신 실시간 생성.
 */
export function pastSatMonths(now: Date = new Date(), years = 4): { value: string; label: string }[] {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-indexed
  const monthsDesc = [...SAT_MONTHS].sort((a, b) => b - a);
  const out: { value: string; label: string }[] = [];
  for (let yy = y; yy >= y - years; yy--) {
    for (const mm of monthsDesc) {
      if (yy === y && mm > m) continue; // 현재 연도의 미래 월 제외
      out.push({ value: `${yy}-${String(mm).padStart(2, '0')}`, label: `${yy}년 ${mm}월` });
    }
  }
  return out;
}

/** 'YYYY-MM' → 'YYYY년 M월'. 저장된 응시 월 표시용(옵션 목록 조회 없이 견고하게). */
export function formatPastMonth(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? `${m[1]}년 ${Number(m[2])}월` : value;
}
