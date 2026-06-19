/**
 * KPI 건강 스냅샷 — 통계에서 약하거나/정체되거나/악화된 영역을 결정론적으로 추려
 * 선제 진단 메시지의 근거 블록을 만든다. 순수 함수(I/O 없음). 라우트가 데이터를 넘긴다.
 */
import type { CrmStatsData } from '@/app/api/crm/stats/route';
import { FUNNEL_STAGE_SLA_DAYS, FUNNEL_NEXT_ACTION, FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';

// ── 임계값 (운영 튜닝은 여기만) ────────────────────────────────────────────────
const TH = {
  relWarn: -10, relCrit: -25, // 매출·리드 상대 변화 %
  ppWarn: -3, ppCrit: -7, // 비율(컨택/전환) pp 변화
  minPrevLeads: 5, // 직전 표본 게이트
  chContactWarn: 50, chContactCrit: 30,
  chConvWarn: 10, chConvCrit: 5, chConvMinContacted: 3,
  chRespWarn: 3600, chRespCrit: 14400, // 첫 응답 초
  chMinLeads: 5,
  advWarn: 60, advCrit: 40, // 단계 전환율 %
  dwellWarnMult: 2, dwellCritMult: 3, // 체류 vs SLA 배수
  stageMinReached: 5,
  stallWarn: 5, stallCrit: 10, // 정체 리드 수
};

export type Severity = 'critical' | 'warn';

export interface Signal {
  area: string;
  severity: Severity;
  note: string;
}

export interface StalledCount {
  stage: FunnelStage;
  label: string;
  count: number;
}

export interface HealthInput {
  current: CrmStatsData;
  previous: CrmStatsData;
  stalled: StalledCount[];
  periodDays: number;
}

export interface HealthSnapshot {
  signals: Signal[];
  weakest: Signal[];
  summaryText: string;
}

const sevRank = (s: Severity) => (s === 'critical' ? 0 : 1);
const pct = (n: number) => `${n.toFixed(1)}%`;
const man = (won: number) => `${Math.round(won / 10000).toLocaleString()}만`;

function relDelta(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function buildHealthSnapshot(input: HealthInput): HealthSnapshot {
  const { current, previous, stalled, periodDays } = input;
  const o = current.overview;
  const p = previous.overview;
  const signals: Signal[] = [];
  const enoughPrev = p.total_leads >= TH.minPrevLeads;

  // A. 오버뷰 델타 (직전 동일 길이 기간 대비)
  if (enoughPrev) {
    const cr = o.contact_rate - p.contact_rate;
    if (cr <= TH.ppCrit) signals.push({ area: '컨택 성공률', severity: 'critical', note: `${pct(p.contact_rate)}→${pct(o.contact_rate)} (${cr.toFixed(1)}pp)` });
    else if (cr <= TH.ppWarn) signals.push({ area: '컨택 성공률', severity: 'warn', note: `${pct(p.contact_rate)}→${pct(o.contact_rate)} (${cr.toFixed(1)}pp)` });

    const cv = o.conversion_rate - p.conversion_rate;
    if (cv <= TH.ppCrit) signals.push({ area: '결제 전환율', severity: 'critical', note: `${pct(p.conversion_rate)}→${pct(o.conversion_rate)} (${cv.toFixed(1)}pp)` });
    else if (cv <= TH.ppWarn) signals.push({ area: '결제 전환율', severity: 'warn', note: `${pct(p.conversion_rate)}→${pct(o.conversion_rate)} (${cv.toFixed(1)}pp)` });

    const rev = relDelta(o.gross_revenue, p.gross_revenue);
    if (rev != null && rev <= TH.relCrit) signals.push({ area: '총 매출', severity: 'critical', note: `${man(p.gross_revenue)}→${man(o.gross_revenue)} (${rev.toFixed(0)}%)` });
    else if (rev != null && rev <= TH.relWarn) signals.push({ area: '총 매출', severity: 'warn', note: `${man(p.gross_revenue)}→${man(o.gross_revenue)} (${rev.toFixed(0)}%)` });

    const ld = relDelta(o.total_leads, p.total_leads);
    if (ld != null && ld <= TH.relCrit) signals.push({ area: '신규 리드 수', severity: 'critical', note: `${p.total_leads}→${o.total_leads}건 (${ld.toFixed(0)}%)` });
    else if (ld != null && ld <= TH.relWarn) signals.push({ area: '신규 리드 수', severity: 'warn', note: `${p.total_leads}→${o.total_leads}건 (${ld.toFixed(0)}%)` });
  }

  // B. 채널 약점 (leads >= 5)
  const prevBySrc = new Map(previous.by_source.map((s) => [s.source, s]));
  for (const c of current.by_source) {
    if (c.leads < TH.chMinLeads) continue;
    const worse = (prevBySrc.get(c.source)?.contact_rate ?? Infinity) > c.contact_rate;
    if (c.contact_rate < TH.chContactCrit) signals.push({ area: `${c.source} 채널 컨택`, severity: 'critical', note: `컨택률 ${pct(c.contact_rate)} (리드 ${c.leads})` });
    else if (c.contact_rate < TH.chContactWarn) signals.push({ area: `${c.source} 채널 컨택`, severity: worse ? 'critical' : 'warn', note: `컨택률 ${pct(c.contact_rate)} (리드 ${c.leads})` });

    if (c.contacted >= TH.chConvMinContacted) {
      if (c.conversion_rate < TH.chConvCrit) signals.push({ area: `${c.source} 채널 전환`, severity: 'critical', note: `전환율 ${pct(c.conversion_rate)} (컨택 ${c.contacted})` });
      else if (c.conversion_rate < TH.chConvWarn) signals.push({ area: `${c.source} 채널 전환`, severity: 'warn', note: `전환율 ${pct(c.conversion_rate)} (컨택 ${c.contacted})` });
    }
    const r = c.avg_first_response_seconds;
    if (r != null && r > TH.chRespCrit) signals.push({ area: `${c.source} 첫 응답`, severity: 'critical', note: `평균 ${(r / 3600).toFixed(1)}시간` });
    else if (r != null && r > TH.chRespWarn) signals.push({ area: `${c.source} 첫 응답`, severity: 'warn', note: `평균 ${(r / 3600).toFixed(1)}시간` });
  }

  // C. 퍼널 병목 (reached >= 5)
  for (const f of current.stage_flow) {
    if (f.reached < TH.stageMinReached) continue;
    const action = FUNNEL_NEXT_ACTION[f.stage as FunnelStage];
    const actNote = action ? ` · 다음 액션: ${action}` : '';
    if (f.advance_rate < TH.advCrit) signals.push({ area: `${f.label} 단계 진행`, severity: 'critical', note: `전환율 ${pct(f.advance_rate)}${actNote}` });
    else if (f.advance_rate < TH.advWarn) signals.push({ area: `${f.label} 단계 진행`, severity: 'warn', note: `전환율 ${pct(f.advance_rate)}${actNote}` });

    const sla = FUNNEL_STAGE_SLA_DAYS[f.stage as FunnelStage];
    if (sla != null && f.avg_days != null) {
      if (f.avg_days > sla * TH.dwellCritMult) signals.push({ area: `${f.label} 체류`, severity: 'critical', note: `평균 ${f.avg_days.toFixed(1)}일 (SLA ${sla}일)` });
      else if (f.avg_days > sla * TH.dwellWarnMult) signals.push({ area: `${f.label} 체류`, severity: 'warn', note: `평균 ${f.avg_days.toFixed(1)}일 (SLA ${sla}일)` });
    }
  }

  // D. 정체 리드
  for (const s of stalled) {
    if (s.count >= TH.stallCrit) signals.push({ area: `${s.label} 정체 리드`, severity: 'critical', note: `${s.count}명 SLA 초과` });
    else if (s.count >= TH.stallWarn) signals.push({ area: `${s.label} 정체 리드`, severity: 'warn', note: `${s.count}명 SLA 초과` });
  }

  signals.sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
  const weakest = signals.slice(0, 3);

  // 프롬프트 주입용 텍스트
  const lines: string[] = [
    `[KPI 건강 진단] (최근 ${periodDays}일 vs 직전 ${periodDays}일)`,
    `- 컨택 성공률 ${pct(o.contact_rate)} / 결제 전환율 ${pct(o.conversion_rate)} / 총매출 ${man(o.gross_revenue)} / 신규 리드 ${o.total_leads}건`,
  ];
  if (!enoughPrev) lines.push('- (직전 기간 표본 부족 — 추세 비교는 참고만)');
  if (weakest.length > 0) {
    lines.push('- 약점/정체 신호:');
    for (const s of signals) lines.push(`  · [${s.severity === 'critical' ? '심각' : '주의'}] ${s.area}: ${s.note}`);
  } else {
    lines.push('- 뚜렷한 악화 신호 없음. 절대 수준이 낮은 지표(전환율·컨택률)를 공격적으로 파고들어 다음 도약 지점을 찾아라.');
  }

  return { signals, weakest, summaryText: lines.join('\n') };
}
