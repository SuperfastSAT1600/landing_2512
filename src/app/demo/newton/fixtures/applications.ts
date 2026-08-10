// 미국 대학 원서 관리(College Applications) 데모 픽스처.
//
// 학생은 콘솔 목록의 Doyun Kang(Grade 12)을 쓴다. Screen 2의 Seojun(Grade 10)과 다른 학생을 써서
// 콘솔이 한 명짜리 목업이 아니라는 것도 같이 보여준다.
//
// 핵심: 각 준비물이 '어디서 자동으로 채워졌는지'(source)를 달고 있다.
// 이게 SIS·LMS·대학진학이 한 시스템일 때만 가능한 부분이고, 이 화면의 논지다.

import { DEMO_LANG } from '../i18n';

export type Round = 'ED I' | 'ED II' | 'EA' | 'RD';
export type AppStatus = 'Submitted' | 'In progress' | 'Not started';

/** 준비물이 어느 모듈에서 자동으로 채워지는지 — 화면에 출처 칩으로 표시된다. */
export type Source = 'SIS' | 'LMS' | 'Advising' | 'Manual';

export interface Requirement {
  name: string;
  done: boolean;
  source: Source;
  note?: string;
}

export interface Application {
  id: string;
  college: string;
  round: Round;
  deadline: string; // YYYY-MM-DD
  status: AppStatus;
  requirements: Requirement[];
}

export const APPLICANT = {
  name: 'Doyun Kang',
  grade: DEMO_LANG === 'ko' ? '12학년' : 'Grade 12',
  homeroom: '12-A',
  advisor: 'Claire Jung',
  classOf: DEMO_LANG === 'ko' ? '2027년 졸업예정' : 'Class of 2027',
  gpa: '3.82 / 4.0',
  sat: '1510 (RW 730 · Math 780)',
};

// 준비물 문구는 언어별로 갈린다. 항목 순서·출처·완료 여부는 동일하게 유지한다.
const REQ_TEXT = {
  en: {
    form: ['Common App form', undefined],
    transcript: ['Official transcript', 'Pulled from academic records — no re-entry'],
    profile: ['School profile & course rigor', 'Generated from the course catalog'],
    counselor: ['Counselor recommendation', 'Draft assembled from 42 advising notes'],
    teacher: ['Teacher recommendation × 2', 'Requested to teachers who graded his coursework'],
    activities: ['Activities & honors list', 'Built from coursework, clubs and submitted projects'],
    sat: ['SAT score report', undefined],
    essays: ['Supplemental essays', undefined],
  },
  ko: {
    form: ['Common App 원서', undefined],
    transcript: ['공식 성적증명서', '학적 기록에서 자동 생성 — 재입력 없음'],
    profile: ['학교 프로필·이수 과목 수준', '교육과정 정보에서 자동 생성'],
    counselor: ['카운슬러 추천서', '상담 기록 42건에서 초안 자동 작성'],
    teacher: ['교사 추천서 × 2', '실제 채점한 담당 교사에게 요청 발송'],
    activities: ['활동·수상 내역', '수업·동아리·제출 과제에서 자동 구성'],
    sat: ['SAT 성적 리포트', undefined],
    essays: ['대학별 에세이', undefined],
  },
} as const;

const R = REQ_TEXT[DEMO_LANG];

const common = (overrides: Partial<Record<string, boolean>> = {}): Requirement[] => [
  { name: R.form[0], done: overrides.form ?? true, source: 'Manual' },
  { name: R.transcript[0], done: overrides.transcript ?? true, source: 'SIS', note: R.transcript[1] },
  { name: R.profile[0], done: overrides.profile ?? true, source: 'SIS', note: R.profile[1] },
  { name: R.counselor[0], done: overrides.counselor ?? false, source: 'Advising', note: R.counselor[1] },
  { name: R.teacher[0], done: overrides.teacher ?? false, source: 'LMS', note: R.teacher[1] },
  { name: R.activities[0], done: overrides.activities ?? true, source: 'LMS', note: R.activities[1] },
  { name: R.sat[0], done: overrides.sat ?? true, source: 'SIS' },
  { name: R.essays[0], done: overrides.essays ?? false, source: 'Manual' },
];

