/**
 * 주간 비즈니스 현황 슬랙 리포트 — 순수 함수 모음.
 * cron 라우트(/api/cron/weekly-business-report)가 stats API 결과를 넣어 메시지를 만든다.
 * Slack·Supabase 의존성 없음.
 */
import { getWeekDef, weekByOffset, type WeekDef } from '@/lib/week-definitions';

/** 리포트에 필요한 stats overview 필드(전체 응답의 부분집합). */
export interface ReportOverview {
  total_leads: number;
  contacted: number;
  contact_rate: number;
  paid: number;
  conversion_rate: number;
  gross_revenue: number;
  total_refund: number;
  total_revenue: number;
  total_net_revenue: number;
  first_payment_revenue: number;
  repayment_revenue: number;
  gross_count: number;
  refund_count: number;
  first_payment_count: number;
  repayment_count: number;
}

export interface ReportSegment {
  /** 화면 표기용 이름 — 한국비즈니스 / B2C / B2B */
  label: string;
  igLeads: number;
  otherLeads: number;
  overview: ReportOverview;
}

/** 글로벌(USD) 매출 원본 — global_sales 테이블 행의 부분집합. */
export interface GlobalSaleEntryLike {
  amount_usd: number;
  payment_type: '최초결제' | '재결제';
  sale_date: string; // YYYY-MM-DD
}

export interface GlobalReportSummary {
  totalUsd: number;
  totalCount: number;
  firstUsd: number;
  firstCount: number;
  repeatUsd: number;
  repeatCount: number;
}

/** Business 페이지와 동일한 고정 환율 — 전체(한국비즈니스+글로벌) 합산에 쓴다. */
export const REPORT_USD_TO_KRW_RATE = 1400;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 주어진 순간의 KST 날짜(YYYY-MM-DD). */
function kstDate(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 직전에 완결된 주차(월~일).
 * 월요일 04:00 KST 실행이 정상 경로지만, 크론 지연·재시도·수동 실행으로 다른 요일에 돌아도
 * '아직 진행 중인 주'를 리포트하지 않도록 주차 종료일이 오늘보다 이전인 주차를 반환한다.
 * WEEK_DEFINITIONS 범위 밖이면 null(표 갱신이 필요한 상태).
 */
export function lastCompletedWeek(now: Date): WeekDef | null {
  const today = kstDate(now);
  const yesterdayWeek = getWeekDef(kstDate(new Date(now.getTime() - DAY_MS)));
  if (!yesterdayWeek) return null;
  // 어제가 속한 주가 이미 끝났으면 그 주, 아직 진행 중이면 한 주 앞.
  if (yesterdayWeek.end < today) return yesterdayWeek;
  return weekByOffset(yesterdayWeek.start, -1);
}

/** by_source 행을 인스타 리드 / 그 외 리드로 나눈다(향후 변형 라벨 대비 부분일치). */
export function splitLeadsBySource(
  bySource: { source: string; leads: number }[],
): { ig: number; other: number } {
  let ig = 0;
  let other = 0;
  for (const row of bySource) {
    if (row.source.includes('인스타')) ig += row.leads;
    else other += row.leads;
  }
  return { ig, other };
}

/** 원 → 만원 반올림 + 천단위 구분. 음수는 부호를 유지한다. */
function man(won: number): string {
  return Math.round(won / 10000).toLocaleString('ko-KR');
}

/** 달러 반올림 + 천단위 구분. */
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** 주간 글로벌 매출 원본(전체 이력)을 주차 범위로 걸러 집계한다. */
export function summarizeGlobalSales(entries: GlobalSaleEntryLike[], week: WeekDef): GlobalReportSummary {
  const inWeek = entries.filter((e) => e.sale_date >= week.start && e.sale_date <= week.end);
  const first = inWeek.filter((e) => e.payment_type === '최초결제');
  const repeat = inWeek.filter((e) => e.payment_type === '재결제');
  const sum = (list: GlobalSaleEntryLike[]) => list.reduce((s, e) => s + e.amount_usd, 0);
  return {
    totalUsd: sum(inWeek),
    totalCount: inWeek.length,
    firstUsd: sum(first),
    firstCount: first.length,
    repeatUsd: sum(repeat),
    repeatCount: repeat.length,
  };
}

/** 소수점 뒤 불필요한 0을 없앤 퍼센트 표기(47.06 → "47.06%", 50 → "50%"). */
function pct(rate: number): string {
  return `${Number(rate.toFixed(2))}%`;
}

/**
 * 슬랙 메시지 본문. 이모지·해설 없이 라벨과 수치만.
 * Business 페이지 탭 위계(전체=한국비즈니스+글로벌 합산 / 한국비즈니스(B2C·B2B) / 글로벌)를 그대로 따른다.
 * `segments[0]`은 반드시 한국비즈니스 전체(B2C+B2B 합산, segment=all) 여야 "전체" 합산 계산이 맞는다.
 * 글로벌은 리드·컨택 개념이 없어 "전체"에도 매출 지표만 합치고 퍼널은 한국비즈니스에서만 보여준다.
 */
export function formatBusinessReport(
  week: WeekDef,
  segments: ReportSegment[],
  global: GlobalReportSummary,
): string {
  const lines: string[] = [
    `*비즈니스 현황 · ${week.label}*`,
    `${week.start} ~ ${week.end} · 금액 단위: 만원`,
  ];

  const tutoring = segments[0]?.overview;
  if (tutoring) {
    const globalKrw = global.totalUsd * REPORT_USD_TO_KRW_RATE;
    const grossTotal = tutoring.gross_revenue + globalKrw;
    const netTotal = tutoring.total_revenue + globalKrw;
    const netProfitTotal = tutoring.total_net_revenue + globalKrw;
    const tutoringShare = grossTotal > 0 ? Math.round((tutoring.gross_revenue / grossTotal) * 100) : 0;
    const globalShare = grossTotal > 0 ? 100 - tutoringShare : 0;
    lines.push(
      '',
      '*전체*',
      `총매출 ${man(grossTotal)} · 순매출 ${man(netTotal)} · 순수익 ${man(netProfitTotal)}`,
      `한국비즈니스 ${tutoringShare}% · 글로벌 ${globalShare}% (글로벌은 1$=${REPORT_USD_TO_KRW_RATE.toLocaleString()}원 환산)`,
    );
  }

  for (const seg of segments) {
    const o = seg.overview;
    lines.push(
      '',
      `*${seg.label}*`,
      `리드 ${o.total_leads} → 컨택 ${o.contacted} (${pct(o.contact_rate)}) → 결제 ${o.paid}명 (${pct(o.conversion_rate)})`,
      `리드 구성: 인스타 ${seg.igLeads} · 그 외 ${seg.otherLeads}`,
      `총매출 ${man(o.gross_revenue)} (${o.gross_count}건) · 환불 ${man(o.total_refund)} (${o.refund_count}건)`,
      `순매출 ${man(o.total_revenue)} · 순수익 ${man(o.total_net_revenue)}`,
      `최초결제 ${man(o.first_payment_revenue)} (${o.first_payment_count}건) · 재결제 ${man(o.repayment_revenue)} (${o.repayment_count}건)`,
    );
  }

  lines.push(
    '',
    '*글로벌*',
    `총매출 ${usd(global.totalUsd)} (${global.totalCount}건)`,
    `최초결제 ${usd(global.firstUsd)} (${global.firstCount}건) · 재결제 ${usd(global.repeatUsd)} (${global.repeatCount}건)`,
  );

  return lines.join('\n');
}
