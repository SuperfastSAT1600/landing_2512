// KST(UTC+9) 기준 날짜·시각 변환 헬퍼.
// CRM 집계는 모두 한국 달력 기준이며, DB에는 Z가 붙은 인스턴트와 naive 벽시계 문자열이
// 섞여 있다(시트 동기화 유산). naive는 KST 벽시계로 간주한다.

/** ISO/naive 문자열 → KST 달력 날짜(YYYY-MM-DD). 판정 불가면 null. */
export function toKstDay(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const hasZone = /[zZ]$/.test(ts) || /[+-]\d{2}:?\d{2}$/.test(ts);
  if (!hasZone) return ts.slice(0, 10); // naive = KST 벽시계
  const ms = new Date(ts).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 비교용 절대시각(ms). naive는 KST 벽시계로 해석. 판정 불가면 null. */
export function toMs(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const hasZone = /[zZ]$/.test(ts) || /[+-]\d{2}:?\d{2}$/.test(ts);
  if (hasZone) {
    const ms = new Date(ts).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const [d, t = '00:00:00'] = ts.replace(' ', 'T').split('T');
  const [Y, Mo, D] = d.split('-').map(Number);
  const [H = 0, Mi = 0, Se = 0] = t.split(':').map(Number);
  if (!Y || !Mo || !D) return null;
  return Date.UTC(Y, Mo - 1, D, H, Mi, Se) - 9 * 3600 * 1000; // KST 벽시계 → UTC instant
}
