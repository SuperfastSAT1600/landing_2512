/**
 * CRM 통계 — 채널·월·주·단계 흐름 구간의 순수 계산부.
 * crm-stats-service 의 computeCrmStats 에서 분리했다. DB 접근 없음.
 */
import { netAmount } from '@/lib/payment-utils';
import { getWeekLabel } from '@/lib/week-definitions';
import { computeStageFlow, type StageFlowRow } from '@/lib/funnel-stats';
import { contactRate, fillMonthlyGaps, inquiryRefMs, toMonthKey } from '@/lib/crm-stats-core';
import {
  isInitialLead,
  type ContactedChecker,
  type PaidChecker,
  type StatsLead,
  type StatsPayment,
} from '@/lib/crm-stats-totals';
import type { StatsBySource, StatsMonthly, StatsWeekly } from '@/lib/crm-stats-types';

interface SourceAcc {
  leads: number;
  contacted: number;
  paid: number;
  revenue: number;
  net_revenue: number;
  respSum: number;
  respCount: number;
}

/** 리드 1건이 첫 메시지까지 걸린 시간(초). 계산할 수 없거나 음수면 null. */
function firstResponseSeconds(s: StatsLead): number | null {
  // 첫 응답 시간: 첫 메시지 발송 시각이 있는 리드만, 문의시각(inquiry_date, 없으면 created_at) 대비 경과 초.
  const sentAt = s.first_message_sent_at;
  if (!sentAt) return null;
  const refMs = inquiryRefMs(s.inquiry_date, s.created_at);
  const sentMs = new Date(sentAt).getTime();
  if (refMs == null || !Number.isFinite(sentMs)) return null;
  const delta = (sentMs - refMs) / 1000;
  return delta >= 0 ? delta : null;
}

/** 유입 채널별 리드·컨택·결제·매출 집계 (리드 수 내림차순). */
export function computeBySource(
  leadList: StatsLead[],
  paymentList: StatsPayment[],
  isPaid: PaidChecker,
  isContactedLead: ContactedChecker
): StatsBySource[] {
  const sourceMap = new Map<string, SourceAcc>();

  for (const s of leadList) {
    const src = s.traffic_source ?? '미입력';
    if (!sourceMap.has(src))
      sourceMap.set(src, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0, respSum: 0, respCount: 0 });
    const entry = sourceMap.get(src)!;
    entry.leads++;
    if (isInitialLead(s) && isContactedLead(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
    const delta = firstResponseSeconds(s);
    if (delta != null) { entry.respSum += delta; entry.respCount++; }
  }

  // 채널별 매출 = 이 기간에 인입(문의)한 리드(코호트)가 낸 결제만 — 결제·전환율과 동일 기준.
  // (전 기간 인입 → 이번 기간 결제는 상단 총매출엔 잡히지만 채널표에는 제외 → 채널 합 ≠ 총매출)
  const leadIds = new Set(leadList.map((s) => s.id));
  const leadSourceById = new Map<string, string>(
    leadList.map((s) => [s.id, s.traffic_source ?? '미입력'])
  );
  for (const p of paymentList) {
    if (!p.student_id || !leadIds.has(p.student_id)) continue;
    const src = leadSourceById.get(p.student_id) ?? '미입력';
    const entry = sourceMap.get(src);
    if (!entry) continue;
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  return Array.from(sourceMap.entries())
    .map(([source, d]) => ({
      source,
      leads: d.leads,
      contacted: d.contacted,
      contact_rate: contactRate(d.contacted, d.leads),
      paid: d.paid,
      // 결제 전환율 = 컨택 성공 인원 중 결제 인원
      conversion_rate: d.contacted > 0 ? Math.round((d.paid / d.contacted) * 10000) / 100 : 0,
      revenue: d.revenue,
      net_revenue: d.net_revenue,
      avg_first_response_seconds: d.respCount > 0 ? Math.round(d.respSum / d.respCount) : null,
    }))
    .sort((a, b) => b.leads - a.leads);
}

const emptyMonth = (month: string): StatsMonthly => ({
  month, leads: 0, contacted: 0, paid: 0, gross_revenue: 0, refund: 0, revenue: 0, net_revenue: 0,
});

/** 월별 리드(문의월 기준)·결제(결제월 기준) 집계. 빈 달은 0 행으로 채운다. */
export function computeMonthly(
  leadList: StatsLead[],
  paymentList: StatsPayment[],
  isPaid: PaidChecker,
  isContactedLead: ContactedChecker
): StatsMonthly[] {
  const monthMap = new Map<string, StatsMonthly>();
  const entryOf = (mo: string) => {
    if (!monthMap.has(mo)) monthMap.set(mo, emptyMonth(mo));
    return monthMap.get(mo)!;
  };

  for (const s of leadList) {
    const entry = entryOf(toMonthKey(s.inquiry_date ?? s.created_at));
    entry.leads++;
    if (isInitialLead(s) && isContactedLead(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  for (const p of paymentList) {
    const entry = entryOf(toMonthKey(p.paid_at));
    if (p.amount >= 0) entry.gross_revenue += p.amount;
    else entry.refund += p.amount;
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  return fillMonthlyGaps(Array.from(monthMap.values()), emptyMonth);
}

type WeekAcc = Omit<StatsWeekly, 'week'> & { start: string };

/** 주차별 리드(문의일 기준)·결제(결제일 기준) 집계. 주차 시작일 오름차순. */
export function computeWeekly(
  leadList: StatsLead[],
  paymentList: StatsPayment[],
  isPaid: PaidChecker,
  isContactedLead: ContactedChecker
): StatsWeekly[] {
  const weekMap = new Map<string, WeekAcc>();
  const entryOf = (wk: string, dateStr: string) => {
    if (!weekMap.has(wk))
      weekMap.set(wk, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0, start: dateStr.slice(0, 10) });
    return weekMap.get(wk)!;
  };

  for (const s of leadList) {
    const dateStr = s.inquiry_date ?? s.created_at;
    const wk = getWeekLabel(dateStr);
    if (!wk) continue;
    const entry = entryOf(wk, dateStr);
    entry.leads++;
    if (isInitialLead(s) && isContactedLead(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  for (const p of paymentList) {
    const wk = getWeekLabel(p.paid_at);
    if (!wk) continue;
    const entry = entryOf(wk, p.paid_at);
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  return Array.from(weekMap.entries())
    .sort(([, a], [, b]) => a.start.localeCompare(b.start))
    .map(([week, d]) => ({
      week,
      leads: d.leads,
      contacted: d.contacted,
      paid: d.paid,
      revenue: d.revenue,
      net_revenue: d.net_revenue,
    }));
}

/** 단계별 체류 기간 + 이동률. */
export function computeStageFlowRows(leadList: StatsLead[]): StageFlowRow[] {
  return computeStageFlow(
    leadList.map((s) => ({
      funnel_stage: s.funnel_stage,
      funnel_stage_updated_at: s.funnel_stage_updated_at ?? null,
      created_at: s.created_at,
      stage_history: s.stage_history ?? [],
    }))
  );
}
