import type { DayItem } from '@/types/srm-portal';

// Digital SAT 섹션 도메인 분류
const RW_DOMAINS = new Set(['expression_of_ideas', 'standard_english_conventions', 'information_and_ideas', 'craft_and_structure']);
const MATH_DOMAINS = new Set(['algebra', 'advanced_math', 'problem_solving_and_data_analysis', 'geometry_and_trigonometry']);

export interface TcSectionScore {
  rwRaw: number; rwTotal: number; rwScaled: number | null;
  mathRaw: number; mathTotal: number; mathScaled: number | null;
  total: number | null; // RW+Math scaled (둘 다 있을 때만, 아니면 있는 쪽)
}

// raw 정답수 → scaled(200~800). SRM Growth Report와 같은 앵커 환산표
// (superfastsat app/src/lib/test-center/scale-score.ts). 두 곳이 다른 식을 쓰면 같은 시험 점수가 화면마다 달라진다.
// 만점 문항 수(RW 54 / Math 44) 기준이라, 짧은 시험은 정답률로 그 척도에 투영한다.
const RW_ANCHORS: [number, number][] = [
  [0, 200], [5, 270], [10, 330], [15, 390], [20, 450], [25, 500],
  [30, 550], [33, 580], [36, 610], [39, 640], [42, 670], [45, 700],
  [48, 730], [50, 750], [52, 775], [54, 800],
];
const MATH_ANCHORS: [number, number][] = [
  [0, 200], [4, 260], [8, 320], [12, 380], [16, 440], [20, 500],
  [24, 550], [28, 600], [32, 650], [36, 700], [38, 725], [40, 750],
  [42, 775], [44, 800],
];

function interp(raw: number, anchors: [number, number][]): number {
  if (raw <= anchors[0][0]) return anchors[0][1];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (raw <= x1) return y0 + ((raw - x0) / (x1 - x0)) * (y1 - y0);
  }
  return anchors[anchors.length - 1][1];
}

export function scaleSectionScore(correct: number, total: number, section: 'rw' | 'math'): number {
  const anchors = section === 'rw' ? RW_ANCHORS : MATH_ANCHORS;
  const fullLength = anchors[anchors.length - 1][0];
  const equivalentRaw = total > 0 ? (correct / total) * fullLength : 0;
  return Math.min(800, Math.max(200, Math.round(interp(equivalentRaw, anchors) / 10) * 10));
}

type TcItem = Extract<DayItem, { type: 'test_center' }>;

function sumBySection(item: TcItem) {
  const raw = { rw: { c: 0, t: 0, n: 0 }, math: { c: 0, t: 0, n: 0 } };
  const lessons = item.lessons ?? [];
  if (lessons.length > 0 && lessons.every((l) => l.section)) {
    // 시험 구조의 과목(SRM과 같은 기준)
    for (const l of lessons) { const s = raw[l.section!]; s.c += l.score; s.t += l.total; s.n += 1; }
    return raw;
  }
  // 예전 데이터: skills의 domain으로, 그것도 없으면 모듈 크기(RW 27 / Math 22)로 나눈다
  for (const s of item.skills ?? []) {
    const key = RW_DOMAINS.has(s.domain) ? 'rw' : MATH_DOMAINS.has(s.domain) ? 'math' : null;
    if (key) { raw[key].c += s.correct; raw[key].t += s.total; }
  }
  if (raw.rw.t === 0 && raw.math.t === 0) {
    for (const l of lessons) { const s = raw[l.total >= 25 ? 'rw' : 'math']; s.c += l.score; s.t += l.total; s.n += 1; }
  }
  return raw;
}

// 테스트센터 시험을 과목(RW/Math) raw로 나누고 scaled 점수를 낸다.
// expectedModules가 있으면 그 과목 모듈을 다 풀었을 때만 점수를 낸다(SRM 완결성 규칙).
export function tcSectionScore(item: TcItem): TcSectionScore {
  const raw = sumBySection(item);
  const scaled = (key: 'rw' | 'math'): number | null => {
    const { c, t, n } = raw[key];
    if (!t) return null;
    const expected = item.expectedModules?.[key];
    if (expected != null && n < expected) return null;
    return scaleSectionScore(c, t, key);
  };
  const rwScaled = scaled('rw');
  const mathScaled = scaled('math');
  return {
    rwRaw: raw.rw.c, rwTotal: raw.rw.t, rwScaled,
    mathRaw: raw.math.c, mathTotal: raw.math.t, mathScaled,
    total: rwScaled != null && mathScaled != null ? rwScaled + mathScaled : (rwScaled ?? mathScaled),
  };
}
