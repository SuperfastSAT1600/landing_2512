import { FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';

/**
 * 세일즈 퍼널 단계별 이동 분석 (체류 기간 + 단계 전환 비율)
 *
 * 데이터 원천: students.stage_history (단계 변경 시 자동 append) + 현재 funnel_stage.
 * - 도달/이동 비율: 학생이 거친 단계의 최대 도달 인덱스 기준 (이력이 희소해도 단조 퍼널 보장)
 * - 체류 기간: stage_history의 연속 전환 시간차에서만 산출 (실제 기록된 이동만)
 */

// churned를 제외한 퍼널 흐름 순서
export const FUNNEL_FLOW_ORDER: FunnelStage[] = [
  '0',
  '1',
  '2',
  '3a',
  '3b',
  '4',
  '5a',
  '5b',
  '6',
  '7',
  '8',
];

const STAGE_INDEX = new Map<string, number>(FUNNEL_FLOW_ORDER.map((s, i) => [s, i]));

export interface StageHistoryEntry {
  stage: string;
  label: string;
  entered_at: string;
}

/** 도달 단계 판정에 필요한 최소 형태 */
export interface StageReachable {
  funnel_stage: string;
  stage_history?: StageHistoryEntry[] | null;
}

export interface StageFlowInput extends StageReachable {
  funnel_stage_updated_at: string | null;
  created_at: string;
  stage_history: StageHistoryEntry[] | null;
}

export interface StageFlowRow {
  stage: FunnelStage;
  label: string;
  reached: number; // 이 단계에 도달한 인원
  advanced: number; // 다음 단계 이상으로 이동한 인원
  advance_rate: number; // 이동률 % (advanced / reached, 소수 2자리)
  avg_days: number | null; // 이 단계 평균 체류 기간(일)
  median_days: number | null; // 이 단계 중앙값 체류 기간(일)
  sample_size: number; // 체류 기간 표본 수 (기록된 전환 수)
}

const MS_PER_DAY = 86_400_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 학생이 도달한 최대 퍼널 인덱스를 반환. churned이거나 미상이면 -1.
 * stage_history에 기록된 단계 ∪ 현재 funnel_stage 중 최대.
 */
function maxReachedIndex(s: StageReachable): number {
  let max = STAGE_INDEX.get(s.funnel_stage) ?? -1;
  for (const entry of s.stage_history ?? []) {
    const idx = STAGE_INDEX.get(entry.stage);
    if (idx !== undefined && idx > max) max = idx;
  }
  return max;
}

/**
 * 학생이 (이력상 또는 현재) 특정 단계 이상에 도달한 적이 있는지 판정.
 * 컨택 성공률 등 "한 번이라도 ~까지 갔는가" 지표에 사용.
 */
export function hasReachedStage(s: StageReachable, stage: FunnelStage): boolean {
  const target = STAGE_INDEX.get(stage);
  if (target === undefined) return false;
  return maxReachedIndex(s) >= target;
}

/**
 * 이탈 직전 단계 — stage_history 끝에서 churned를 건너뛰고 만나는 실제 단계.
 * 없으면(이력 없음/전부 churned) null = 미상.
 */
export function getChurnStage(s: {
  stage_history?: { stage: string }[] | null;
}): FunnelStage | null {
  const h = s.stage_history ?? [];
  let i = h.length - 1;
  while (i >= 0 && h[i].stage === 'churned') i--;
  return i >= 0 ? (h[i].stage as FunnelStage) : null;
}

export function computeStageFlow(students: StageFlowInput[]): StageFlowRow[] {
  const reached = new Array(FUNNEL_FLOW_ORDER.length).fill(0);
  // 단계별 체류 기간(일) 표본
  const dwellDays: number[][] = FUNNEL_FLOW_ORDER.map(() => []);

  for (const s of students) {
    // ── 도달 집계: 최대 도달 인덱스까지 모든 단계 reached + 1 ──
    const maxIdx = maxReachedIndex(s);
    for (let i = 0; i <= maxIdx; i++) reached[i]++;

    // ── 체류 기간: 연속 전환 시간차 ──
    const history = (s.stage_history ?? [])
      .filter((e) => STAGE_INDEX.has(e.stage) && e.entered_at)
      .slice()
      .sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime());

    for (let i = 0; i < history.length - 1; i++) {
      const fromIdx = STAGE_INDEX.get(history[i].stage)!;
      const days =
        (new Date(history[i + 1].entered_at).getTime() -
          new Date(history[i].entered_at).getTime()) /
        MS_PER_DAY;
      if (days >= 0) dwellDays[fromIdx].push(days);
    }
  }

  return FUNNEL_FLOW_ORDER.map((stage, i) => {
    const advancedCount = i < FUNNEL_FLOW_ORDER.length - 1 ? reached[i + 1] : 0;
    const samples = dwellDays[i];
    return {
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      reached: reached[i],
      advanced: advancedCount,
      advance_rate: reached[i] > 0 ? round2((advancedCount / reached[i]) * 100) : 0,
      avg_days:
        samples.length > 0 ? round2(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
      median_days: samples.length > 0 ? round2(median(samples)) : null,
      sample_size: samples.length,
    };
  });
}
