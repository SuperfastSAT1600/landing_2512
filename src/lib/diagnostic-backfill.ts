/**
 * 진단테스트를 실제로 완료했는데 CRM 퍼널에 반영되지 않은 학생 찾기.
 *
 * 응시 사실은 diagnostic_test_results(submitted_at)에 있는데, CRM 상태
 * students.diagnostic_funnel_stage 는 사람이 드롭다운으로 바꾸는 값이라 서로 어긋난다.
 * 연결 키가 여러 개(결과의 student_id · 토큰 전화번호 · 이름)라 증거가 강한 순서로 본다.
 *
 * 자동 확정은 "한 명으로 좁혀질 때"만 한다. 동명이인·CRM 미등록은 사람에게 넘긴다 —
 * 잘못 붙이면 남의 학생이 진단 완료로 표시되고, 그건 조용히 틀린 채로 남는다.
 */
import { normalizeName } from './legacy-diagnostic-match';

/** 4='Report 전달 필요', 5='Report 전달 완료'. 응시 완료 반영은 5로 맞춘다(운영 합의). */
export const DIAGNOSTIC_DONE_STAGE = 5;
/** 이 단계 미만이면 "응시 사실이 CRM에 반영되지 않은 상태"로 본다. */
export const DIAGNOSTIC_DONE_MIN = 4;

export interface BackfillStudent {
  id: string;
  name: string;
  parent_phone: string | null;
  diagnostic_funnel_stage: number | null;
}

export interface BackfillResult {
  id: string;
  token_id: string | null;
  student_id: string | null;
  student_name: string | null;
  submitted_at: string | null;
  test_id: string | null;
}

export interface BackfillToken {
  id: string;
  student_name: string | null;
  phone_number: string | null;
  student_id?: string | null;
}

export interface StudentMatchIndex {
  byId: Map<string, BackfillStudent>;
  byPhone: Map<string, BackfillStudent[]>;
  byName: Map<string, BackfillStudent[]>;
}

export interface OwnerResolution {
  student_id: string | null;
  how: string;
}

// \b 는 한글에 붙지 않는다(\w가 ASCII 한정) — 공백/문자열 경계로 직접 잡는다.
const OPERATOR_TAG = /(^|\s)(수정|재시험|재응시|재테스트|테스트|\d+차)(?=\s|$)/g;

/** 한국 휴대폰 표기가 제각각이라(하이픈·+82·공백) 숫자만 남겨 비교한다. */
export function normalizePhone(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '').replace(/^82/, '0');
}

