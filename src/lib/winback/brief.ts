/**
 * 상품 브리프 파싱 — 윈백 플레이는 상품 마스터 없이 매번 자유 텍스트로 상품을 정의한다.
 * 그 자유 텍스트에서 추천에 쓸 신호(과목군·과목·대상 학년·시험월·가격·시간)를 뽑는다.
 *
 * 원칙: 없는 정보를 추측하지 않는다(null/빈 배열). 위저드에서 구조화 입력이 들어오면
 * 자유 텍스트 파싱보다 우선한다.
 */
import { AP_SUBJECTS } from '@/lib/enrollment/data/pricing';

export type WinbackSubjectKind = 'AP' | 'SAT' | '기타';

export interface ParsedBrief {
  subjectKind: WinbackSubjectKind;
  /** 소문자 과목 토큰(예: ['calculus']). 캠페인 태그·상담 메모 매칭에 쓴다. */
  subjectTokens: string[];
  grades: number[];
  examMonth: number | null;
  price: number | null;
  hours: number | null;
}

export interface BriefInput {
  brief: string;
  product_category?: string | null;
  target_exam_date?: string | null;
  product_price?: number | null;
  product_hours?: number | null;
}

const MIN_GRADE = 5;
const MAX_GRADE = 12;
const MIN_TOKEN_LEN = 3;
// AP_SUBJECTS 이름에서 과목 토큰을 만들 때 버리는 일반 단어.
const TOKEN_STOPWORDS = new Set(['and', 'the', 'of', 'science', 'language', 'government', 'politics']);

/** AP 과목명 목록에서 매칭용 소문자 토큰 사전을 만든다(예: 'Calculus AB / BC' → calculus). */
const AP_SUBJECT_TOKENS: string[] = [
  ...new Set(
    AP_SUBJECTS.flatMap((name) =>
      name
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((t) => t.length >= MIN_TOKEN_LEN && !TOKEN_STOPWORDS.has(t))
    )
  ),
];

function detectSubjectKind(input: BriefInput): WinbackSubjectKind {
  const source = `${input.product_category ?? ''} ${input.brief}`;
  if (/\bAP\b/i.test(input.product_category ?? '')) return 'AP';
  if (/\bSAT\b/i.test(input.product_category ?? '')) return 'SAT';
  if (/\bAP\b/i.test(source)) return 'AP';
  if (/\bSAT\b/i.test(source)) return 'SAT';
  return '기타';
}

function detectSubjectTokens(brief: string): string[] {
  const lower = brief.toLowerCase();
  return AP_SUBJECT_TOKENS.filter((token) => new RegExp(`\\b${token}\\b`).test(lower));
}

/** "8~11학년", "9-11학년", "10학년, 11학년"을 모두 학년 배열로 정규화. */
function detectGrades(brief: string): number[] {
  const grades = new Set<number>();

  for (const m of brief.matchAll(/(\d{1,2})\s*(?:~|-|–|부터)\s*(\d{1,2})\s*학년/g)) {
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (from <= to) for (let g = from; g <= to; g++) grades.add(g);
  }
  if (grades.size === 0) {
    for (const m of brief.matchAll(/(\d{1,2})\s*학년/g)) grades.add(Number(m[1]));
  }

  return [...grades].filter((g) => g >= MIN_GRADE && g <= MAX_GRADE).sort((a, b) => a - b);
}

function detectExamMonth(input: BriefInput): number | null {
  if (input.target_exam_date) {
    const month = Number(input.target_exam_date.slice(5, 7));
    if (month >= 1 && month <= 12) return month;
  }
  const m = input.brief.match(/(\d{1,2})\s*월/);
  if (!m) return null;
  const month = Number(m[1]);
  return month >= 1 && month <= 12 ? month : null;
}

function detectPrice(input: BriefInput): number | null {
  if (input.product_price != null) return input.product_price;

  const manwon = input.brief.match(/([\d,]+)\s*만\s*원/);
  if (manwon) return Number(manwon[1].replace(/,/g, '')) * 10_000;

  const won = input.brief.match(/([\d,]+)\s*원/);
  if (won) return Number(won[1].replace(/,/g, ''));

  return null;
}

function detectHours(input: BriefInput): number | null {
  if (input.product_hours != null) return input.product_hours;
  const m = input.brief.match(/(\d{1,3})\s*시간/);
  return m ? Number(m[1]) : null;
}

export function parseBrief(input: BriefInput): ParsedBrief {
  return {
    subjectKind: detectSubjectKind(input),
    subjectTokens: detectSubjectTokens(input.brief),
    grades: detectGrades(input.brief),
    examMonth: detectExamMonth(input),
    price: detectPrice(input),
    hours: detectHours(input),
  };
}

/**
 * 임베딩 쿼리 텍스트. 브리프 원문에 파생 신호를 덧붙여 학생 프로필 임베딩과 결이 맞게 만든다
 * (학생 임베딩도 `학년:`/`관심/캠페인:` 같은 라벨 줄로 구성됨 — buildEmbeddingText 참조).
 * 같은 입력이면 같은 문자열이어야 한다(재현성).
 */
export function buildBriefQueryText(brief: string, parsed: ParsedBrief): string {
  const lines = [`[상품 브리프]`, brief.trim(), ''];

  lines.push(`과목군: ${parsed.subjectKind}`);
  if (parsed.subjectTokens.length > 0) lines.push(`과목: ${parsed.subjectTokens.join(', ')}`);
  if (parsed.grades.length > 0) lines.push(`대상 학년: ${parsed.grades.join(', ')}`);
  if (parsed.examMonth) lines.push(`목표 시험월: ${parsed.examMonth}월`);
  if (parsed.hours) lines.push(`수업 시간: ${parsed.hours}시간`);
  if (parsed.price) lines.push(`가격: ${parsed.price}원`);

  return lines.join('\n');
}
