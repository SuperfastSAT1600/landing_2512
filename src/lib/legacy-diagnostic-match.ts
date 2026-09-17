/**
 * 레거시 진단테스트 응시 기록 ↔ CRM students 매칭.
 *
 * 옛 폼이 이름과 학년만 받았기 때문에(전화·이메일 미수집) 확실한 키가 없다.
 * 그래서 "자동으로 확정할 수 있는 것만 확정하고 나머지는 사람에게 넘긴다"는 방침이다.
 * 애매한 걸 억지로 붙이면 전환율이 조용히 틀어지므로, 미확정을 남기는 쪽이 항상 옳다.
 */

import { romanizationsOf } from './korean-romanization';

export interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  inquiry_date: string | null;
}

export interface AttemptForMatch {
  id: string;
  student_name: string;
  student_grade: string | null;
  taken_at: string | null;
}

export interface MatchOutcome {
  student_id: string | null;
  match_method: 'auto_exact' | 'auto_grade_window' | null;
  match_confidence: 'high' | 'medium' | null;
  match_note: string;
  candidates: StudentRow[];
}

/** 응시일과 문의일이 이보다 벌어지면 동명이인 판정에서 같은 사람으로 보지 않는다. */
export const MATCH_WINDOW_DAYS = 60;
const DAY_MS = 86_400_000;
/** 병기명 구분자: 김연준/Roy Kim, 김연준(Roy), 김연준,Roy */
const NAME_SPLIT = /[/(),|]/;

