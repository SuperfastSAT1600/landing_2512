export interface StudyHallDay {
  type: 'study_hall';
  durationMinutes: number;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  aiNarrative: string;
}

export interface TestCenterDay {
  type: 'test_center';
  sections: { score: number; total: number }[];
  totalScore: number;
  totalProblems: number;
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
