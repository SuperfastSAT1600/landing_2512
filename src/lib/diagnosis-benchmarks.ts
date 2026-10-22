import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import type { QuestionAttempt } from './diagnosis-attempts';
import { mean, type ResultAttempts } from './diagnosis-aggregate';
import {
  SECTION_BENCHMARKS,
  DOMAIN_BENCHMARKS,
  type SectionBenchmarks,
  type DomainBenchmark,
} from './report-benchmarks';

/** 이 인원 미만이면 상위 10% 기준이 의미 없다고 보고 계산값을 쓰지 않는다. */
export const MIN_BENCHMARK_SAMPLE = 20;
const TOP_PERCENTILE = 0.9;
const OVERALL = 'Diagnostic';

export interface ComboBenchmarks {
  /** computed: 이 조합 학생들로 계산 / legacy: 형식1+세트1 정적값 / insufficient: 표본 부족 */
  source: 'computed' | 'legacy' | 'insufficient';
  sampleSize: number;
  sections: Record<string, SectionBenchmarks>;
  domains: Record<string, DomainBenchmark>;
}

interface StudentGroupStat {
  accuracy: number;
  avgTime: number | null;
  avgConfidence: number | null;
}

function studentStat(attempts: QuestionAttempt[]): StudentGroupStat | null {
  if (attempts.length === 0) return null;
  const answered = attempts.filter((a) => a.answered);
  return {
    accuracy: attempts.filter((a) => a.isCorrect).length / attempts.length,
    avgTime: mean(answered.flatMap((a) => (a.timeSeconds == null ? [] : [a.timeSeconds]))),
    avgConfidence: mean(answered.flatMap((a) => (a.confidence == null ? [] : [a.confidence]))),
  };
}

/** 오름차순 정렬 후 nearest-rank 백분위수. */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function topTier(stats: StudentGroupStat[]) {
  const threshold = percentile(stats.map((s) => s.accuracy), TOP_PERCENTILE);
  const top = stats.filter((s) => s.accuracy >= threshold);
  return {
    accuracy: threshold,
    avgTimeSeconds: mean(top.flatMap((s) => (s.avgTime == null ? [] : [s.avgTime]))),
    avgConfidence: mean(top.flatMap((s) => (s.avgConfidence == null ? [] : [s.avgConfidence]))),
  };
}

function groupStats(items: ResultAttempts[], keyOf: (q: TestQuestion) => string, pool: Map<string, TestQuestion>) {
  const groups: Record<string, StudentGroupStat[]> = {};
  for (const { attempts } of items) {
    const perKey: Record<string, QuestionAttempt[]> = {};
    for (const a of attempts) {
      const q = pool.get(a.questionId);
      if (q) (perKey[keyOf(q)] ??= []).push(a);
    }
    for (const [key, list] of Object.entries(perKey)) {
      const stat = studentStat(list);
      if (stat) (groups[key] ??= []).push(stat);
    }
  }
  return groups;
}

/** 세트 문항 중 이 비율 이상을 푼 학생만 해당 세트의 비교 대상이 된다. */
const MIN_SET_COVERAGE = 0.6;

interface BuildArgs {
  format: string;
  setNumber: number | null;
  /** 형식이 같은 제출들. setQuestionIds를 주면 세트 문항만 남기고, 안 주면 그대로 쓴다. */
  items: ResultAttempts[];
  pool: Map<string, TestQuestion>;
  /** 평가 대상 세트의 문항 ID. 문항이 반복 사용되므로 다른 세트를 푼 학생도 이 문항들로 비교된다. */
  setQuestionIds?: Set<string>;
}

function restrictToSet(items: ResultAttempts[], ids: Set<string>): ResultAttempts[] {
  const needed = Math.ceil(ids.size * MIN_SET_COVERAGE);
  return items
    .map((i) => ({ ...i, attempts: i.attempts.filter((a) => ids.has(a.questionId)) }))
    .filter((i) => i.attempts.length >= needed);
}

export function buildComboBenchmarks({ format, setNumber, items: allItems, pool, setQuestionIds }: BuildArgs): ComboBenchmarks {
  const items = setQuestionIds ? restrictToSet(allItems, setQuestionIds) : allItems;
  const sampleSize = items.length;
  if (sampleSize < MIN_BENCHMARK_SAMPLE) {
    const isLegacyCombo = format === 'diagnostic-test-1' && setNumber === 1;
    return isLegacyCombo
      ? { source: 'legacy', sampleSize, sections: SECTION_BENCHMARKS, domains: DOMAIN_BENCHMARKS }
      : { source: 'insufficient', sampleSize, sections: {}, domains: {} };
  }

  const sectionGroups = groupStats(items, (q) => q.section, pool);
  const domainGroups = groupStats(items, (q) => q.domain, pool);
  const overall = items.flatMap((i) => {
    const s = studentStat(i.attempts);
    return s ? [s] : [];
  });

  const sections: Record<string, SectionBenchmarks> = { [OVERALL]: { top10: topTier(overall) } };
  for (const [name, stats] of Object.entries(sectionGroups)) sections[name] = { top10: topTier(stats) };
  const domains: Record<string, DomainBenchmark> = {};
  for (const [name, stats] of Object.entries(domainGroups)) domains[name] = { top10: topTier(stats).accuracy };

  return { source: 'computed', sampleSize, sections, domains };
}
