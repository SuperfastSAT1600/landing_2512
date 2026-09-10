/**
 * 실제 응시 SAT 성적의 계산·검증 규칙 — 순수 함수(I/O 없음).
 * API 라우트와 입력 UI가 같은 규칙을 쓰도록 한 곳에 모은다.
 */

/** SAT 섹션 점수: 200~800의 10점 단위. */
export function isValidSectionScore(score: number): boolean {
  return (
    typeof score === 'number' &&
    Number.isInteger(score) &&
    score >= 200 &&
    score <= 800 &&
    score % 10 === 0
  );
}

/** 시험월: 'YYYY-MM'. <input type="month"> 이 주는 형식. */
export function isValidExamMonth(month: string): boolean {
  return typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/**
 * 총점은 저장하지 않고 매번 합산한다 — 섹션 점수와 어긋난 총점이 쌓이지 않게.
 * 한 섹션만 아는 회차는 총점을 만들지 않는다(750점짜리 시험처럼 보이면 안 된다).
 */
export function examTotal(rw: number | null, math: number | null): number | null {
  if (typeof rw !== 'number' || typeof math !== 'number') return null;
  return rw + math;
}
