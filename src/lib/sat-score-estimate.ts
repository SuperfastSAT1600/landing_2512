import type { DayItem } from '@/types/srm-portal';

// Digital SAT 섹션 도메인 분류
const RW_DOMAINS = new Set(['expression_of_ideas', 'standard_english_conventions', 'information_and_ideas', 'craft_and_structure']);
const MATH_DOMAINS = new Set(['algebra', 'advanced_math', 'problem_solving_and_data_analysis', 'geometry_and_trigonometry']);

export interface TcSectionScore {
  rwRaw: number; rwTotal: number; rwScaled: number | null;
  mathRaw: number; mathTotal: number; mathScaled: number | null;
  total: number | null; // RW+Math scaled (둘 다 있을 때만)
}

// raw 정답수 → scaled(200~800) 근사.
// 주의: 공식 커브가 아닌 표준 Digital SAT 근사식(예상치). 정답 비율에 완만한 곡선 보정.
export function estimateSectionScore(correct: number, total: number): number | null {
  if (!total) return null;
  const x = Math.max(0, Math.min(1, correct / total));
  return Math.round((200 + 600 * Math.pow(x, 0.85)) / 10) * 10;
}

type TcItem = Extract<DayItem, { type: 'test_center' }>;

// 테스트센터 세션을 과목(RW/Math) raw로 분리 + scaled 예상 점수 산출.
// skills의 domain으로 분리(정확), 없으면 lessons 모듈 크기(RW 27 / Math 22)로 폴백.
export function tcSectionScore(item: TcItem): TcSectionScore {
  let rwRaw = 0, rwTotal = 0, mathRaw = 0, mathTotal = 0;
  for (const s of item.skills ?? []) {
    if (RW_DOMAINS.has(s.domain)) { rwRaw += s.correct; rwTotal += s.total; }
    else if (MATH_DOMAINS.has(s.domain)) { mathRaw += s.correct; mathTotal += s.total; }
  }
  if (rwTotal === 0 && mathTotal === 0) {
    for (const l of item.lessons ?? []) {
      if (l.total >= 25) { rwRaw += l.score; rwTotal += l.total; }
      else { mathRaw += l.score; mathTotal += l.total; }
    }
  }
  const rwScaled = estimateSectionScore(rwRaw, rwTotal);
  const mathScaled = estimateSectionScore(mathRaw, mathTotal);
  return {
    rwRaw, rwTotal, rwScaled,
    mathRaw, mathTotal, mathScaled,
    total: rwScaled != null && mathScaled != null ? rwScaled + mathScaled : (rwScaled ?? mathScaled),
  };
}