export const APPLICATIONS: Application[] = [
  {
    id: 'jhu',
    college: 'Johns Hopkins University',
    round: 'ED I',
    deadline: '2026-11-01',
    status: 'In progress',
    requirements: common({ counselor: true, teacher: true, essays: false }),
  },
  {
    id: 'umich',
    college: 'University of Michigan',
    round: 'EA',
    deadline: '2026-11-01',
    status: 'In progress',
    requirements: common({ counselor: true, essays: false }),
  },
  {
    id: 'purdue',
    college: 'Purdue University',
    round: 'EA',
    deadline: '2026-11-01',
    status: 'Submitted',
    requirements: common({ counselor: true, teacher: true, essays: true }),
  },
  {
    id: 'uw',
    college: 'University of Washington',
    round: 'RD',
    deadline: '2026-11-15',
    status: 'Submitted',
    requirements: common({ counselor: true, teacher: true, essays: true }),
  },
  {
    id: 'ucb',
    college: 'UC Berkeley',
    round: 'RD',
    deadline: '2026-11-30',
    status: 'In progress',
    requirements: common({ counselor: false, teacher: false, essays: false }),
  },
  {
    id: 'ucla',
    college: 'UCLA',
    round: 'RD',
    deadline: '2026-11-30',
    status: 'Submitted',
    requirements: common({ counselor: true, teacher: true, essays: true }),
  },
  {
    id: 'emory',
    college: 'Emory University',
    round: 'ED II',
    deadline: '2027-01-01',
    status: 'Not started',
    requirements: common({ counselor: false, teacher: false, essays: false, activities: true }),
  },
  {
    id: 'bu',
    college: 'Boston University',
    round: 'RD',
    deadline: '2027-01-04',
    status: 'Not started',
    requirements: common({ counselor: false, teacher: false, essays: false }),
  },
  {
    id: 'nyu',
    college: 'New York University',
    round: 'RD',
    deadline: '2027-01-05',
    status: 'Not started',
    requirements: common({ counselor: false, teacher: false, essays: false }),
  },
];

/** 오늘 기준 D-day. 화면에서 '다음 마감'을 계산할 때 쓴다. 기준일은 호출부에서 주입한다. */
export function daysUntil(deadline: string, todayMs: number): number {
  return Math.ceil((new Date(`${deadline}T00:00:00Z`).getTime() - todayMs) / 86400000);
}

/** 자동으로 채워진 준비물 수 / 전체 — '재입력이 사라진다'는 주장을 숫자로 보여준다. */
export function autofillStats() {
  let auto = 0;
  let total = 0;
  for (const app of APPLICATIONS) {
    for (const r of app.requirements) {
      total += 1;
      if (r.source !== 'Manual') auto += 1;
    }
  }
  return { auto, total };
}

/**
 * 모듈별 기여 건수 — 어느 시스템이 원서 준비물을 얼마나 자동으로 채웠는지.
 * 하드코딩 대신 픽스처에서 집계해, 준비물을 고쳐도 숫자가 어긋나지 않게 한다.
 */
export const SOURCE_ORDER: Source[] = ['SIS', 'LMS', 'Advising', 'Manual'];

export function sourceBreakdown(): { source: Source; count: number }[] {
  const map = new Map<Source, number>(SOURCE_ORDER.map(s => [s, 0]));
  for (const app of APPLICATIONS) {
    for (const r of app.requirements) map.set(r.source, (map.get(r.source) ?? 0) + 1);
  }
  return SOURCE_ORDER.map(source => ({ source, count: map.get(source) ?? 0 }));
}
