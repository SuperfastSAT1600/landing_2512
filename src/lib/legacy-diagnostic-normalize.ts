/**
 * 2025년 구 진단테스트(MJ-sat-diagnostic-test) 응시 기록 정규화.
 *
 * 소스가 둘이다:
 *  - Firebase RTDB /diagnostic_results  (2025-07-14 이후 주 저장소)
 *  - 저장소에 커밋된 database.json      (그 이전 파일 DB, 53건)
 * 두 번째는 migrate-to-firebase.js 가 originalId 로 옮겨둔 것이라 상당수가 첫 번째에도 있다.
 * 그래서 originalId 를 자연키로 써서 중복을 걷어낸다.
 */

export type LegacySource = 'firebase' | 'database_json';

export interface NormalizedAttempt {
  source: LegacySource;
  firebase_key: string | null;
  original_id: string | null;
  code: string | null;
  student_name: string;
  student_grade: string | null;
  score: number | null;
  rw_score: number | null;
  math_score: number | null;
  answers: unknown;
  confidence: unknown;
  taken_at: string | null;
  is_internal: boolean;
  internal_reason: string | null;
}

/** 원본 레코드는 필드가 들쭉날쭉하다(초기엔 answers/confidence 자체가 없었다). */
interface RawAttempt {
  id?: string;
  originalId?: string;
  code?: string;
  studentName?: string;
  studentGrade?: string;
  score?: number;
  rwScore?: number;
  mathScore?: number;
  createdAt?: string;
  answers?: unknown;
  confidence?: unknown;
}

const TEST_KEYWORD = /테스트|test|만점/i;
const TRAILING_DIGITS = /\d+$/;
const HANGUL_JAMO = /[ㄱ-ㆎ]/;
const HANGUL_SYLLABLE = /[가-힣]/;
const PUNCTUATION_NOISE = /[!?@#$%^&*~]/;

/**
 * 사내 테스트 제출물 판정. 지우지 않고 플래그만 세운다 — 오판정 시 되돌릴 수 있어야 한다.
 * 키보드 난타(sadg 등)는 신뢰할 판정 규칙이 없어 여기서 잡지 않는다.
 * 어차피 CRM 이름 매칭에서 미매칭으로 떨어지고, 수검토 시트에서 사람이 표시할 수 있다.
 */
export function classifyInternal(rawName: string | null | undefined): {
  isInternal: boolean;
  reason: string | null;
} {
  const name = (rawName ?? '').trim();
  if (!name) return { isInternal: true, reason: 'empty-name' };
  if (TEST_KEYWORD.test(name)) return { isInternal: true, reason: 'test-keyword' };
  if (TRAILING_DIGITS.test(name)) return { isInternal: true, reason: 'digit-suffix' };
  if (HANGUL_JAMO.test(name) && !HANGUL_SYLLABLE.test(name)) {
    return { isInternal: true, reason: 'jamo-noise' };
  }
  if (PUNCTUATION_NOISE.test(name)) return { isInternal: true, reason: 'punctuation-noise' };
  if (name.length <= 1) return { isInternal: true, reason: 'too-short' };
  return { isInternal: false, reason: null };
}

/**
 * 점수를 신뢰할 수 있는 응시인지. 2025-07-17 이후 Firebase 저장분은 답안 매핑 버그로
 * 전부 SAT 최저점(400 = RW200 + Math200)으로 저장됐다 — 실제 성적이 아니라 '채점 실패'다.
 * 이걸 그대로 보여주면 "400점 받은 학생"으로 읽히므로 화면·집계에서 점수를 빼야 한다.
 */
export function isUnscoredLegacy(r: {
  score: number | null;
  rw_score: number | null;
  math_score: number | null;
}): boolean {
  if (r.score === null) return true;
  return r.score === 400 && r.rw_score === 200 && r.math_score === 200;
}

function toAttempt(
  raw: RawAttempt,
  source: LegacySource,
  firebaseKey: string | null
): NormalizedAttempt {
  const name = (raw.studentName ?? '').trim();
  const { isInternal, reason } = classifyInternal(name);
  return {
    source,
    firebase_key: firebaseKey,
    original_id: (source === 'firebase' ? raw.originalId : raw.id) ?? null,
    code: raw.code ?? null,
    student_name: name,
    student_grade: raw.studentGrade?.trim() || null,
    score: typeof raw.score === 'number' ? raw.score : null,
    rw_score: typeof raw.rwScore === 'number' ? raw.rwScore : null,
    math_score: typeof raw.mathScore === 'number' ? raw.mathScore : null,
    answers: raw.answers ?? null,
    confidence: raw.confidence ?? null,
    taken_at: raw.createdAt ?? null,
    is_internal: isInternal,
    internal_reason: reason,
  };
}

/** RTDB 는 push 키를 가진 객체 맵이라 배열로 편다. */
export function normalizeFirebaseNode(
  node: Record<string, RawAttempt> | null | undefined
): NormalizedAttempt[] {
  if (!node) return [];
  return Object.entries(node).map(([key, raw]) => toAttempt(raw ?? {}, 'firebase', key));
}

export function normalizeLegacyJson(rows: RawAttempt[] | null | undefined): NormalizedAttempt[] {
  return (rows ?? []).map((raw) => toAttempt(raw ?? {}, 'database_json', null));
}

/** Firebase 가 이미 품고 있는 database.json 행을 걷어낸다. Firebase 쪽이 정본이다. */
export function mergeAttempts(
  firebase: NormalizedAttempt[],
  json: NormalizedAttempt[]
): { attempts: NormalizedAttempt[]; droppedDuplicates: number } {
  const migrated = new Set(firebase.map((a) => a.original_id).filter((id): id is string => !!id));
  const kept = json.filter((a) => !(a.original_id && migrated.has(a.original_id)));
  return { attempts: [...firebase, ...kept], droppedDuplicates: json.length - kept.length };
}

/**
 * upsert 페이로드. student_id / match_* 를 일부러 뺀다 —
 * PostgREST 는 페이로드에 있는 컬럼만 DO UPDATE SET 하므로, 재적재해도 수검토 확정이 살아남는다.
 */
export function toUpsertRow(a: NormalizedAttempt): Record<string, unknown> {
  return {
    source: a.source,
    firebase_key: a.firebase_key,
    original_id: a.original_id,
    code: a.code,
    student_name: a.student_name,
    student_grade: a.student_grade,
    score: a.score,
    rw_score: a.rw_score,
    math_score: a.math_score,
    answers: a.answers,
    confidence: a.confidence,
    taken_at: a.taken_at,
    is_internal: a.is_internal,
    internal_reason: a.internal_reason,
    updated_at: new Date().toISOString(),
  };
}
