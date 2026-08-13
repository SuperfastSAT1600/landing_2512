// 학생 패널 좌측(Learning Data)에 들어가는 학습 데이터 픽스처.
//
import { DEMO_LANG } from '../i18n';

// 중요: 여기 숫자는 notes.ts의 서사와 반드시 일치해야 한다.
// 상담 노트가 말하는 수학 점수 흐름(78 → 86 → 84 → 83 → 84 → 83 → 87 → 88 → 89)이
// 화면의 그래프·목록과 다르면 데모 전체의 신뢰가 깨진다.

export interface Assessment {
  date: string; // YYYY-MM-DD
  title: string;
  score: number; // 0-100
  subject: 'Math' | 'English';
}

/** notes.ts의 note-28이 명시한 연간 수학 점수 궤적과 동일하다. */
export const MATH_ARC = [78, 86, 84, 83, 84, 83, 87, 88, 89];

const ASSESSMENTS_EN: Assessment[] = [
  { date: '2025-09-08', title: 'Algebra II · Unit 1', score: 78, subject: 'Math' },
  { date: '2025-10-06', title: 'Algebra II · Unit 2', score: 86, subject: 'Math' },
  { date: '2025-11-03', title: 'Algebra II · Unit 3', score: 84, subject: 'Math' },
  { date: '2025-12-15', title: 'Algebra II · End of term', score: 83, subject: 'Math' },
  { date: '2026-01-26', title: 'Algebra II · Unit 4', score: 84, subject: 'Math' },
  { date: '2026-03-02', title: 'Algebra II · Unit 5', score: 83, subject: 'Math' },
  { date: '2026-04-06', title: 'Algebra II · Unit 6', score: 87, subject: 'Math' },
  { date: '2026-05-11', title: 'Algebra II · Unit 7', score: 88, subject: 'Math' },
  { date: '2026-06-22', title: 'Algebra II · End of year', score: 89, subject: 'Math' },
];

/** 추이 그래프용 — 개입 방식이 바뀐 시점을 표시해 정체 구간이 눈에 들어오게 한다. */
export interface TrendPoint {
  date: string; // "MM.DD"
  score: number;
  marker?: string;
}

const TREND_EN: TrendPoint[] = [
  { date: '09.08', score: 78, marker: 'Worksheets start' },
  { date: '10.06', score: 86 },
  { date: '11.03', score: 84 },
  { date: '12.15', score: 83 },
  { date: '01.26', score: 84 },
  { date: '03.02', score: 83, marker: 'Journaling start' },
  { date: '04.06', score: 87 },
  { date: '05.11', score: 88 },
  { date: '06.22', score: 89 },
];

const STAT_TILES_EN = [
  { label: 'Advising notes', value: '30', sub: 'over 14 months' },
  { label: 'Last note', value: '7 days ago', sub: '2026-08-03' },
  { label: 'Math average', value: '84.7%', sub: '9 assessments' },
  { label: 'Absences', value: '6', sub: 'all on Mondays' },
  { label: 'Parent replies', value: '9 days', sub: 'avg. since Jan' },
  { label: 'Independent work', value: '1', sub: 'self-initiated paper' },
];

const STAT_TILES_KO = [
  { label: '상담 기록', value: '30건', sub: '14개월간' },
  { label: '최근 기록', value: '7일 전', sub: '2026-08-03' },
  { label: '수학 평균', value: '84.7%', sub: '평가 9회' },
  { label: '결석', value: '6일', sub: '전부 월요일' },
  { label: '학부모 회신', value: '9일', sub: '1월 이후 평균' },
  { label: '자발적 과제', value: '1건', sub: '스스로 시작한 리포트' },
];

export const STAT_TILES = DEMO_LANG === 'ko' ? STAT_TILES_KO : STAT_TILES_EN;

/** 강점 스킬 칩 — 실제 CRM의 초록 칩과 같은 형태. */
const STRENGTH_SKILLS_EN = [
  { name: 'Error analysis & self-diagnosis', pct: 100 },
  { name: 'Data handling in spreadsheets', pct: 95 },
  { name: 'Problem decomposition', pct: 90 },
  { name: 'Argument scaffolding (writing)', pct: 78 },
];

const STRENGTH_SKILLS_KO = [
  { name: '오류 분석·자기 진단', pct: 100 },
  { name: '스프레드시트 데이터 다루기', pct: 95 },
  { name: '문제 분해', pct: 90 },
  { name: '논증 구조 세우기(작문)', pct: 78 },
];

export const STRENGTH_SKILLS = DEMO_LANG === 'ko' ? STRENGTH_SKILLS_KO : STRENGTH_SKILLS_EN;

/** 우측 패널 하단의 접히는 섹션들 — 실제 패널의 결제 히스토리·활동 타임라인 자리. */
const ACTIVITY_EN = [
  { date: '2026-08-03', text: 'Pre-year meeting held with student (advisor only)' },
  { date: '2026-06-22', text: 'End-of-year assessment recorded · 89%' },
  { date: '2026-06-08', text: 'Pre-Calculus placement confirmed for Grade 11' },
  { date: '2026-06-01', text: 'Independent research paper submitted ahead of deadline' },
  { date: '2026-04-13', text: 'Independent study on healthcare pricing approved' },
  { date: '2026-03-23', text: 'Parent conference held (mother only)' },
  { date: '2026-02-23', text: 'Parent conference cancelled by family' },
  { date: '2026-01-12', text: 'Spring term started · first Monday absence' },
];

const ACTIVITY_KO = [
  { date: '2026-08-03', text: '학년 시작 전 학생 단독 면담 진행' },
  { date: '2026-06-22', text: '학년말 평가 기록 · 89%' },
  { date: '2026-06-08', text: '11학년 Pre-Calculus 배치 확정' },
  { date: '2026-06-01', text: '자발적 리서치 리포트 마감 전 제출' },
  { date: '2026-04-13', text: '의료 수가 주제 독립 연구 승인' },
  { date: '2026-03-23', text: '학부모 상담 진행(어머니만 참석)' },
  { date: '2026-02-23', text: '학부모 상담 가정 사정으로 취소' },
  { date: '2026-01-12', text: '봄학기 시작 · 첫 월요일 결석' },
];

export const ACTIVITY = DEMO_LANG === 'ko' ? ACTIVITY_KO : ACTIVITY_EN;

const ASSESSMENTS_KO: Assessment[] = ASSESSMENTS_EN.map(a => ({
  ...a,
  title: a.title
    .replace('Unit', '단원')
    .replace('End of term', '학기말')
    .replace('End of year', '학년말'),
}));

const TREND_KO: TrendPoint[] = TREND_EN.map(pt => ({
  ...pt,
  marker: pt.marker
    ?.replace('Worksheets start', '워크시트 개입 시작')
    .replace('Journaling start', '오류 분석 저널 시작'),
}));

export const ASSESSMENTS = DEMO_LANG === 'ko' ? ASSESSMENTS_KO : ASSESSMENTS_EN;
export const TREND = DEMO_LANG === 'ko' ? TREND_KO : TREND_EN;
