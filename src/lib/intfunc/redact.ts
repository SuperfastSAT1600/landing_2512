/**
 * 상담 전사 비식별 (REQ-005).
 *
 * 이 데이터는 외부(IntelligentFunctions)로 나가고, 나가기 전에 로컬 `.parquet`으로
 * 디스크에 떨어진다. 그래서 비식별은 파일에 쓰이기 *전에*, 행을 만드는 그 자리에서
 * 끝나야 한다 — 내보내기 직전에 한 번 훑는 방식이면 원문이 디스크에 남는 창이 생긴다.
 *
 * 순수 함수인 이유도 같다. DB도 파일도 만지지 않으므로 규칙을 테스트로 못박을 수 있고,
 * `buildCorpusRow`가 이 함수를 거치지 않고 전사 문자열을 쓸 방법이 없다.
 */

/** 치환 순서가 규칙이다. 먼저 매칭된 패턴이 뒤 패턴의 입력을 없앤다. */
const PATTERNS: ReadonlyArray<{ re: RegExp; to: string }> = [
  // 이메일이 가장 먼저다. 숫자·기호가 섞여 있어 뒤 패턴들이 조각내면 복구할 수 없다.
  { re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, to: '[이메일]' },
  // 4자리 4묶음 = 카드번호. 휴대폰(010 시작)과 겹치지 않는다.
  { re: /\b\d{4}[- .]\d{4}[- .]\d{4}[- .]\d{4}\b/g, to: '[결제정보]' },
  // 휴대폰. 계좌·카드로 넘어가기 전에 잡아야 11자리 연속 숫자가 결제정보로 오분류되지 않는다.
  { re: /\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b/g, to: '[전화번호]' },
  // 유선전화. 구분자를 필수로 둬서 임의의 숫자 나열을 삼키지 않게 한다.
  { re: /\b0\d{1,2}[- .]\d{3,4}[- .]\d{4}\b/g, to: '[전화번호]' },
  // 남은 긴 숫자 덩어리 = 계좌번호 등. 점수(3~4자리)·금액과 겹치지 않도록 12자리 이상만.
  { re: /\b\d[\d-]{10,}\d\b/g, to: '[결제정보]' },
];

const PARENT_TITLES = '어머니|어머님|아버지|아버님|학부모|모친|부친';

export interface RedactOptions {
  /** `students.name`. 비어 있으면 이름 규칙만 건너뛰고 연락처 규칙은 그대로 돈다. */
  studentName: string;
}

export interface Redacted {
  text: string;
  /** 치환 건수. 내보내기 통계로 올라가 "비식별이 실제로 돌았는가"의 근거가 된다. */
  count: number;
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 전사에 등장할 수 있는 이름 표기들. 긴 것부터 — '김민준'이 '민준'보다 먼저 매칭돼야
 * 성이 남지 않는다.
 */
function nameVariants(studentName: string): string[] {
  const name = studentName.trim();
  if (!name) return [];
  const variants = new Set<string>([name]);
  // 한국식 3자 이상이면 성을 뗀 이름이 본문에 그대로 나온다 ('민준이가', '민준 점수').
  // 2자 이름의 외자는 흔한 음절이라 오탐이 커서 제외한다.
  if (/^[가-힣]{3,}$/.test(name)) variants.add(name.slice(1));
  for (const part of name.split(/\s+/)) if (part.length >= 2) variants.add(part);
  return [...variants].sort((a, b) => b.length - a.length);
}

/**
 * 연락처·결제정보·이름을 가린 전사와 치환 건수를 돌려준다.
 *
 * 학부모 호칭을 이름보다 먼저 처리한다. 순서를 뒤집으면 '민준이 어머니'가
 * '[학생] 어머니'가 되어, 지운 이름이 관계를 통해 되살아난다.
 */
export function redact(transcript: string, options: RedactOptions): Redacted {
  let count = 0;
  const bump = (): string => {
    count += 1;
    return '';
  };

  let text = transcript;
  for (const { re, to } of PATTERNS) {
    text = text.replace(re, () => (bump(), to));
  }

  const variants = nameVariants(options.studentName);
  if (variants.length > 0) {
    const alt = variants.map(escapeRegExp).join('|');
    // '민준이 어머니' → '[학부모]'. 이름+호칭 전체를 하나로 지운다.
    text = text.replace(
      new RegExp(`(?:${alt})(?:이)?\\s*(?:${PARENT_TITLES})`, 'g'),
      () => (bump(), '[학부모]')
    );
    // 남은 이름 단독 표기. '민준이가' → '[학생]가'.
    text = text.replace(new RegExp(`(?:${alt})(?:이)?`, 'g'), () => (bump(), '[학생]'));
  }

  return { text, count };
}
