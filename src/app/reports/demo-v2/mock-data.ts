import type { ReportData } from '@/lib/report-data';
import { classifyRWStudent } from '@/lib/rw-profile';
import { SECTION_BENCHMARKS, DOMAIN_BENCHMARKS } from '@/lib/report-benchmarks';

// ── RW cognition: 27 questions ────────────────────────────────────────────
// sniper: 10, doubt: 5, hasty: 3, avoider: 9

const RW_DOMAINS = [
  { domain: 'Craft and Structure', skill: 'Words in Context' },
  { domain: 'Craft and Structure', skill: 'Text Structure and Purpose' },
  { domain: 'Craft and Structure', skill: 'Cross-Text Connections' },
  { domain: 'Information and Ideas', skill: 'Central Ideas and Details' },
  { domain: 'Information and Ideas', skill: 'Command of Evidence' },
  { domain: 'Information and Ideas', skill: 'Inferences' },
  { domain: 'Standard English Conventions', skill: 'Boundaries' },
  { domain: 'Standard English Conventions', skill: 'Form, Structure, and Sense' },
  { domain: 'Expression of Ideas', skill: 'Rhetorical Synthesis' },
  { domain: 'Expression of Ideas', skill: 'Transitions' },
];

const DIFFS = ['Easy', 'Medium', 'Hard'] as const;

