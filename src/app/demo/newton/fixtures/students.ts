// 통합 콘솔(Screen 1)에 뿌릴 학생 목록 픽스처.
//
// 상담 노트(notes.ts)는 실제 CRM 타입 ConsultationEntry를 그대로 쓰지만, 콘솔 목록은
// SAT 세일즈 전용 필드가 60개 붙은 Student 대신 학교 운영에 필요한 필드만 추린 뷰 모델을 쓴다.
// 실제 도입 시에는 학교 스키마의 students 뷰가 이 자리를 대체한다.

import { DEMO_STUDENT_ID } from './notes';
import { DEMO_LANG } from '../i18n';

// 확인 필요 사유는 제품 화면에 노출되므로 언어를 따른다.
const REASON = {
  mondayAbsences: DEMO_LANG === 'ko' ? '결석 6일이 전부 월요일' : 'All 6 absences fell on a Monday',
  gap3w: DEMO_LANG === 'ko' ? '상담 기록 3주 공백' : 'No advising note for 3 weeks',
  gap7w: DEMO_LANG === 'ko' ? '상담 기록 7주 공백' : 'No advising note for 7 weeks',
  onLeave: DEMO_LANG === 'ko' ? '휴학 3개월, 복귀 계획 미정' : 'On leave 3 months, no return plan',
} as const;

export type EnrollmentStatus = 'Enrolled' | 'Applicant' | 'On leave';

export interface DemoStudent {
  id: string;
  name: string;
  grade: string;
  homeroom: string;
  advisor: string;
  status: EnrollmentStatus;
  /** 누적 상담 노트 수 */
  noteCount: number;
  /** 마지막 노트 날짜 (YYYY-MM-DD) */
  lastNote: string;
  /** 이번 학기 결석 일수 */
  absences: number;
  /** 운영자가 눈으로 짚어야 할 상태 — 화면에서 점으로 표시 */
  flag?: 'watch' | 'attention';
  /** 왜 확인이 필요한지. 색 점만으로는 신규 담당자가 판단할 수 없다. */
  flagReason?: string;
}

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: DEMO_STUDENT_ID,
    name: 'Seojun Park',
    grade: 'Grade 11',
    homeroom: '11-B',
    advisor: 'Daniel Cho',
    status: 'Enrolled',
    noteCount: 30,
    lastNote: '2026-08-03',
    absences: 6,
    flag: 'attention',
    flagReason: REASON.mondayAbsences,
  },
  { id: 'st-02', name: 'Yuna Seo', grade: 'Grade 10', homeroom: '10-A', advisor: 'Daniel Cho', status: 'Enrolled', noteCount: 18, lastNote: '2026-07-28', absences: 1 },
  { id: 'st-03', name: 'Minseo Jang', grade: 'Grade 11', homeroom: '11-A', advisor: 'Grace Han', status: 'Enrolled', noteCount: 24, lastNote: '2026-08-01', absences: 0 },
  { id: 'st-04', name: 'Jiho Lim', grade: 'Grade 9', homeroom: '9-B', advisor: 'Ms. Bennett', status: 'Enrolled', noteCount: 9, lastNote: '2026-07-15', absences: 3, flag: 'watch', flagReason: REASON.gap3w },
  { id: 'st-05', name: 'Haeun Cho', grade: 'Grade 11', homeroom: '11-B', advisor: 'Daniel Cho', status: 'Enrolled', noteCount: 31, lastNote: '2026-07-30', absences: 2 },
  { id: 'st-06', name: 'Doyun Kang', grade: 'Grade 12', homeroom: '12-A', advisor: 'Claire Jung', status: 'Enrolled', noteCount: 42, lastNote: '2026-08-02', absences: 1 },
  { id: 'st-07', name: 'Sooah Yoon', grade: 'Grade 9', homeroom: '9-A', advisor: 'Grace Han', status: 'Enrolled', noteCount: 7, lastNote: '2026-06-19', absences: 5, flag: 'watch', flagReason: REASON.gap7w },
  { id: 'st-08', name: 'Taemin Bae', grade: 'Grade 12', homeroom: '12-B', advisor: 'Claire Jung', status: 'Enrolled', noteCount: 38, lastNote: '2026-07-31', absences: 0 },
  { id: 'st-09', name: 'Nara Hong', grade: 'Grade 10', homeroom: '10-A', advisor: 'Ms. Bennett', status: 'Applicant', noteCount: 3, lastNote: '2026-07-22', absences: 0 },
  { id: 'st-10', name: 'Eunwoo Shin', grade: 'Grade 11', homeroom: '11-A', advisor: 'Grace Han', status: 'On leave', noteCount: 15, lastNote: '2026-05-09', absences: 12, flag: 'attention', flagReason: REASON.onLeave },
];

/** 콘솔 상단 요약 타일 — 목록에서 파생해 하드코딩 불일치를 막는다. */
export const consoleStats = () => {
  const enrolled = DEMO_STUDENTS.filter(s => s.status === 'Enrolled').length;
  const notes = DEMO_STUDENTS.reduce((sum, s) => sum + s.noteCount, 0);
  const flagged = DEMO_STUDENTS.filter(s => s.flag).length;
  return { enrolled, notes, flagged, total: DEMO_STUDENTS.length };
};
