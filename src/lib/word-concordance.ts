import { readFile } from 'fs/promises';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'sat/schema/vocab/word_concordance.json');
const OVERRIDES_PATH = path.join(process.cwd(), 'sat/schema/vocab/lemma_overrides.json');

export interface WordExample {
  question_id: string;
  skill: string;
  difficulty: string;
  domain: string;
  sentence: string;
  surfaces: string[];
}

export interface WordEntry {
  lemma: string;
  count: number;
  surface_forms: Record<string, number>;
  examples: WordExample[];
  truncated: boolean;
}

interface ConcordanceFile {
  _meta: { questions_indexed: number; total_lemmas: number; max_examples_per_lemma: number };
  index: Record<string, WordEntry>;
}

let cache: ConcordanceFile | null = null;
let overridesCache: Record<string, string> | null = null;

// 원형이 -ies로 끝나는 불변 명사 (규칙 적용 시 species→specy처럼 깨짐). 소규모 폐집합이라
// 하드코딩으로 충분함.
const INVARIANT_IES_WORDS = new Set(['species', 'series']);

/**
 * suffix 규칙만 적용한 1차 정규화 (silent-e 복원 없음). pipeline/generate/build_word_index.py의
 * base_normalize_lemma()와 1:1 대응해야 한다.
 */
function baseNormalizeLemma(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;
  if (INVARIANT_IES_WORDS.has(w)) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ying')) return w.slice(0, -4) + 'y';
  if (/(sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3);
    if (stem.length >= 3 && stem.at(-1) === stem.at(-2) && !'aeiou'.includes(stem.at(-1)!)) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (w.endsWith('ed') && !w.endsWith('eed') && w.length > 4) {
    const stem = w.slice(0, -2);
    if (stem.length >= 3 && stem.at(-1) === stem.at(-2) && !'aeiou'.includes(stem.at(-1)!)) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (w.endsWith('es') && /(s|x|z)$/.test(w.slice(0, -2))) return w.slice(0, -2);
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

async function loadOverrides(): Promise<Record<string, string>> {
  if (overridesCache !== null) return overridesCache;
  const raw = await readFile(OVERRIDES_PATH, 'utf-8');
  overridesCache = JSON.parse(raw) as Record<string, string>;
  return overridesCache;
}

/**
 * lemma 정규화 — pipeline/generate/build_word_index.py의 normalize_lemma()와 1:1 대응해야 한다.
 * suffix 규칙만으로는 silent-e 소실(creating→creat, create가 되어야 함)을 정확히 못 잡아서,
 * 코퍼스 증거로 검증한 sat/schema/vocab/lemma_overrides.json을 최종 보정으로 적용한다.
 * 한쪽만 고치면 검색 API와 색인이 어긋난다.
 */
export async function normalizeLemma(word: string): Promise<string> {
  const lemma = baseNormalizeLemma(word);
  const overrides = await loadOverrides();
  return overrides[lemma] ?? lemma;
}

export async function loadWordConcordance(): Promise<ConcordanceFile> {
  if (cache !== null) return cache;
  const raw = await readFile(INDEX_PATH, 'utf-8');
  cache = JSON.parse(raw) as ConcordanceFile;
  return cache;
}

export function clearWordConcordanceCache(): void {
  cache = null;
}
