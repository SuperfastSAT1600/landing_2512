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
  /** 화면 표기용 이름 — 전체 / B2C / B2B */
  label: string;
  igLeads: number;
  otherLeads: number;
  overview: ReportOverview;
}

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

/** 소수점 뒤 불필요한 0을 없앤 퍼센트 표기(47.06 → "47.06%", 50 → "50%"). */
function pct(rate: number): string {
  return `${Number(rate.toFixed(2))}%`;
}

/** 슬랙 메시지 본문. 이모지·해설 없이 라벨과 수치만. */
export function formatBusinessReport(week: WeekDef, segments: ReportSegment[]): string {
  const lines: string[] = [
    `*비즈니스 현황 · ${week.label}*`,
    `${week.start} ~ ${week.end} · 금액 단위: 만원`,
  ];

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

  return lines.join('\n');
}
