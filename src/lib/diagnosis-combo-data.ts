import { supabaseAdmin } from '@/lib/supabase-admin';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import { buildQuestionPool, extractAttempts, normalizeFormatId, type RawResult } from './diagnosis-attempts';
import type { ResultAttempts } from './diagnosis-aggregate';
import { buildComboBenchmarks, type ComboBenchmarks } from './diagnosis-benchmarks';
import { fallbackQuestions } from './diagnosis-test-source';

export interface SetInfo {
  id: string;
  setNumber: number | null;
  /** 세트가 속한 테스트 형식. 형식 없이 만들어진 세트는 null. */
  testId: string | null;
  isCurrent: boolean;
  questions: TestQuestion[];
}

export interface ComboContext {
  sets: Map<string, SetInfo>;
  /** 모든 세트와 하드코딩 세트의 문항 — 세트에서 교체되어 사라진 문항 ID를 복구하는 데 쓴다. */
  pool: Map<string, TestQuestion>;
}

const RESULT_COLUMNS = 'test_id, test_version_id, answers, confidence_levels, question_times';
/** 한 번에 읽는 제출 수 상한. 형식당 수백 건 규모라 페이지네이션 없이 읽는다. */
const RESULT_LIMIT = 5000;
const BENCHMARK_TTL_MS = 5 * 60 * 1000;

export async function loadComboContext(): Promise<ComboContext> {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_test_versions')
    .select('id, set_number, is_current, test_id, questions');
  if (error) throw error;

  const sets = new Map<string, SetInfo>();
  for (const v of data ?? []) {
    sets.set(v.id, {
      id: v.id,
      setNumber: v.set_number ?? null,
      testId: v.test_id ?? null,
      isCurrent: v.is_current === true,
      questions: (v.questions ?? []) as TestQuestion[],
    });
  }
  const lists = [...[...sets.values()].map((s) => s.questions), fallbackQuestions('diagnostic-test-1'), fallbackQuestions('diagnostic-test-2')];
  return { sets, pool: buildQuestionPool(lists) };
}

/** 제출이 속한 세트의 문항. 세트 정보가 없는 레거시 제출은 형식의 하드코딩 세트를 쓴다. */
export function questionsForResult(result: RawResult, ctx: ComboContext): TestQuestion[] {
  const set = result.test_version_id ? ctx.sets.get(result.test_version_id) : undefined;
  return set?.questions ?? fallbackQuestions(normalizeFormatId(result.test_id));
}

export async function loadFormatResults(format: string): Promise<RawResult[]> {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select(RESULT_COLUMNS)
    .limit(RESULT_LIMIT);
  if (error) throw error;
  return ((data ?? []) as RawResult[]).filter((r) => normalizeFormatId(r.test_id) === format);
}

export function toResultAttempts(results: RawResult[], ctx: ComboContext): ResultAttempts[] {
  return results.map((r) => ({
    format: normalizeFormatId(r.test_id),
    versionId: r.test_version_id,
    attempts: extractAttempts(r, questionsForResult(r, ctx), ctx.pool),
  }));
}

const benchmarkCache = new Map<string, { at: number; value: ComboBenchmarks }>();

export function clearComboBenchmarkCache() {
  benchmarkCache.clear();
}

/** (형식, 세트) 조합의 벤치마크. 세트 문항이 같은 형식의 다른 세트에서도 쓰였으면 그 학생들도 문항 단위로 반영된다. */
export async function getComboBenchmarks(testId: string | null, versionId: string | null): Promise<ComboBenchmarks> {
  const format = normalizeFormatId(testId);
  const key = `${format}|${versionId ?? ''}`;
  const hit = benchmarkCache.get(key);
  if (hit && Date.now() - hit.at < BENCHMARK_TTL_MS) return hit.value;

  const ctx = await loadComboContext();
  const set = versionId ? ctx.sets.get(versionId) : undefined;
  const questions = set?.questions ?? fallbackQuestions(format);
  const items = toResultAttempts(await loadFormatResults(format), ctx);
  const value = buildComboBenchmarks({
    format,
    setNumber: set?.setNumber ?? (format === 'diagnostic-test-1' ? 1 : null),
    items,
    pool: ctx.pool,
    setQuestionIds: new Set(questions.map((q) => q.id)),
  });
  benchmarkCache.set(key, { at: Date.now(), value });
  return value;
}