// prettier-ignore
export const MOCK_RW_COGNITION = [
  // sniper (10) — 정답 선택 + confidence 75% 이상
  { questionId: 'rw-01', questionNumber: 1,  ...RW_DOMAINS[0], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-02', questionNumber: 2,  ...RW_DOMAINS[3], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-03', questionNumber: 3,  ...RW_DOMAINS[6], difficulty: 'Medium', optionsViewedCount: 1, confidence: 75,  isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-04', questionNumber: 4,  ...RW_DOMAINS[1], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-05', questionNumber: 5,  ...RW_DOMAINS[4], difficulty: 'Medium', optionsViewedCount: 2, confidence: 75,  isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-06', questionNumber: 6,  ...RW_DOMAINS[7], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-07', questionNumber: 7,  ...RW_DOMAINS[3], difficulty: 'Medium', optionsViewedCount: 1, confidence: 75,  isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-08', questionNumber: 8,  ...RW_DOMAINS[8], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-09', questionNumber: 9,  ...RW_DOMAINS[0], difficulty: 'Medium', optionsViewedCount: 2, confidence: 75,  isCorrect: true,  questionType: 'sniper'  },
  { questionId: 'rw-10', questionNumber: 10, ...RW_DOMAINS[9], difficulty: 'Easy',   optionsViewedCount: 1, confidence: 100, isCorrect: true,  questionType: 'sniper'  },
  // doubt (5) — 정답 선택 + confidence 50% 이하
  { questionId: 'rw-11', questionNumber: 11, ...RW_DOMAINS[2], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 25,  isCorrect: true,  questionType: 'doubt'   },
  { questionId: 'rw-12', questionNumber: 12, ...RW_DOMAINS[5], difficulty: 'Medium', optionsViewedCount: 2, confidence: 50,  isCorrect: true,  questionType: 'doubt'   },
  { questionId: 'rw-13', questionNumber: 13, ...RW_DOMAINS[0], difficulty: 'Hard',   optionsViewedCount: 4, confidence: 0,   isCorrect: true,  questionType: 'doubt'   },
  { questionId: 'rw-14', questionNumber: 14, ...RW_DOMAINS[4], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 25,  isCorrect: true,  questionType: 'doubt'   },
  { questionId: 'rw-15', questionNumber: 15, ...RW_DOMAINS[1], difficulty: 'Medium', optionsViewedCount: 2, confidence: 50,  isCorrect: true,  questionType: 'doubt'   },
  // hasty (3) — 정답 보기 전 오답 확정 (성급한 학생)
  { questionId: 'rw-16', questionNumber: 16, ...RW_DOMAINS[6], difficulty: 'Medium', optionsViewedCount: 1, confidence: 75,  isCorrect: false, questionType: 'hasty'   },
  { questionId: 'rw-17', questionNumber: 17, ...RW_DOMAINS[3], difficulty: 'Hard',   optionsViewedCount: 1, confidence: 75,  isCorrect: false, questionType: 'hasty'   },
  { questionId: 'rw-18', questionNumber: 18, ...RW_DOMAINS[9], difficulty: 'Medium', optionsViewedCount: 2, confidence: 50,  isCorrect: false, questionType: 'hasty'   },
  // avoider (9) — 정답을 보고도 넘어감 (논리적 디테일 부족)
  { questionId: 'rw-19', questionNumber: 19, ...RW_DOMAINS[2], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 25,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-20', questionNumber: 20, ...RW_DOMAINS[5], difficulty: 'Medium', optionsViewedCount: 4, confidence: 50,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-21', questionNumber: 21, ...RW_DOMAINS[0], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 25,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-22', questionNumber: 22, ...RW_DOMAINS[4], difficulty: 'Hard',   optionsViewedCount: 4, confidence: 0,   isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-23', questionNumber: 23, ...RW_DOMAINS[1], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 25,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-24', questionNumber: 24, ...RW_DOMAINS[6], difficulty: 'Hard',   optionsViewedCount: 4, confidence: 0,   isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-25', questionNumber: 25, ...RW_DOMAINS[3], difficulty: 'Medium', optionsViewedCount: 3, confidence: 25,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-26', questionNumber: 26, ...RW_DOMAINS[7], difficulty: 'Hard',   optionsViewedCount: 2, confidence: 50,  isCorrect: false, questionType: 'avoider' },
  { questionId: 'rw-27', questionNumber: 27, ...RW_DOMAINS[5], difficulty: 'Hard',   optionsViewedCount: 3, confidence: 0,   isCorrect: false, questionType: 'avoider' },
] as const;

// ── Vocab results: 14/20 correct ─────────────────────────────────────────
// correct: v1~v7, v9, v11, v12, v15, v16, v18, v20
// wrong:   v8, v10, v13, v17
// timeout: v14, v19

export const MOCK_VOCAB_RESULTS = [
  { wordId: 'v1',  word: 'pertinent',     selectedOptionId: 'B',   isCorrect: true,  timeTaken: 3.2 },
  { wordId: 'v2',  word: 'amenable',      selectedOptionId: 'D',   isCorrect: true,  timeTaken: 5.1 },
  { wordId: 'v3',  word: 'detrimental',   selectedOptionId: 'B',   isCorrect: true,  timeTaken: 2.8 },
  { wordId: 'v4',  word: 'upended',       selectedOptionId: 'A',   isCorrect: true,  timeTaken: 4.0 },
  { wordId: 'v5',  word: 'redundancy',    selectedOptionId: 'D',   isCorrect: true,  timeTaken: 6.3 },
  { wordId: 'v6',  word: 'discrepancy',   selectedOptionId: 'B',   isCorrect: true,  timeTaken: 3.5 },
  { wordId: 'v7',  word: 'subordinate',   selectedOptionId: 'C',   isCorrect: true,  timeTaken: 4.7 },
  { wordId: 'v8',  word: 'incongruous',   selectedOptionId: 'C',   isCorrect: false, timeTaken: 7.2 },
  { wordId: 'v9',  word: 'invariable',    selectedOptionId: 'B',   isCorrect: true,  timeTaken: 5.5 },
  { wordId: 'v10', word: 'ambiguous',     selectedOptionId: 'B',   isCorrect: false, timeTaken: 6.8 },
  { wordId: 'v11', word: 'imperceptible', selectedOptionId: 'A',   isCorrect: true,  timeTaken: 4.2 },
  { wordId: 'v12', word: 'nominal',       selectedOptionId: 'B',   isCorrect: true,  timeTaken: 5.0 },
  { wordId: 'v13', word: 'deter',         selectedOptionId: 'B',   isCorrect: false, timeTaken: 3.9 },
  { wordId: 'v14', word: 'proxy',         selectedOptionId: null,  isCorrect: false, timeTaken: 10  },
  { wordId: 'v15', word: 'indispensable', selectedOptionId: 'B',   isCorrect: true,  timeTaken: 3.1 },
  { wordId: 'v16', word: 'resolute',      selectedOptionId: 'A',   isCorrect: true,  timeTaken: 4.4 },
  { wordId: 'v17', word: 'perfunctory',   selectedOptionId: 'C',   isCorrect: false, timeTaken: 8.1 },
  { wordId: 'v18', word: 'meticulously',  selectedOptionId: 'C',   isCorrect: true,  timeTaken: 2.9 },
  { wordId: 'v19', word: 'anachronistic', selectedOptionId: null,  isCorrect: false, timeTaken: 10  },
  { wordId: 'v20', word: 'paradoxically', selectedOptionId: 'A',   isCorrect: true,  timeTaken: 5.6 },
];

// ── Full ReportData ───────────────────────────────────────────────────────

export const MOCK_REPORT_DATA: ReportData = {
  studentName: '김민준',
  submittedAt: '2026-09-05T14:32:00.000Z',
  totalTimeSeconds: 1724,
  timeLimitMinutes: 30,
  testId: 'diagnostic-test-2',

  sections: [
    {
      name: 'Reading and Writing',
      correctCount: 18,
      totalQuestions: 27,
      accuracy: 18 / 27,
      domainBreakdown: [
        { domain: 'Craft and Structure',          accuracy: 5 / 8,  correct: 5,  total: 8  },
        { domain: 'Information and Ideas',        accuracy: 7 / 10, correct: 7,  total: 10 },
        { domain: 'Standard English Conventions', accuracy: 4 / 6,  correct: 4,  total: 6  },
        { domain: 'Expression of Ideas',          accuracy: 2 / 3,  correct: 2,  total: 3  },
      ],
    },
    {
      name: 'Math',
      correctCount: 12,
      totalQuestions: 20,
      accuracy: 12 / 20,
      domainBreakdown: [
        { domain: 'Algebra',                              accuracy: 5 / 7,  correct: 5,  total: 7  },
        { domain: 'Advanced Math',                        accuracy: 4 / 7,  correct: 4,  total: 7  },
        { domain: 'Problem-Solving and Data Analysis',    accuracy: 2 / 4,  correct: 2,  total: 4  },
        { domain: 'Geometry and Trigonometry',            accuracy: 1 / 2,  correct: 1,  total: 2  },
      ],
    },
  ],

  questionDetails: [
    // RW: 27 questions
    ...MOCK_RW_COGNITION.map((q, i) => ({
      id: q.questionId,
      number: i + 1,
      section: 'Reading and Writing',
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      isCorrect: q.isCorrect,
      answered: true,
      timeSeconds: Math.round(50 + Math.random() * 120),
      confidence: q.confidence,
      flagged: false,
    })),
    // Math: 20 questions
    { id: 'm-01', number: 28, section: 'Math', domain: 'Algebra',                           skill: 'Linear equations in one variable',          difficulty: 'Easy',   isCorrect: true,  answered: true, timeSeconds: 45,  confidence: 85, flagged: false },
    { id: 'm-02', number: 29, section: 'Math', domain: 'Algebra',                           skill: 'Linear equations in two variables',          difficulty: 'Easy',   isCorrect: true,  answered: true, timeSeconds: 55,  confidence: 80, flagged: false },
    { id: 'm-03', number: 30, section: 'Math', domain: 'Algebra',                           skill: 'Systems of two linear equations',            difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 90,  confidence: 70, flagged: false },
    { id: 'm-04', number: 31, section: 'Math', domain: 'Algebra',                           skill: 'Linear inequalities',                        difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 75,  confidence: 75, flagged: false },
    { id: 'm-05', number: 32, section: 'Math', domain: 'Algebra',                           skill: 'Linear functions',                           difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 80,  confidence: 65, flagged: false },
    { id: 'm-06', number: 33, section: 'Math', domain: 'Algebra',                           skill: 'Linear equations in two variables',          difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 140, confidence: 40, flagged: true  },
    { id: 'm-07', number: 34, section: 'Math', domain: 'Algebra',                           skill: 'Systems of two linear equations',            difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 120, confidence: 35, flagged: false },
    { id: 'm-08', number: 35, section: 'Math', domain: 'Advanced Math',                     skill: 'Nonlinear functions',                        difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 95,  confidence: 60, flagged: false },
    { id: 'm-09', number: 36, section: 'Math', domain: 'Advanced Math',                     skill: 'Nonlinear equations in one variable',        difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 110, confidence: 65, flagged: false },
    { id: 'm-10', number: 37, section: 'Math', domain: 'Advanced Math',                     skill: 'Equivalent expressions',                     difficulty: 'Hard',   isCorrect: true,  answered: true, timeSeconds: 130, confidence: 55, flagged: false },
    { id: 'm-11', number: 38, section: 'Math', domain: 'Advanced Math',                     skill: 'Nonlinear functions',                        difficulty: 'Hard',   isCorrect: true,  answered: true, timeSeconds: 150, confidence: 50, flagged: true  },
    { id: 'm-12', number: 39, section: 'Math', domain: 'Advanced Math',                     skill: 'Systems of equations',                       difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 180, confidence: 30, flagged: false },
    { id: 'm-13', number: 40, section: 'Math', domain: 'Advanced Math',                     skill: 'Nonlinear equations in one variable',        difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 160, confidence: 25, flagged: false },
    { id: 'm-14', number: 41, section: 'Math', domain: 'Advanced Math',                     skill: 'Equivalent expressions',                     difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 200, confidence: 20, flagged: false },
    { id: 'm-15', number: 42, section: 'Math', domain: 'Problem-Solving and Data Analysis', skill: 'Ratios, rates, proportional relationships',  difficulty: 'Easy',   isCorrect: true,  answered: true, timeSeconds: 60,  confidence: 80, flagged: false },
    { id: 'm-16', number: 43, section: 'Math', domain: 'Problem-Solving and Data Analysis', skill: 'Probability and conditional probability',    difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 100, confidence: 60, flagged: false },
    { id: 'm-17', number: 44, section: 'Math', domain: 'Problem-Solving and Data Analysis', skill: 'Statistics and data analysis',               difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 170, confidence: 30, flagged: false },
    { id: 'm-18', number: 45, section: 'Math', domain: 'Problem-Solving and Data Analysis', skill: 'Two-variable data',                          difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 140, confidence: 35, flagged: false },
    { id: 'm-19', number: 46, section: 'Math', domain: 'Geometry and Trigonometry',         skill: 'Area and volume',                            difficulty: 'Medium', isCorrect: true,  answered: true, timeSeconds: 90,  confidence: 65, flagged: false },
    { id: 'm-20', number: 47, section: 'Math', domain: 'Geometry and Trigonometry',         skill: 'Right triangles and trigonometry',           difficulty: 'Hard',   isCorrect: false, answered: true, timeSeconds: 210, confidence: 20, flagged: false },
  ],

  savedWords: [
    { word: 'ephemeral',   section: 'Reading and Writing', difficulty: 'Hard',   domain: 'Craft and Structure',   vocabLevel: 3 },
    { word: 'juxtapose',   section: 'Reading and Writing', difficulty: 'Hard',   domain: 'Expression of Ideas',   vocabLevel: 3 },
    { word: 'mitigate',    section: 'Reading and Writing', difficulty: 'Medium', domain: 'Information and Ideas', vocabLevel: 2 },
    { word: 'superfluous', section: 'Reading and Writing', difficulty: 'Hard',   domain: 'Craft and Structure',   vocabLevel: 3 },
    { word: 'tenuous',     section: 'Reading and Writing', difficulty: 'Medium', domain: 'Information and Ideas', vocabLevel: 2 },
  ],

  benchmarks: {
    sections: SECTION_BENCHMARKS,
    domains: DOMAIN_BENCHMARKS,
  },

  editedInsights: null,
  coupon: null,

  previousScoreStatus: 'never_taken',

  vocabResults: MOCK_VOCAB_RESULTS,
  rwCognitionData: MOCK_RW_COGNITION as any,
  rwStudentProfile: classifyRWStudent(MOCK_RW_COGNITION.map(q => q.questionType as any)),
};
