/**
 * "2025년 진단테스트를 본 학생이 결제까지 갔는가" 집계.
 *
 * 전환 판정은 src/lib/crm-stats-service.ts 의 코호트 정의를 그대로 따른다:
 *   payment_type='최초결제' AND amount >= 0 을 '언제든' 한 건이라도 냈는가.
 *   (0원 가결제·₩1 placeholder 포함, 환불·재결제 제외. student_id 우선, 없으면 이름 대조)
 * 정의를 새로 만들면 CRM 대시보드 숫자와 어긋나서 비교가 불가능해진다.
 *
 * 매칭 키가 이름뿐이라 미매칭이 남는 것이 정상이다. 그래서 전환율을 한 숫자로 내지 않고
 * 매칭분 기준(상한)과 전체 응시자 기준(하한) 두 개로 낸다.
 */
import { normalizeName } from './legacy-diagnostic-match';

export interface AttemptForStats {
  record_id: string;
  student_id: string | null;
  student_name: string;
  score: number | null;
  taken_at: string | null;
  is_internal: boolean;
  /** 채점이 저장되지 않은 응시(점수 사용 불가). 호출부가 isUnscoredLegacy 로 판정해 넘긴다. */
  unscored?: boolean;
}

export interface PaymentRow {
  student_id: string | null;
  student_name: string | null;
  paid_at: string | null;
  amount: number;
  payment_type: string | null;
}

export interface LeadRow {
  id: string;
  name: string;
  inquiry_date: string | null;
}

export interface FirstPaymentIndex {
  byId: Map<string, string>;
  byName: Map<string, string>;
}

export type ScoreBand = '~900' | '900-1099' | '1100-1299' | '1300+' | '미상';

export interface ScoreBandStat {
  band: ScoreBand;
  attempts: number;
  converted: number;
  rate: number;
}

export interface ConversionReport {
  totalAttempts: number;
  matched: number;
  unmatched: number;
  matchRate: number;
  converted: number;
  /** 매칭된 응시자 기준 — 상한 */
  conversionRateMatched: number;
  /** 전체 응시자 기준(미매칭은 전부 미전환으로 간주) — 하한 */
  conversionRateAll: number;
  byScoreBand: ScoreBandStat[];
  daysToPayment: { n: number; median: number | null; mean: number | null };
  baseline: { leads: number; converted: number; rate: number };
}

const DAY_MS = 86_400_000;

function isConversion(p: PaymentRow): boolean {
  return p.payment_type === '최초결제' && p.amount >= 0;
}

function keepEarliest(map: Map<string, string>, key: string, paidAt: string | null): void {
  if (!paidAt) {
    if (!map.has(key)) map.set(key, '');
    return;
  }
  const cur = map.get(key);
  if (!cur || paidAt < cur) map.set(key, paidAt);
}

export function buildFirstPaymentIndex(payments: PaymentRow[]): FirstPaymentIndex {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of payments) {
    if (!isConversion(p)) continue;
    if (p.student_id) keepEarliest(byId, p.student_id, p.paid_at);
    if (p.student_name) keepEarliest(byName, p.student_name.trim(), p.paid_at);
  }
  return { byId, byName };
}

function firstPaidAt(
  idx: FirstPaymentIndex,
  studentId: string | null,
  name: string
): string | null {
  const byId = studentId ? idx.byId.get(studentId) : undefined;
  const byName = idx.byName.get(name.trim());
  const found = [byId, byName].filter((v): v is string => v !== undefined && v !== '');
  if (found.length) return found.sort()[0];
  return byId === '' || byName === '' ? '' : null;
}

function isPaid(idx: FirstPaymentIndex, studentId: string | null, name: string): boolean {
  return firstPaidAt(idx, studentId, name) !== null;
}

/** 내부 제출을 빼고 학생당 최초 응시 1건만 남긴다. 재응시를 각각 세면 전환율 분모가 부푼다. */
export function foldFirstAttempts(attempts: AttemptForStats[]): AttemptForStats[] {
  const first = new Map<string, AttemptForStats>();
  for (const a of attempts) {
    if (a.is_internal) continue;
    const key = a.student_id ?? `name:${normalizeName(a.student_name)}`;
    const cur = first.get(key);
    if (!cur) {
      first.set(key, a);
      continue;
    }
    const curAt = cur.taken_at ?? '9999';
    const newAt = a.taken_at ?? '9999';
    if (newAt < curAt) first.set(key, a);
  }
  return [...first.values()];
}

export function scoreBand(score: number | null): ScoreBand {
  if (score === null || Number.isNaN(score)) return '미상';
  if (score < 900) return '~900';
  if (score < 1100) return '900-1099';
  if (score < 1300) return '1100-1299';
  return '1300+';
}

const BANDS: ScoreBand[] = ['~900', '900-1099', '1100-1299', '1300+', '미상'];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

export function computeLegacyConversion(
  attempts: AttemptForStats[],
  payments: PaymentRow[],
  leads: LeadRow[],
  period: { from: string; to: string }
): ConversionReport {
  const idx = buildFirstPaymentIndex(payments);
  const folded = foldFirstAttempts(attempts);

  const matchedAttempts = folded.filter((a) => a.student_id);
  const convertedAttempts = matchedAttempts.filter((a) =>
    isPaid(idx, a.student_id, a.student_name)
  );

  const gaps: number[] = [];
  for (const a of convertedAttempts) {
    const paidAt = firstPaidAt(idx, a.student_id, a.student_name);
    if (!paidAt || !a.taken_at) continue;
    const diff = Date.parse(paidAt) - Date.parse(a.taken_at);
    if (!Number.isNaN(diff)) gaps.push(Math.round(diff / DAY_MS));
  }

  // 채점이 저장되지 않은 응시(400/200/200)는 점수대별 집계에서 '미상'으로 내린다 —
  // 그대로 두면 105건이 전부 최저 구간에 몰려 점수대별 전환율이 통째로 왜곡된다.
  const bandOf = (a: AttemptForStats) => (a.unscored ? '미상' : scoreBand(a.score));
  const byScoreBand = BANDS.map((band) => {
    const inBand = matchedAttempts.filter((a) => bandOf(a) === band);
    const conv = inBand.filter((a) => isPaid(idx, a.student_id, a.student_name)).length;
    return { band, attempts: inBand.length, converted: conv, rate: ratio(conv, inBand.length) };
  }).filter((b) => b.attempts > 0);

  const cohort = leads.filter(
    (l) =>
      l.inquiry_date &&
      l.inquiry_date.slice(0, 10) >= period.from &&
      l.inquiry_date.slice(0, 10) <= period.to
  );
  const cohortConverted = cohort.filter((l) => isPaid(idx, l.id, l.name)).length;

  return {
    totalAttempts: folded.length,
    matched: matchedAttempts.length,
    unmatched: folded.length - matchedAttempts.length,
    matchRate: ratio(matchedAttempts.length, folded.length),
    converted: convertedAttempts.length,
    conversionRateMatched: ratio(convertedAttempts.length, matchedAttempts.length),
    conversionRateAll: ratio(convertedAttempts.length, folded.length),
    byScoreBand,
    daysToPayment: {
      n: gaps.length,
      median: median(gaps),
      mean: gaps.length
        ? Math.round((gaps.reduce((s, v) => s + v, 0) / gaps.length) * 10) / 10
        : null,
    },
    baseline: {
      leads: cohort.length,
      converted: cohortConverted,
      rate: ratio(cohortConverted, cohort.length),
    },
  };
}
