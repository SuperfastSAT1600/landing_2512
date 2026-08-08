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

// ─── Verdict Line ────────────────────────────────────────────────────────────

export interface Verdict {
  tier: 1 | 2 | 3 | 4;
  text: string;
}

// 등급 경계값 — 1,839개 문항 전체 분포에서 도출 (stopwords count≥500 제외)
// Tier1: 1~2회 (하위 64.1%), Tier2: 3~10회 (24.5%), Tier3: 11~20회 (5.4%), Tier4: 21+회 (6.1%)
const TIER2_MIN = 3;
const TIER3_MIN = 11;
const TIER4_MIN = 21;
const STOPWORD_THRESHOLD = 500;

const TEMPLATES: Record<1 | 2 | 3 | 4, string[]> = {
  1: [
    '1,839개 QB 문항 중 {count}번 등장했어요. 빈도는 낮지만 문맥에서 만나면 알아두세요.',
    'QB 지문에서 {count}번 발견됐어요. 우선순위가 높진 않지만 예문은 참고할 만해요.',
    '등장 빈도가 낮은 편이에요. 시험에서 만날 확률은 적지만, 알아두면 손해는 없어요.',
  ],
  2: [
    '1,839개 QB 문항 중 {count}번 등장했어요. 가끔 나오는 단어예요.',
    'QB 지문 상위 36% 빈도예요. 한 번쯤 정리해두면 도움이 돼요.',
    '출제 빈도 중간 수준이에요. 예문을 통해 쓰임새를 익혀두면 좋아요.',
  ],
  3: [
    '1,839개 QB 문항 중 {count}번 나왔어요. 자주 등장하는 단어예요. 꼭 익혀두세요.',
    'QB 지문 상위 11% 빈도예요. SAT에서 자주 쓰이는 중요한 단어예요.',
    '출제 빈도가 높은 어휘예요. 뜻뿐만 아니라 문장 안에서의 쓰임새도 확인해두세요.',
  ],
  4: [
    '1,839개 QB 문항 중 {count}번 등장했어요. SAT 핵심 어휘예요. 반드시 정리해두세요.',
    'QB 전체 지문에서 매우 자주 나오는 단어예요. 최우선 암기 대상이에요.',
    '출제 빈도 최상위권(상위 6%)이에요. SAT 빈출 핵심 어휘로 분류돼요.',
  ],
};

// count=1일 때는 불확실성을 반영한 별도 문구
const TIER1_SINGLE_TEMPLATES = [
  '아직 데이터가 1건뿐이에요. 단정하긴 어렵지만, 이 문맥에서 어떻게 쓰였는지 확인해보세요.',
  'QB 지문에서 딱 1번 등장했어요. 출제 빈도보다는 예문의 문맥 이해에 집중하는 게 좋아요.',
  '등장 횟수가 적어 빈도 판단이 어려워요. 예문 속 쓰임새를 참고해 주세요.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getVerdict(count: number): Verdict | null {
  if (count === 0 || count >= STOPWORD_THRESHOLD) return null;

  const tier: 1 | 2 | 3 | 4 =
    count >= TIER4_MIN ? 4 :
    count >= TIER3_MIN ? 3 :
    count >= TIER2_MIN ? 2 : 1;

  const template =
    tier === 1 && count === 1
      ? pick(TIER1_SINGLE_TEMPLATES)
      : pick(TEMPLATES[tier]).replace('{count}', String(count));

  return { tier, text: template };
}
