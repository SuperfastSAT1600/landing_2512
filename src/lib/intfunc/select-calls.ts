/**
 * 한 학생의 통화 중 학습에 들어갈 것만 고른다 (REQ-102 ~ REQ-105).
 *
 * 중복 → 유형 → 절단 순서다. 중복을 먼저 접어야 뒤의 집계가 실제 통화 수를 센다.
 */
import { classifyCall, CORPUS_KINDS } from './classify-call';
import {
  at,
  OUTCOME_BY_STAGE,
  type BuildStats,
  type CallInput,
  type StudentInput,
} from './corpus-types';

const millis = (entries: Array<{ entered_at: string }>): number[] =>
  entries.map((e) => new Date(e.entered_at).getTime()).filter((t) => Number.isFinite(t));

/**
 * 결과가 확정된 시각. 이후의 통화에는 결과가 그대로 등장하므로 학습에서 빼야 한다.
 *
 * **현재** 라벨에 해당하는 진입 중 가장 늦은 것을 쓴다 (REQ-102). 라벨은 학생의 현재
 * 결과이므로 cutoff도 그 결과가 확정된 시점이어야 한다. 이탈 → 재유입 → 결제 학생의
 * 라벨은 converted이고 그 결과를 만든 것은 재유입 이후의 통화다. 가장 이른 진입을 쓰면
 * 라벨과 통화가 서로 다른 사이클을 가리킨다.
 *
 * 근거가 없으면 `null` — 호출자가 절단하지 않고 통계로 보고한다.
 */
export function resolveCutoff(student: StudentInput): number | null {
  const outcomes = (student.stage_history ?? []).filter(
    (e) => OUTCOME_BY_STAGE[e.stage] !== undefined
  );
  const current = millis(outcomes.filter((e) => e.stage === student.funnel_stage));
  if (current.length > 0) return Math.max(...current);
  const any = millis(outcomes);
  if (any.length > 0) return Math.max(...any);
  if (student.funnel_stage_updated_at) {
    const t = new Date(student.funnel_stage_updated_at).getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
}

/**
 * 같은 녹음이 만든 두 행을 하나로 접는다 (REQ-104).
 *
 * `(source, external_id)` 유니크는 같은 통화가 Plaud 계정 두 곳에 있을 때 `file_id`가
 * 달라 못 잡는다. 접지 않으면 같은 대화가 본문에 두 번 들어가 그 학생의 발화가 학습에서
 * 두 배로 가중된다. `recorded_at`이 없으면 동일 녹음인지 판단할 근거가 없어 접지 않는다.
 */
function dedupe(calls: CallInput[]): CallInput[] {
  const seen = new Set<string>();
  return calls.filter((c) => {
    if (!c.recorded_at) return true;
    const key = `${c.recorded_at}|${c.duration_sec ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 남길 통화를 시각 오름차순으로 돌려준다. 남는 게 없으면 `null`(제외 사유는 통계에). */
export function selectCalls(
  all: CallInput[],
  cutoff: number | null,
  stats: BuildStats
): CallInput[] | null {
  stats.callsTotal += all.length;
  if (all.length === 0) {
    stats.excludedNoTranscript += 1;
    return null;
  }

  const unique = dedupe(all);
  stats.duplicateCalls += all.length - unique.length;

  const sales = unique.filter((c) => {
    const kind = classifyCall(c.recording_name);
    stats.callsByKind[kind] += 1;
    return CORPUS_KINDS.includes(kind);
  });
  stats.callsFiltered += unique.length - sales.length;
  if (sales.length === 0) {
    stats.excludedAllFiltered += 1;
    return null;
  }

  const kept = sales.filter((c) => cutoff === null || at(c) <= cutoff);
  stats.callsTruncated += sales.length - kept.length;
  if (kept.length === 0) {
    stats.excludedAllTruncated += 1;
    return null;
  }

  stats.callsKept += kept.length;
  return kept.sort((a, b) => at(a) - at(b));
}
