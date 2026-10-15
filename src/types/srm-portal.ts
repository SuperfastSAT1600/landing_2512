export interface StudyHallSkill {
  skill: string;
  domain: string;
  correct: number;
  total: number;
}

export interface StudyHallDay {
  type: 'study_hall';
  durationMinutes: number;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  aiNarrative: string;
  skills?: StudyHallSkill[];
}

export interface TestCenterLesson {
  title?: string;
  /** 시험 구조(chapter 제목)에서 읽은 과목 — SRM과 같은 규칙(/math/i). 예전 데이터엔 없음 */
  section?: 'rw' | 'math';
  score: number;
  total: number;
  skills?: { skill: string; correct: number; total: number }[];
}

export interface TestCenterDay {
  type: 'test_center';
  curriculumTitle?: string;
  curriculumDomain?: string;
  lessons: TestCenterLesson[];
  totalScore: number;
  totalProblems: number;
  aiNarrative?: string;
  skills?: StudyHallSkill[];
  /** 시험의 과목별 모듈 수(보통 RW 2 · Math 2). 다 풀어야 그 과목 점수를 낸다(SRM 규칙) */
  expectedModules?: { rw: number; math: number };
}

export interface DailyReportDay {
  type: 'daily_report';
  reportMd: string;
}

export interface LessonFeedbackDay {
  type: 'lesson_feedback';
  eventId: string;
  startsAt: string;
  coachName?: string;
  feedback: string;
}

export interface VocaDay {
  type: 'voca';
  /** distinct words studied that day */
  wordCount: number;
  /** graded answers that day */
  gradedCount: number;
  correctCount: number;
  /** accuracy %, 0–100 */
  accuracy: number;
  /** words that reached mastery (box 5 / status mastered) that day */
  masteredCount: number;
  /** terms missed that day, for next-day review (capped) */
  missedTerms: string[];
  aiNarrative: string;
}

export type DayItem = StudyHallDay | TestCenterDay | DailyReportDay | VocaDay | LessonFeedbackDay;

export interface DayReport {
  date: string;
  items: DayItem[];
}

export interface LearningReport {
  reportVersion: number;
  days: DayReport[];
  /** distinct vocab words the student has been exposed to (all-time, graded + exposure) */
  vocabExposedCount: number;
}
