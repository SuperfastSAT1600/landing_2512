/**
 * KPI 건강 스냅샷 — 통계에서 약하거나/정체되거나/악화된 영역을 결정론적으로 추려
 * 선제 진단 메시지의 근거 블록을 만든다. 순수 함수(I/O 없음). 라우트가 데이터를 넘긴다.
 */
import type { CrmStatsData } from '@/lib/crm-stats-service';
import { FUNNEL_STAGE_SLA_DAYS, FUNNEL_NEXT_ACTION, type FunnelStage } from '@/types/crm';
import { formatChurnLines, type ChurnBreakdown } from '@/lib/churn-breakdown';

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
  churnMinCohort: 5, // 이탈 사유 신호를 낼 최소 이탈 코호트 수(표본 게이트)
  churnTopShareWarn: 0.35, churnTopShareCrit: 0.5, // 최다 사유가 이탈의 이 비율 이상이면 신호
};

export type Severity = 'critical' | 'warn';
export type SignalCategory = 'funnel' | 'channel' | 'stall' | 'trend' | 'churn';

export interface Signal {
  area: string;
  severity: Severity;
  note: string;
  category: SignalCategory;
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
  periodLabel?: string; // 진단 텍스트의 기간 설명(없으면 "최근 N일 vs 직전 N일")
  churn?: ChurnBreakdown; // 분석 기간 인입 코호트 중 이탈 리드의 사유 분포(없으면 이탈 섹션 생략)
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

/**
 * 실신호가 5개 미만일 때 채울 '관찰' 후보 — 임계는 안 넘었지만 상대적으로 약한 채널·단계.
 * 배너가 LLM 유무와 무관하게 일관되게 5개를 보여주도록(폴백 시 3개로 쪼그라들지 않게) 한다. 순수.
 */
function watchFillers(current: CrmStatsData, existing: Signal[], need: number): Signal[] {
  if (need <= 0) return [];
  const flagged = new Set(existing.map((s) => s.area));
  const taken = (...areas: string[]) => areas.some((a) => flagged.has(a));
  const out: Signal[] = [];

  // 채널: 전환율 낮은 순 (leads >= min, 컨택/전환 신호로 아직 안 잡힌 채널)
  const chans = [...current.by_source]
    .filter((c) => c.leads >= TH.chMinLeads && !taken(`${c.source} 채널 컨택`, `${c.source} 채널 전환`, `${c.source} 채널 관찰`))
    .sort((a, b) => a.conversion_rate - b.conversion_rate);
  for (const c of chans) {
    if (out.length >= need) break;
    out.push({ category: 'channel', area: `${c.source} 채널 관찰`, severity: 'warn', note: `컨택률 ${pct(c.contact_rate)} · 전환율 ${pct(c.conversion_rate)} (리드 ${c.leads})` });
  }

  // 단계: 진행률 낮은 순 (reached >= min, 다음 액션 있는 단계, 아직 안 잡힌 단계)
  const stages = [...current.stage_flow]
    .filter((f) => f.reached >= TH.stageMinReached && FUNNEL_NEXT_ACTION[f.stage as FunnelStage] && !taken(`${f.label} 단계 이탈`, `${f.label} 단계 관찰`))
    .sort((a, b) => a.advance_rate - b.advance_rate);
  for (const f of stages) {
    if (out.length >= need) break;
    out.push({ category: 'funnel', area: `${f.label} 단계 관찰`, severity: 'warn', note: `진행률 ${pct(f.advance_rate)} · ${f.reached}명 중 ${Math.max(0, f.reached - f.advanced)}명 멈춤` });
  }
  return out.slice(0, need);
}

export function buildHealthSnapshot(input: HealthInput): HealthSnapshot {
  const { current, previous, stalled, periodDays } = input;
  const o = current.overview;
  const p = previous.overview;
  const enoughPrev = p.total_leads >= TH.minPrevLeads;

  // 분석 척추 = 이번 달 인입 코호트의 퍼널 진행·드롭오프. 지난달 비교는 보조(trend).
  const primary: Signal[] = []; // funnel / channel / stall
  const trend: Signal[] = []; // 지난달 대비 변화 (보조)

  // ── 퍼널 진행·드롭오프 (척추) — reached >= 5 ──
  for (const f of current.stage_flow) {
    if (f.reached < TH.stageMinReached) continue;
    const action = FUNNEL_NEXT_ACTION[f.stage as FunnelStage];
    const lost = Math.max(0, f.reached - f.advanced);
    // 종료 단계(수업 중 8·이탈 churned, 다음 액션 없음)는 진행률 0%가 정상 → 드롭오프 판정 제외
    if (action) {
      const actNote = ` · 다음 액션: ${action}`;
      if (f.advance_rate < TH.advCrit) primary.push({ category: 'funnel', area: `${f.label} 단계 이탈`, severity: 'critical', note: `진행률 ${pct(f.advance_rate)} · ${f.reached}명 중 ${lost}명 멈춤${actNote}` });
      else if (f.advance_rate < TH.advWarn) primary.push({ category: 'funnel', area: `${f.label} 단계 이탈`, severity: 'warn', note: `진행률 ${pct(f.advance_rate)} · ${f.reached}명 중 ${lost}명 멈춤${actNote}` });
    }

    const sla = FUNNEL_STAGE_SLA_DAYS[f.stage as FunnelStage];
    if (sla != null && f.avg_days != null) {
      if (f.avg_days > sla * TH.dwellCritMult) primary.push({ category: 'funnel', area: `${f.label} 체류`, severity: 'critical', note: `평균 ${f.avg_days.toFixed(1)}일 (SLA ${sla}일)` });
      else if (f.avg_days > sla * TH.dwellWarnMult) primary.push({ category: 'funnel', area: `${f.label} 체류`, severity: 'warn', note: `평균 ${f.avg_days.toFixed(1)}일 (SLA ${sla}일)` });
    }
  }

  // ── 채널 약점 (leads >= 5) ──
  const prevBySrc = new Map(previous.by_source.map((s) => [s.source, s]));
  for (const c of current.by_source) {
    if (c.leads < TH.chMinLeads) continue;
    const worse = (prevBySrc.get(c.source)?.contact_rate ?? Infinity) > c.contact_rate;
    if (c.contact_rate < TH.chContactCrit) primary.push({ category: 'channel', area: `${c.source} 채널 컨택`, severity: 'critical', note: `컨택률 ${pct(c.contact_rate)} (리드 ${c.leads})` });
    else if (c.contact_rate < TH.chContactWarn) primary.push({ category: 'channel', area: `${c.source} 채널 컨택`, severity: worse ? 'critical' : 'warn', note: `컨택률 ${pct(c.contact_rate)} (리드 ${c.leads})` });

    if (c.contacted >= TH.chConvMinContacted) {
      if (c.conversion_rate < TH.chConvCrit) primary.push({ category: 'channel', area: `${c.source} 채널 전환`, severity: 'critical', note: `전환율 ${pct(c.conversion_rate)} (컨택 ${c.contacted})` });
      else if (c.conversion_rate < TH.chConvWarn) primary.push({ category: 'channel', area: `${c.source} 채널 전환`, severity: 'warn', note: `전환율 ${pct(c.conversion_rate)} (컨택 ${c.contacted})` });
    }
    const r = c.avg_first_response_seconds;
    if (r != null && r > TH.chRespCrit) primary.push({ category: 'channel', area: `${c.source} 첫 응답`, severity: 'critical', note: `평균 ${(r / 3600).toFixed(1)}시간` });
    else if (r != null && r > TH.chRespWarn) primary.push({ category: 'channel', area: `${c.source} 첫 응답`, severity: 'warn', note: `평균 ${(r / 3600).toFixed(1)}시간` });
  }

  // ── 정체 리드 ──
  for (const s of stalled) {
    if (s.count >= TH.stallCrit) primary.push({ category: 'stall', area: `${s.label} 정체 리드`, severity: 'critical', note: `${s.count}명 SLA 초과` });
    else if (s.count >= TH.stallWarn) primary.push({ category: 'stall', area: `${s.label} 정체 리드`, severity: 'warn', note: `${s.count}명 SLA 초과` });
  }

  // ── 지난달 대비 추세 (보조) ──
  if (enoughPrev) {
    const cr = o.contact_rate - p.contact_rate;
    if (cr <= TH.ppWarn) trend.push({ category: 'trend', area: '컨택 성공률', severity: cr <= TH.ppCrit ? 'critical' : 'warn', note: `${pct(p.contact_rate)}→${pct(o.contact_rate)} (${cr.toFixed(1)}pp)` });
    const cv = o.conversion_rate - p.conversion_rate;
    if (cv <= TH.ppWarn) trend.push({ category: 'trend', area: '결제 전환율', severity: cv <= TH.ppCrit ? 'critical' : 'warn', note: `${pct(p.conversion_rate)}→${pct(o.conversion_rate)} (${cv.toFixed(1)}pp)` });
    const rev = relDelta(o.gross_revenue, p.gross_revenue);
    if (rev != null && rev <= TH.relWarn) trend.push({ category: 'trend', area: '총 매출', severity: rev <= TH.relCrit ? 'critical' : 'warn', note: `${man(p.gross_revenue)}→${man(o.gross_revenue)} (${rev.toFixed(0)}%)` });
    const ld = relDelta(o.total_leads, p.total_leads);
    if (ld != null && ld <= TH.relWarn) trend.push({ category: 'trend', area: '신규 리드 수', severity: ld <= TH.relCrit ? 'critical' : 'warn', note: `${p.total_leads}→${o.total_leads}건 (${ld.toFixed(0)}%)` });
  }

  // ── 이탈 사유 (분석 기간 인입 코호트 중 이탈) — 최다 사유가 쏠려 있으면 신호로 ──
  const churnSignals: Signal[] = [];
  const cb = input.churn;
  if (cb && cb.total >= TH.churnMinCohort && cb.taggedTotal > 0 && cb.categories.length > 0) {
    const top = cb.categories[0];
    const share = top.count / cb.taggedTotal;
    if (share >= TH.churnTopShareWarn) {
      const sample = top.samples[0] ? ` (예: "${top.samples[0]}")` : '';
      churnSignals.push({
        category: 'churn',
        area: `이탈 사유: ${top.category}`,
        severity: share >= TH.churnTopShareCrit ? 'critical' : 'warn',
        note: `이탈 ${cb.total}명 중 ${top.category} ${top.count}명(${pct(share * 100)})${sample}`,
      });
    }
  }

  const bySev = (a: Signal, b: Signal) => sevRank(a.severity) - sevRank(b.severity);
  primary.sort(bySev);
  trend.sort(bySev);
  // 이탈 사유는 '왜 실제로 떠났나'라 월 대비 추세보다 우선. primary(퍼널·채널·정체) 다음.
  const signals = [...primary, ...churnSignals, ...trend];
  // weakest = 폴백/LLM 시드용 상위 5개. 실신호(퍼널·채널·정체 + 이탈 + 추세)를 모두 모으고,
  // 5개 미만이면 결정론적 '관찰' 후보로 채워 배너가 항상 5개를 보여주게 한다.
  const ranked = [...primary, ...churnSignals, ...trend];
  const weakest = [...ranked, ...watchFillers(current, ranked, 5 - ranked.length)].slice(0, 5);

  // 프롬프트 주입용 텍스트 — 분석 기간 인입 코호트 퍼널을 척추로
  const lines: string[] = [
    `[KPI 건강 진단 · 분석 대상=분석 기간 인입 리드 코호트] (${input.periodLabel ?? `최근 ${periodDays}일`})`,
    `- 인입 ${o.total_leads}명 → 컨택 성공 ${o.contacted}명(${pct(o.contact_rate)}) → 결제 ${o.paid}명(전환율 ${pct(o.conversion_rate)}) · 총매출 ${man(o.gross_revenue)}`,
  ];
  if (primary.length > 0) {
    lines.push('- 퍼널 드롭오프·채널·정체 신호(우선 분석):');
    for (const s of primary) lines.push(`  · [${s.severity === 'critical' ? '심각' : '주의'}] ${s.area}: ${s.note}`);
  } else {
    lines.push('- 뚜렷한 드롭오프 신호 없음. 절대 수준이 낮은 단계·채널을 공격적으로 파고들어 다음 도약 지점을 찾아라.');
  }
  if (trend.length > 0) {
    lines.push(`- 추세(지난달 동기간 대비, 보조): ${trend.map((s) => `${s.area} ${s.note}`).join(' · ')}`);
  } else if (!enoughPrev) {
    lines.push('- (지난달 표본 부족 — 추세 비교는 참고만)');
  }

  // ── 이탈 사유 섹션 — '어디서 막히나(퍼널)'와 별개로 '왜 실제로 떠났나'를 근거로 준다 ──
  if (cb) {
    lines.push('', ...formatChurnLines(cb, '분석 기간 인입 코호트 중'));
  }

  return { signals, weakest, summaryText: lines.join('\n') };
}