/** '손호원 수정', '노우현(2차)' 처럼 운영자가 관리용으로 붙인 꼬리표를 떼어낸다. */
export function stripOperatorTags(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(OPERATOR_TAG, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * '준오' · 'Chris' 처럼 성이 없는 표기. CRM에 같은 표기가 하나뿐이어도
 * 그게 같은 사람이라는 보장이 약하다 — 이름만으로 잡힌 경우 사람에게 넘긴다.
 */
export function isNicknameLike(raw: string): boolean {
  const name = raw.trim();
  if (!name) return false;
  if (/^[가-힣]+$/.test(name)) return name.length <= 2;
  return /^[A-Za-z]+\d*$/.test(name);
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

export function buildStudentMatchIndex(students: BackfillStudent[]): StudentMatchIndex {
  const index: StudentMatchIndex = { byId: new Map(), byPhone: new Map(), byName: new Map() };
  for (const s of students) {
    index.byId.set(s.id, s);
    const phone = normalizePhone(s.parent_phone);
    if (phone.length >= 9) push(index.byPhone, phone, s);
    // 병기명(김연준/Roy Kim)은 양쪽 다 키로 넣는다 — 진단 폼에는 한쪽만 적는다.
    for (const key of [normalizeName(s.name), ...s.name.split(/[/(),|]/).map(normalizeName)]) {
      if (key) push(index.byName, key, s);
    }
  }
  return index;
}

function uniqueByName(index: StudentMatchIndex, name: string): BackfillStudent[] {
  const found = index.byName.get(normalizeName(name)) ?? [];
  return [...new Map(found.map((s) => [s.id, s])).values()];
}

export function resolveResultOwner(
  result: BackfillResult,
  token: BackfillToken | null,
  index: StudentMatchIndex
): OwnerResolution {
  if (result.student_id) return { student_id: result.student_id, how: 'result.student_id' };
  if (token?.student_id) return { student_id: token.student_id, how: 'token.student_id' };

  const phone = normalizePhone(token?.phone_number);
  const byPhone = phone.length >= 9 ? (index.byPhone.get(phone) ?? []) : [];
  if (byPhone.length === 1) return { student_id: byPhone[0].id, how: 'phone' };

  const name = (result.student_name || token?.student_name || '').trim();
  if (!name) return { student_id: null, how: 'no-name' };

  const exact = uniqueByName(index, name);
  if (exact.length === 1) return { student_id: exact[0].id, how: 'name-unique' };
  if (exact.length > 1) return { student_id: null, how: `name-ambiguous(${exact.length})` };

  const stripped = stripOperatorTags(name);
  if (stripped && stripped !== name) {
    const retry = uniqueByName(index, stripped);
    if (retry.length === 1) return { student_id: retry[0].id, how: 'name-stripped' };
    if (retry.length > 1) return { student_id: null, how: `name-ambiguous(${retry.length})` };
  }
  return { student_id: null, how: 'no-candidate' };
}

/** 동명이인처럼 자동 확정이 막힌 경우, 사람이 고를 수 있게 후보를 문자열로 펴 준다. */
function describeCandidates(index: StudentMatchIndex, name: string): string[] {
  if (!name) return [];
  const found = uniqueByName(index, name);
  const pool = found.length ? found : uniqueByName(index, stripOperatorTags(name));
  return pool
    .slice(0, 5)
    .map((s) => `${s.id} | ${s.name} | 현재단계 ${s.diagnostic_funnel_stage ?? '없음'}`);
}

export interface FunnelUpdate {
  student_id: string;
  name: string;
  from: number | null;
  to: number;
  submitted_at: string | null;
  result_id: string;
  how: string;
}

export interface ManualItem {
  result_id: string;
  name: string;
  submitted_at: string | null;
  how: string;
  /** 자동 확정은 안 했지만 사람이 볼 후보 — "id | 이름 | 현재 진단단계" 형식. */
  candidates: string[];
}

export interface BackfillPlan {
  updates: FunnelUpdate[];
  manual: ManualItem[];
  /** 이미 퍼널 4·5로 반영돼 있던 학생 수 */
  alreadyDone: number;
  /** 이름이 빈 제출물(시드/데모) — 사람이 볼 것도 없어 따로 센다 */
  unnamed: number;
}

/**
 * 갱신 계획을 만든다. DB에 쓰지 않는다 — 호출부가 계획을 보고 적용을 결정한다.
 * 같은 학생의 재응시는 최초 응시 한 건으로 접는다(퍼널은 학생당 하나의 상태다).
 *
 * 2025 구 진단은 여기서 다루지 않는다 — 퍼널 5는 'Report 전달 완료'라는 뜻인데
 * 구 진단 응시자에게는 리포트를 보낸 적이 없다. 구 진단 완료 여부는
 * legacy_diagnostic_results 연결로 따로 표시하고, 완료 판정은 isDiagnosticDone()이 묶는다.
 */
export function planFunnelBackfill(
  results: BackfillResult[],
  tokens: BackfillToken[],
  students: BackfillStudent[],
  targetStage: number = DIAGNOSTIC_DONE_STAGE
): BackfillPlan {
  const index = buildStudentMatchIndex(students);
  const tokenById = new Map(tokens.map((t) => [t.id, t]));
  const firstByStudent = new Map<string, { result: BackfillResult; how: string }>();
  const manual: ManualItem[] = [];
  let unnamed = 0;

  for (const r of results) {
    if (!r.submitted_at) continue; // 미제출 = 응시 완료가 아니다
    const token = r.token_id ? (tokenById.get(r.token_id) ?? null) : null;
    const { student_id, how } = resolveResultOwner(r, token, index);

    const name = (r.student_name || token?.student_name || '').trim();

    if (!student_id) {
      if (how === 'no-name') unnamed++;
      else
        manual.push({
          result_id: r.id,
          name,
          submitted_at: r.submitted_at,
          how,
          candidates: describeCandidates(index, name),
        });
      continue;
    }
    // 이름만으로 잡힌 닉네임형은 확정하지 않는다 — 전화·ID 증거가 있으면 위에서 이미 걸린다.
    if (how.startsWith('name-') && isNicknameLike(name)) {
      const cand = index.byId.get(student_id);
      manual.push({
        result_id: r.id,
        name,
        submitted_at: r.submitted_at,
        how: 'name-nickname-review',
        candidates: cand
          ? [`${cand.id} | ${cand.name} | 현재단계 ${cand.diagnostic_funnel_stage ?? '없음'}`]
          : [],
      });
      continue;
    }

    const prev = firstByStudent.get(student_id);
    if (!prev || (r.submitted_at ?? '') < (prev.result.submitted_at ?? '')) {
      firstByStudent.set(student_id, { result: r, how });
    }
  }

  const updates: FunnelUpdate[] = [];
  let alreadyDone = 0;
  for (const [studentId, { result, how }] of firstByStudent) {
    const s = index.byId.get(studentId);
    if (!s) {
      manual.push({
        result_id: result.id,
        name: result.student_name ?? '',
        submitted_at: result.submitted_at,
        how: 'student-missing',
        candidates: [],
      });
      continue;
    }
    if ((s.diagnostic_funnel_stage ?? 0) >= DIAGNOSTIC_DONE_MIN) {
      alreadyDone++;
      continue;
    }
    updates.push({
      student_id: studentId,
      name: s.name,
      from: s.diagnostic_funnel_stage,
      to: targetStage,
      submitted_at: result.submitted_at,
      result_id: result.id,
      how,
    });
  }

  return { updates, manual, alreadyDone, unnamed };
}
