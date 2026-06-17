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
}

export interface TestCenterDay {
  type: 'test_center';
  curriculumTitle?: string;
  curriculumDomain?: string;
  lessons: TestCenterLesson[];
  totalScore: number;
  totalProblems: number;
  aiNarrative?: string;
}

export interface DailyReportDay {
  type: 'daily_report';
  reportMd: string;
}

export interface VocaDay {
  type: 'voca';
  totalSessions: number;
  correctCount: number;
  masteredCount: number;
}

export type DayItem = StudyHallDay | TestCenterDay | DailyReportDay | VocaDay;

export interface DayReport {
  date: string;
  items: DayItem[];
}

export interface LearningReport {
  days: DayReport[];
}