export function normalizeName(raw: string | null | undefined): string {
  return (raw ?? '')
    .normalize('NFC')
    .replace(/[\s.·,\-_'"]+/g, '')
    .toLowerCase();
}

export function nameKeys(raw: string | null | undefined): string[] {
  const parts = (raw ?? '').split(NAME_SPLIT).map(normalizeName).filter(Boolean);
  return [...new Set(parts)];
}

/** 'US12' · '12th' · 'Grade 11' · '고1' → 숫자 문자열. 표기 체계가 소스마다 달라 숫자만 본다. */
export function normalizeGrade(raw: string | null | undefined): string | null {
  const m = (raw ?? '').match(/\d+/);
  return m ? String(Number(m[0])) : null;
}

export function buildStudentIndex(students: StudentRow[]): Map<string, StudentRow[]> {
  const index = new Map<string, StudentRow[]>();
  for (const s of students) {
    for (const key of nameKeys(s.name)) {
      const bucket = index.get(key);
      if (bucket) bucket.push(s);
      else index.set(key, [s]);
    }
  }
  // 로마자 대조용: 한글 이름 학생의 표기 변형을 전부 같은 인덱스에 얹는다.
  // 응시자가 영문으로 적은 이름(Jinseo Chung)을 CRM 한글명(정진서)과 잇기 위한 것이다.
  for (const s of students) {
    for (const part of s.name.split(NAME_SPLIT)) {
      for (const roman of romanizationsOf(part.trim())) {
        const bucket = index.get(roman);
        if (bucket) {
          if (!bucket.includes(s)) bucket.push(s);
        } else index.set(roman, [s]);
      }
    }
  }
  return index;
}

function withinWindow(takenAt: string | null, inquiryDate: string | null): boolean {
  if (!takenAt || !inquiryDate) return false;
  const a = Date.parse(takenAt);
  const b = Date.parse(inquiryDate);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) <= MATCH_WINDOW_DAYS * DAY_MS;
}

export function matchAttempt(
  attempt: AttemptForMatch,
  index: Map<string, StudentRow[]>
): MatchOutcome {
  const byId = new Map<string, StudentRow>();
  for (const key of nameKeys(attempt.student_name)) {
    for (const s of index.get(key) ?? []) byId.set(s.id, s);
  }
  const candidates = [...byId.values()];

  if (candidates.length === 0) {
    return {
      student_id: null,
      match_method: null,
      match_confidence: null,
      match_note: '후보 없음',
      candidates,
    };
  }

  const attemptGrade = normalizeGrade(attempt.student_grade);

  if (candidates.length === 1) {
    const only = candidates[0];
    const gradeOf = normalizeGrade(only.grade);
    const conflict = !!attemptGrade && !!gradeOf && attemptGrade !== gradeOf;
    // 응시일이 CRM 문의일과 가까우면 학년 표기가 어긋나도 동일인으로 본다.
    // CRM grade 는 진급 시 갱신되지 않아 값이 있어도 신뢰할 수 없는 반면,
    // "문의 며칠 뒤 진단을 봤다"는 실제 운영 흐름이라 날짜 근접이 더 강한 증거다.
    const nearInquiry = withinWindow(attempt.taken_at, only.inquiry_date);
    const confident = !conflict || nearInquiry;
    // 문자 그대로 일치했는지, 로마자 표기를 펴서 붙었는지 구분해 남긴다
    // (Jinseo Chung ↔ 정진서). 근거를 적어두지 않으면 나중에 되짚을 수 없다.
    const literal = nameKeys(attempt.student_name).some((k) => nameKeys(only.name).includes(k));
    const how = literal ? '이름 유일 일치' : `로마자 표기 대조(${only.name})`;
    return {
      student_id: only.id,
      match_method: 'auto_exact',
      match_confidence: confident ? 'high' : 'medium',
      match_note: conflict
        ? nearInquiry
          ? `${how} · 응시일 근접(문의 ±${MATCH_WINDOW_DAYS}일) · 학년 표기 차이(${attempt.student_grade} vs ${only.grade})`
          : `${how} · 학년 불일치(${attempt.student_grade} ≠ ${only.grade})`
        : how,
      candidates,
    };
  }

  // 동명이인은 먼저 응시일로 가른다 — CRM 학년은 갱신되지 않아 신뢰할 수 없고,
  // "문의 며칠 뒤 진단을 봤다"가 실제 운영 흐름이라 날짜가 훨씬 강한 증거다.
  const inWindow = candidates.filter((c) => withinWindow(attempt.taken_at, c.inquiry_date));

  if (inWindow.length === 1) {
    return {
      student_id: inWindow[0].id,
      match_method: 'auto_grade_window',
      match_confidence: 'medium',
      match_note: `동명이인 ${candidates.length}명 중 응시일 ±${MATCH_WINDOW_DAYS}일로 1명 확정`,
      candidates,
    };
  }

  // 창 안에 여럿이면 그때 학년을 보조 근거로 쓴다.
  const narrowed = inWindow.filter((c) => attemptGrade && normalizeGrade(c.grade) === attemptGrade);

  if (narrowed.length === 1) {
    return {
      student_id: narrowed[0].id,
      match_method: 'auto_grade_window',
      match_confidence: 'medium',
      match_note: `동명이인 ${candidates.length}명 중 응시일+학년으로 1명 확정`,
      candidates,
    };
  }

  return {
    student_id: null,
    match_method: null,
    match_confidence: null,
    match_note: `동명이인 ${candidates.length}명 — 자동 확정 불가(응시일 창 ${inWindow.length}명 / 학년까지 ${narrowed.length}명)`,
    candidates,
  };
}

export interface ReviewRow {
  record_id: string;
  student_name: string;
  grade: string;
  taken_at: string;
  score: string;
  suggested_student_id: string;
  match_method: string;
  match_confidence: string;
  note: string;
  candidate_1: string;
  candidate_2: string;
  candidate_3: string;
  candidate_4: string;
  candidate_5: string;
  confirm_student_id: string;
  confirm_is_internal: string;
  confirm_no_match: string;
}

const MAX_CANDIDATES = 5;

function describeCandidate(c: StudentRow | undefined): string {
  return c
    ? `${c.id} | ${c.name} | ${c.grade ?? '-'} | ${(c.inquiry_date ?? '-').slice(0, 10)}`
    : '';
}

/** 사람이 열어 보고 confirm_* 두 열만 채워 돌려주는 시트. */
export function buildReviewRows(
  items: Array<{ attempt: AttemptForMatch; score: number | null; outcome: MatchOutcome }>
): ReviewRow[] {
  return items.map(({ attempt, score, outcome }) => {
    const c = outcome.candidates;
    return {
      record_id: attempt.id,
      student_name: attempt.student_name,
      grade: attempt.student_grade ?? '',
      taken_at: (attempt.taken_at ?? '').slice(0, 10),
      score: score === null ? '' : String(score),
      suggested_student_id: outcome.student_id ?? '',
      match_method: outcome.match_method ?? '',
      match_confidence: outcome.match_confidence ?? '',
      note: outcome.match_note,
      candidate_1: describeCandidate(c[0]),
      candidate_2: describeCandidate(c[1]),
      candidate_3: describeCandidate(c[2]),
      candidate_4: describeCandidate(c[3]),
      candidate_5: describeCandidate(c[MAX_CANDIDATES - 1]),
      confirm_student_id: '',
      confirm_is_internal: '',
      confirm_no_match: '',
    };
  });
}

export interface ManualMatch {
  record_id: string;
  student_id: string | null;
  is_internal: boolean;
  /** 사람이 보고 "CRM의 그 사람이 아니다"라고 판정한 건. 다시 묻지 않기 위해 남긴다. */
  no_match?: boolean;
}

const TRUTHY = new Set(['y', 'yes', 'true', '1', 'o', 'ㅇ']);

/**
 * 되돌아온 시트를 검증한다. 같은 학생에 여러 응시가 붙는 것은 재응시라 정상이고,
 * 같은 응시(record_id)가 두 줄로 나오는 것만 사람 실수라 막는다.
 */
export function validateManualMatches(
  rows: Array<{
    record_id?: string;
    confirm_student_id?: string;
    confirm_is_internal?: string;
    confirm_no_match?: string;
  }>,
  validStudentIds: Set<string>
): { updates: ManualMatch[]; errors: string[] } {
  const updates: ManualMatch[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const recordId = (row.record_id ?? '').trim();
    const studentId = (row.confirm_student_id ?? '').trim();
    const internal = TRUTHY.has((row.confirm_is_internal ?? '').trim().toLowerCase());
    const noMatch = TRUTHY.has((row.confirm_no_match ?? '').trim().toLowerCase());
    if (!studentId && !internal && !noMatch) continue;

    if (!recordId) {
      errors.push(`record_id 없는 행 무시: student_id=${studentId || '-'}`);
      continue;
    }
    if (seen.has(recordId)) {
      errors.push(`record_id 중복: ${recordId}`);
      continue;
    }
    if (studentId && noMatch) {
      errors.push(`모순된 입력 — student_id 와 "동일인 아님"을 함께 표시함 (record ${recordId})`);
      continue;
    }
    if (studentId && !validStudentIds.has(studentId)) {
      errors.push(`존재하지 않는 student_id: ${studentId} (record ${recordId})`);
      continue;
    }
    seen.add(recordId);
    updates.push({
      record_id: recordId,
      student_id: studentId || null,
      is_internal: internal,
      ...(noMatch ? { no_match: true } : {}),
    });
  }

  return { updates, errors };
}
