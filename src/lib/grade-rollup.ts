/**
 * 학년도 롤오버 일괄 승급 — 순수 함수(I/O 없음).
 *
 * `students.grade`는 인입 시점에 기록된 뒤 갱신되지 않는다. 인입이 2024-09 ~ 현재로 2년에
 * 걸쳐 있어 지금 학년과 최대 2학년까지 어긋난다. 인입일과 학제로 롤오버 횟수를 계산해 보정한다.
 *
 * 학년 경계가 학제마다 다르다 — 한국 학제는 3월, IB/AP/국제학교는 8월. 이걸 무시하고 8월로
 * 일괄 처리하면 3~7월에 인입된 한국 학제 학생이 한 학년 앞서간다.
 *
 * 표기 형식(`11th` / `Y10` / `고2` / `US10`)은 보존한다. `normalizeGrade()`처럼 `Nth`로 뭉개면
 * 학제 신호가 사라진다. 판정 로직(`gradeLevelOf`)은 네 형식을 모두 읽으므로 보존이 안전하다.
 */

/** 이 날짜 이후 인입은 이미 현 학년도 값이라 대상이 아니다. */
export const SCOPE_CUTOFF = '2026-08-01';

const KOREAN_SCHOOL_TYPE = '한국 학제';

/** 학제별 학년 시작일(내림차순). 인입일이 속한 구간의 인덱스가 곧 롤오버 횟수다. */
const KOREAN_BOUNDARIES = ['2026-03-01', '2025-03-01', '2024-03-01'];
const INTL_BOUNDARIES = ['2026-08-01', '2025-08-01', '2024-08-01'];

export type RollupReason =
  | 'bumped'
  | 'graduated_out'
  | 'no_bump'
  | 'out_of_scope'
  | 'already_graduated'
  | 'unparsable';

export interface RollupResult {
  /** 새 학년 값. null이면 변경하지 않는다. */
  after: string | null;
  reason: RollupReason;
  bump: number;
}

type GradeFormat = 'ord' | 'Y' | 'US' | 'ko';

interface ParsedGrade {
  n: number;
  format: GradeFormat;
  /** `US08`처럼 두 자리 zero-pad 표기였는지. */
  pad: boolean;
}

/** 인입일 기준으로 학년을 몇 단계 올려야 하는지. 대상 범위 밖이면 0. */
export function bumpFor(inquiryDate: string, schoolType: string | null): number {
  const day = (inquiryDate ?? '').slice(0, 10);
  if (!day || day >= SCOPE_CUTOFF) return 0;

  const boundaries = schoolType === KOREAN_SCHOOL_TYPE ? KOREAN_BOUNDARIES : INTL_BOUNDARIES;
  const idx = boundaries.findIndex(b => day >= b);
  return idx === -1 ? boundaries.length : idx;
}

/** 이미 학적 밖(졸업·재수·성인)인지. `gradeLevelOf()`의 판정과 같은 규칙이다. */
function isOutOfSchool(raw: string): boolean {
  return /졸업|재수|성인|gap\s*year|graduat/i.test(raw);
}

function parseGrade(grade: string | null | undefined): ParsedGrade | null {
  // 리드 임포트가 남긴 '[1] ' 접두를 떼지 않으면 앞의 숫자가 학년으로 잡힌다.
  const raw = (grade ?? '').replace(/^\s*\[\d+\]\s*/, '').trim();
  if (!raw || /^[-–—]$/.test(raw) || /미확인|미정|기타/.test(raw)) return null;

  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^(\d{1,2})\s*(?:st|nd|rd|th|학년)$/i))) return mk(+m[1], 'ord', false);
  if ((m = raw.match(/^Y\s*(\d{1,2})$/i))) return mk(+m[1], 'Y', false);
  if ((m = raw.match(/^US\s*(\d{1,2})$/i))) return mk(+m[1], 'US', m[1].length === 2 && m[1][0] === '0');
  if ((m = raw.match(/^고\s*([1-3])$/))) return mk(9 + +m[1], 'ko', false);
  if ((m = raw.match(/^중\s*([1-3])$/))) return mk(6 + +m[1], 'ko', false);
  if ((m = raw.match(/^초\s*([1-6])$/))) return mk(+m[1], 'ko', false);
  return null;
}

function mk(n: number, format: GradeFormat, pad: boolean): ParsedGrade | null {
  return n >= 1 && n <= 13 ? { n, format, pad } : null;
}

function formatGrade(n: number, format: GradeFormat, pad: boolean): string {
  switch (format) {
    case 'Y':
      return `Y${n}`;
    case 'US':
      return `US${pad ? String(n).padStart(2, '0') : n}`;
    case 'ko':
      if (n <= 6) return `초${n}`;
      return n <= 9 ? `중${n - 6}` : `고${n - 9}`;
    default:
      return `${n}${ordinalSuffix(n)}`;
  }
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/**
 * 한 학생의 새 학년을 계산한다. 변경하지 않아야 하면 `after`가 null이고 `reason`이 이유를 담는다.
 */
export function rollupGrade(
  grade: string | null | undefined,
  inquiryDate: string,
  schoolType: string | null
): RollupResult {
  const day = (inquiryDate ?? '').slice(0, 10);
  if (!day || day >= SCOPE_CUTOFF) return { after: null, reason: 'out_of_scope', bump: 0 };

  const raw = (grade ?? '').replace(/^\s*\[\d+\]\s*/, '').trim();
  if (isOutOfSchool(raw)) return { after: null, reason: 'already_graduated', bump: 0 };

  const parsed = parseGrade(grade);
  if (!parsed) return { after: null, reason: 'unparsable', bump: 0 };

  const bump = bumpFor(inquiryDate, schoolType);
  if (bump === 0) return { after: null, reason: 'no_bump', bump: 0 };

  const n = parsed.n + bump;
  if (n > 12) return { after: '졸업', reason: 'graduated_out', bump };
  return { after: formatGrade(n, parsed.format, parsed.pad), reason: 'bumped', bump };
}
