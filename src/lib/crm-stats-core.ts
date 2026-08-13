import { hasReachedStage } from '@/lib/funnel-stats';

// CRM 통계 집계 공용 코어. stats/route.ts 에서 추출 —
// B2B stats·세일즈 로직 통계가 동일한 컨택/전환율/월키/문의시각 계산을 공유한다.

// 리드 조회 행 상한 — Supabase 기본 1000행 무음 절단을 넘기 위한 명시 상한(넉넉한 헤드룸).
export const MAX_LEAD_ROWS = 5000;

export function isContacted(student: {
  funnel_stage: string;
  stage_history?: { stage: string; label: string; entered_at: string }[] | null;
}): boolean {
  // 컨택 성공 = 이력상(또는 현재) 세일즈 콜 예약(2단계) 이상에 도달한 적이 있음.
  // 현재 단계가 아니라 도달 이력 기준 → 첫 메시지만 보내고 이탈한 리드는 제외,
  // 2단계 이상 갔다가 이탈한 리드는 포함.
  return hasReachedStage(student, '2');
}

// 센터형 파트너(예: 공부하는 아이들) 기본 목록 — 소속 학생을 컨택 성공으로 간주한다.
export const CONTACT_IMPLIED_PARTNERS = new Set(['공부하는 아이들']);

/**
 * 컨택 성공 판정 + 센터형 파트너 예외.
 * partnerName이 impliedPartners에 있으면 퍼널 단계와 무관하게 컨택 성공으로 본다
 * (해당 파트너 학생은 세일즈 퍼널을 거치지 않고 바로 등록되므로). 그 외에는 isContacted 그대로.
 */
export function isContactedWithImpliedPartner(
  student: { funnel_stage: string; stage_history?: { stage: string; label: string; entered_at: string }[] | null },
  partnerName: string | null | undefined,
  impliedPartners: Set<string> = CONTACT_IMPLIED_PARTNERS,
): boolean {
  if (partnerName && impliedPartners.has(partnerName)) return true;
  return isContacted(student);
}

export function contactRate(contacted: number, leads: number): number {
  if (leads === 0) return 0;
  return Math.round((contacted / leads) * 10000) / 100;
}

export function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-05"
}

/** "YYYY-MM"에 n개월 더한 월 키 반환. */
function addMonthKey(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/**
 * 월별 시계열의 내부 누락 월을 0값으로 채워 연속 배열로 만든다.
 * rows는 `month:"YYYY-MM"`를 가진 배열(정렬 여부 무관). 최소~최대 월 사이만 채우고
 * 리딩/트레일링 빈 달은 만들지 않는다. 빈 배열/단일 원소는 그대로 반환.
 */
export function fillMonthlyGaps<T extends { month: string }>(
  rows: T[],
  make: (month: string) => T,
): T[] {
  if (rows.length < 2) return [...rows].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const months = rows.map((r) => r.month).sort((a, b) => a.localeCompare(b));
  const first = months[0];
  const last = months[months.length - 1];
  const out: T[] = [];
  for (let cur = first; cur <= last; cur = addMonthKey(cur, 1)) {
    out.push(byMonth.get(cur) ?? make(cur));
  }
  return out;
}

// ─── Segment filter for B2C/B2B stats ─────────────────────────────────────────

export type CrmStatsSegment = 'all' | 'b2c' | 'b2b';

export function parseStatsSegment(v: string | null): CrmStatsSegment {
  if (v === 'b2c' || v === 'b2b') return v;
  return 'all';
}

export function isCrmStatsSegment(v: string): v is CrmStatsSegment {
  return v === 'all' || v === 'b2c' || v === 'b2b';
}

/**
 * payments의 `students:student_id(company_id)` 임베드 형태.
 * PostgREST는 many-to-one 임베드를 단일 객체로 반환하지만, 관계 추론에 따라 배열로 올 수도 있어 둘 다 받는다.
 */
export type RelatedCompanyRef =
  | { company_id: string | null }
  | { company_id: string | null }[]
  | null
  | undefined;

/** 임베드된 학생 관계에서 company_id를 꺼낸다. 관계가 없으면 null. */
export function relatedCompanyId(related: RelatedCompanyRef): string | null {
  if (!related) return null;
  const row = Array.isArray(related) ? related[0] : related;
  return row?.company_id ?? null;
}

/**
 * segment에 따라 결제 1건의 포함 여부를 판정한다.
 * payments 테이블에는 company_id가 없으므로 임베드된 학생 관계의 company_id로 분류한다.
 * 학생 레코드가 없는 결제(관계 null)는 B2C로 본다 — b2c/b2b가 전체를 겹침 없이 나눈다.
 */
export function paymentMatchesSegment(
  payment: { students?: RelatedCompanyRef },
  segment: CrmStatsSegment,
): boolean {
  if (segment === 'all') return true;
  const companyId = relatedCompanyId(payment.students);
  return segment === 'b2b' ? companyId != null : companyId == null;
}

/**
 * 첫 응답 시간 계산의 기준 문의시각(ms).
 * inquiry_date는 naive(KST 벽시계)로 저장되므로 KST(+09:00) instant로 해석한다.
 * inquiry_date가 없으면 created_at(UTC timestamptz)로 폴백.
 */
export function inquiryRefMs(inquiry_date: string | null, created_at: string): number | null {
  if (inquiry_date) {
    const [d, t = '00:00:00'] = inquiry_date.replace(' ', 'T').split('T');
    const [Y, Mo, D] = d.split('-').map(Number);
    const [H = 0, Mi = 0, Se = 0] = t.split(':').map(Number);
    if (!Y || !Mo || !D) return null;
    // KST 벽시계 → UTC instant (= UTC 동일 시각 − 9h)
    return Date.UTC(Y, Mo - 1, D, H, Mi, Se) - 9 * 3600 * 1000;
  }
  const t = new Date(created_at).getTime();
  return Number.isFinite(t) ? t : null;
}
