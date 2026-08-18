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
