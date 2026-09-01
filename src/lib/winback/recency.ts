/**
 * 이탈 경과일 계산 — prefilter·score·profile이 같은 기준을 쓰도록 한 곳에 모았다.
 *
 * ⚠️ `updated_at`을 이탈 시점 proxy로 쓰면 안 된다. 2026-08-11 08:22 일괄 백필로
 *    이탈풀 1,261명 중 1,224명이 같은 시각을 갖고 있어(30~180일 구간 0명) 경과일이
 *    전원 한 자릿수로 붕괴한다. 그래서 `inactive_at`(마이그레이션 116)을 먼저 보고,
 *    아직 채워지지 않은 행만 `updated_at`으로 폴백한다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChurnTimeRow {
  inactive_at?: string | null;
  updated_at: string;
}

export function churnedDaysOf(row: ChurnTimeRow, now: number): number {
  const base = row.inactive_at ?? row.updated_at;
  return (now - new Date(base).getTime()) / DAY_MS;
}
