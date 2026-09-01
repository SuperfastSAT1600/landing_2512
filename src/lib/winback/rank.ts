/**
 * 추천 최종 랭킹 조립 — 규칙 점수와 LLM 적합도를 섞어 순서를 만든다. 순수 함수(I/O 없음).
 *
 * 원칙: **LLM은 후보를 제외하지 않는다.** 예전에는 `fit >= 3`을 통과한 후보만 결과에 남겨
 * 1,200명 풀에서 3명만 노출되는 사고가 났다(프롬프트가 "근거 약하면 2 이하"를 지시하는데
 * 파서가 그걸 삭제로 해석). 지금은 판정을 못 받은 후보도 중립 적합도로 계산해 살리고,
 * 부적합 판단은 담당자가 화면에서 한다.
 */
import type { WinbackSignal } from '@/types/crm';
import type { WinbackPick } from '@/lib/winback/parse';

/** LLM 판정을 못 받은 후보(정원 밖·응답 누락)의 적합도. 미판정을 하단으로 밀지 않기 위한 값. */
export const NEUTRAL_FIT = 3;

/** LLM fit은 25~45명을 한 번에 훑는 거친 판정이라 변별력이 낮다 — 순위의 대부분은 규칙 점수가 만든다. */
const RULE_WEIGHT = 0.75;
const FIT_WEIGHT = 0.25;
const FIT_SCALE = 20; // fit 1~5 → 20~100

export interface RankInput {
  id: string;
  score: number;
  /** 클램프 전 원점수 — 100에 닿은 후보끼리 순위를 가리는 데 쓴다. */
  raw_score: number;
  signals: WinbackSignal[];
}

export interface RankOutput {
  final: number;
  llm_fit: number | null;
  reason: string;
}

/** 규칙 신호에서 사람이 읽을 근거 한 줄을 만든다(LLM 미판정 후보용). */
export function reasonFromSignals(signals: WinbackSignal[]): string {
  const positives = signals
    .filter((s) => s.delta > 0)
    .slice(0, 3)
    .map((s) => s.label);
  return positives.length > 0 ? `규칙 신호: ${positives.join(' · ')}` : '규칙 점수 기준 상위 후보';
}

function reasonFromPick(pick: WinbackPick): string {
  return pick.risk ? `${pick.reason} (유의: ${pick.risk})` : pick.reason;
}

export function buildRankedCandidates<T extends RankInput>(
  scored: T[],
  pickMap: Map<string, WinbackPick>,
  limit: number
): Array<T & RankOutput> {
  return scored
    .map((c) => {
      const pick = pickMap.get(c.id);
      const fit = pick?.fit ?? NEUTRAL_FIT;
      return {
        ...c,
        final: Math.round(RULE_WEIGHT * c.score + FIT_WEIGHT * fit * FIT_SCALE),
        llm_fit: pick?.fit ?? null,
        reason: pick ? reasonFromPick(pick) : reasonFromSignals(c.signals),
      };
    })
    .sort((a, b) => b.final - a.final || b.raw_score - a.raw_score)
    .slice(0, limit);
}

/**
 * 재랭킹 묶음 분할 — 정원 전체를 한 프롬프트에 넣으면 모델이 뒷부분 후보를 통째로 빠뜨린다.
 * 실측(2026-08-12, 2026-08-19 재확인): 25~45명을 한 번에 넘기면 절반 가까이가 응답에서 누락됐다.
 * 작게 쪼개 병렬 호출하면 누락이 줄고 지연도 거의 늘지 않는다(묶음이 동시에 돌기 때문).
 */
export function splitIntoChunks<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** 묶음별 결과를 합친다. 한 묶음이 실패해도 나머지 판정은 살린다(그 후보들은 규칙 점수로 backfill). */
export function mergeChunkPicks(
  results: Array<{ picks: WinbackPick[]; error?: string }>
): { picks: WinbackPick[]; error?: string } {
  const picks = results.flatMap((r) => r.picks);
  const errors = results.map((r) => r.error).filter((e): e is string => Boolean(e));
  if (errors.length === 0) return { picks };
  return {
    picks,
    error: `${errors.length}/${results.length} 묶음 판정 실패(해당 후보는 규칙 점수로 대체): ${errors[0]}`,
  };
}
