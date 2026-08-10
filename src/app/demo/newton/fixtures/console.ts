// 통합 콘솔 데모 픽스처.
//
// 목적: SIS·LMS·진학·상담이 하나의 소프트웨어라는 것을 한 화면에서 보여준다.
// 방법: 학생 한 명을 고정해두고 모듈만 바꾼다. 학생 헤더가 그대로 남아 있으면
//       "제품을 옮겨 다니는 게 아니라 같은 기록을 다른 각도로 보는 것"이 눈으로 증명된다.
//
// 학생은 12학년 Doyun Kang — 대학 원서 모듈까지 실제로 채울 수 있는 유일한 학년이다.

import { DEMO_LANG } from '../i18n';

/** AS-IS 도식의 세 갈래와 같은 분류. 사이드바가 몇 개 제품을 대체하는지 보이게 한다. */
export type ModuleGroup = 'SIS' | 'LMS' | 'College' | 'Advising';

export interface ConsoleRow {
  label: string;
  value: string;
  sub?: string;
  /** 다른 모듈에서 자동으로 넘어온 값 — 통합의 실제 증거 */
  from?: ModuleGroup;
}

export interface ConsoleModule {
  key: string;
  label: string;
  group: ModuleGroup;
  rows: ConsoleRow[];
}

const ko = DEMO_LANG === 'ko';
const pick = (k: string, e: string) => (ko ? k : e);

export const CONSOLE_STUDENT = {
  name: 'Doyun Kang',
  meta: pick('12학년 · 12-A반 · 담당 Claire Jung', 'Grade 12 · Homeroom 12-A · Advisor Claire Jung'),
  since: pick('2023년 8월 입학 · 4년차', 'Enrolled Aug 2023 · Year 4'),
};

export const CONSOLE_MODULES: ConsoleModule[] = [
  {
    key: 'records',
    group: 'SIS',
    label: pick('학적', 'Student records'),
    rows: [
      { label: pick('학년 · 반', 'Grade · Homeroom'), value: pick('12학년 · 12-A', 'Grade 12 · 12-A') },
      { label: pick('보호자', 'Guardian'), value: pick('강민호 · 010-2841-****', 'Minho Kang · 010-2841-****') },
      { label: pick('이수 과정', 'Programme'), value: pick('AP 과정 · 5과목', 'AP · 5 subjects') },
      { label: pick('졸업 요건', 'Graduation credits'), value: pick('22 / 24 이수', '22 of 24 earned') },
    ],
  },
  {
    key: 'attendance',
    group: 'SIS',
    label: pick('출결', 'Attendance'),
    rows: [
      { label: pick('이번 학기 결석', 'Absences this term'), value: pick('1일', '1 day') },
      { label: pick('지각', 'Late arrivals'), value: pick('3회', '3 times') },
      { label: pick('최근 결석', 'Most recent absence'), value: '2026-06-11', sub: pick('사유 제출됨', 'Reason on file') },
      { label: pick('출석률', 'Attendance rate'), value: '99.4%' },
    ],
  },
  {
    key: 'grades',
    group: 'SIS',
    label: pick('성적', 'Grades'),
    rows: [
      { label: 'GPA', value: '3.82 / 4.0' },
      { label: 'SAT', value: '1510', sub: 'RW 730 · Math 780' },
      { label: pick('학년말 평균', 'Year-end average'), value: '91%' },
      { label: pick('최고 과목', 'Strongest subject'), value: pick('AP 미적분 · 96%', 'AP Calculus · 96%') },
    ],
  },
  {
    key: 'coursework',
    group: 'LMS',
    label: pick('수업 · 과제', 'Coursework'),
    rows: [
      { label: pick('제출한 과제', 'Assignments submitted'), value: '48 / 50' },
      { label: pick('기한 내 제출', 'On-time rate'), value: '96%' },
      { label: pick('교사 피드백', 'Teacher feedback'), value: pick('31건', '31 entries') },
      { label: pick('진행 중 프로젝트', 'Active project'), value: pick('AP 세미나 연구', 'AP Seminar research') },
    ],
  },
  {
    key: 'applications',
    group: 'College',
    label: pick('대학 원서', 'Applications'),
    rows: [
      { label: pick('지원 대학', 'Colleges on list'), value: '9' },
      { label: pick('제출 완료', 'Submitted'), value: '3' },
      { label: pick('성적증명서', 'Transcript'), value: pick('자동 생성', 'Auto-generated'), from: 'SIS' },
      { label: pick('활동 내역', 'Activities list'), value: pick('과제·동아리에서 구성', 'Built from coursework'), from: 'LMS' },
      { label: pick('카운슬러 추천서', 'Counselor letter'), value: pick('초안 생성됨', 'Draft assembled'), from: 'Advising' },
    ],
  },
  {
    key: 'advising',
    group: 'Advising',
    label: pick('상담 기록', 'Advising notes'),
    rows: [
      { label: pick('누적 기록', 'Notes on file'), value: pick('42건', '42 notes') },
      { label: pick('최근 기록', 'Last note'), value: '2026-08-02' },
      { label: pick('작성자', 'Contributors'), value: pick('4명', '4 staff') },
      { label: pick('AI 업무 제안', 'AI work list'), value: pick('이번 주 3건', '3 tasks this week') },
    ],
  },
];

/**
 * 사이드바 그룹 라벨 — SIS·LMS 같은 업계 약어 대신 실제 기능 언어를 쓴다.
 * 선생님·행정 직원이 약어를 모르고도 무엇을 보는 화면인지 알아야 한다.
 */
export const GROUP_LABEL: Record<ModuleGroup, string> = {
  SIS: pick('학생 정보', 'Student information'),
  LMS: pick('수업 운영', 'Teaching & coursework'),
  College: pick('진학 지원', 'College applications'),
  Advising: pick('상담', 'Advising'),
};

/** 몇 개의 별도 제품을 대체하는지 — 하드코딩하지 않고 모듈에서 집계한다. */
export const groupCount = () => new Set(CONSOLE_MODULES.map(m => m.group)).size;
