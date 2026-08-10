// 데모 제품 화면의 언어 스위치.
//
// 최종본은 영문('en')으로 보낼 예정이고, 내부 검토 중에는 한국어('ko')로 읽는다.
// 아래 DEMO_LANG 한 줄만 바꾸면 제품 화면·AI 출력·상담 노트가 통째로 전환된다.
// (내러티브 섹션 — 소개·팀·로드맵 — 은 항상 한국어라 여기 포함되지 않는다.)

export type Lang = 'ko' | 'en';

// `as Lang`이 필요하다: 리터럴 타입으로 좁혀지면 반대 언어와의 비교가 컴파일 에러가 되어
// 아래 사전 선택 코드가 깨진다. 어느 값으로 바꿔도 타입 체크가 통과해야 한다.
/** ← 검토용은 'ko', 최종 전달본은 'en' */
export const DEMO_LANG = 'en' as Lang;

interface UiStrings {
  // 공통
  edumo: string;
  // Screen 1 — 콘솔
  asIs: string;
  toBe: string;
  asIsCaption: string;
  toBeCaption: string;
  sisLmsCounseling: string;
  groupRecords: string;
  groupRecordsDetail: string;
  groupTeaching: string;
  groupTeachingDetail: string;
  groupCollege: string;
  groupCollegeDetail: string;
  students: string;
  enrolled: string;
  advisingNotesTotal: string;
  needsAttention: string;
  ofRecords: (n: number) => string;
  acrossStudents: string;
  flaggedByPattern: string;
  searchStudents: string;
  all: string;
  gradeLabel: (g: string) => string;
  colStudent: string;
  colHomeroom: string;
  colAdvisor: string;
  colStatus: string;
  colNotes: string;
  colAbsences: string;
  colLastNote: string;
  open: string;
  statusEnrolled: string;
  statusApplicant: string;
  statusOnLeave: string;
  // Screen 2 — 학생 기록
  learningData: string;
  aiBriefing: string;
  strengths: string;
  weakAreas: string;
  risks: string;
  recommended: string;
  mathTrend: string;
  assessments: string;
  strengthSkills: string;
  activityTimeline: string;
  parentPortalOn: string;
  enrolledYear2: string;
  precalcGrade11: string;
  studentSubtitle: string;
  // Screen 3 — 대학 원서
  applications: string;
  submitted: string;
  nextDeadline: string;
  autoFilled: string;
  onTheList: string;
  remaining: (n: number) => string;
  noReentry: string;
  colCollege: string;
  colRound: string;
  colDeadline: string;
  requirementsReady: (done: number, total: number) => string;
  due: string;
  fromSource: (s: string) => string;
  manualEntry: string;
  appStatusSubmitted: string;
  appStatusInProgress: string;
  appStatusNotStarted: string;
  // Screen 4 — AI 분석
  advisingAnalysis: string;
  analyzeButton: (n: number) => string;
  analyzing: string;
  readingNotes: (n: number) => string;
  idleTitle: (n: number) => string;
  idleSub: string;
  signalsDetected: string;
  thisWeek: string;
  thisMonth: string;
  thisQuarter: string;
  thisWeekWhen: string;
  thisMonthWhen: string;
  thisQuarterWhen: string;
  owner: string;
  dueLabel: string;
  whyLabel: string;
  flowNotes: string;
  flowAi: string;
  oneRecord: string;
  oneRecordHint: string;
  clickToHighlight: string;
  sameStudentHint: (groups: number) => string;
  colGroupRecords: string;
  colGroupAttendance: string;
  colGroupAdvising: string;
  showFlaggedOnly: string;
  showAll: string;
  moduleSis: string;
  moduleLms: string;
  moduleAdvising: string;
  moduleManual: string;
  firstMove: string;
  taskCount: (n: number) => string;
  addYourNote: string;
  addYourNoteHint: string;
  notePlaceholder: string;
  reanalyze: string;
  updatedFromNote: string;
  jumpToNote: string;
}

const EN: UiStrings = {
  edumo: 'EDUMO',
  asIs: 'As-is',
  toBe: 'To-be',
  asIsCaption: '세 종류를 따로 사고, 사이를 연동으로 메우고, 같은 데이터를 여러 번 입력합니다.',
  toBeCaption: '학생 한 명의 기록이 하나입니다. 연동할 대상도, 다시 입력할 데이터도 없습니다.',
  sisLmsCounseling: 'From records to applications',
  groupRecords: 'Student information',
  groupRecordsDetail: 'records · attendance · grades',
  groupTeaching: 'Teaching & coursework',
  groupTeachingDetail: 'assignments · marking · feedback',
  groupCollege: 'College applications',
  groupCollegeDetail: 'college list · recommendations · deadlines',
  students: 'Students',
  enrolled: 'Enrolled',
  advisingNotesTotal: 'Advising notes',
  needsAttention: 'Needs attention',
  ofRecords: n => `of ${n} records`,
  acrossStudents: 'across all students',
  flaggedByPattern: 'flagged by pattern',
  searchStudents: 'Search students',
  all: 'All',
  gradeLabel: g => g,
  colStudent: 'Student',
  colHomeroom: 'Homeroom',
  colAdvisor: 'Advisor',
  colStatus: 'Status',
  colNotes: 'Notes',
  colAbsences: 'Absences',
  colLastNote: 'Last note',
  open: 'open',
  statusEnrolled: 'Enrolled',
  statusApplicant: 'Applicant',
  statusOnLeave: 'On leave',
  learningData: 'Learning Data',
  aiBriefing: 'AI Status Briefing',
  strengths: 'Strengths',
  weakAreas: 'Weak areas',
  risks: 'Risks',
  recommended: 'Recommended',
  mathTrend: 'Math score trend',
  assessments: 'Assessments',
  strengthSkills: 'Strength skills',
  activityTimeline: 'Activity timeline',
  parentPortalOn: 'Parent portal · on',
  enrolledYear2: 'Enrolled · Year 2',
  precalcGrade11: 'AP track · Pre-Calculus',
  studentSubtitle: 'Grade 11 · Homeroom 11-B · Advisor Daniel Cho',
  applications: 'Applications',
  submitted: 'Submitted',
  nextDeadline: 'Next deadline',
  autoFilled: 'Auto-filled documents',
  onTheList: 'on the list',
  remaining: n => `${n} remaining`,
  noReentry: 'no re-entry needed',
  colCollege: 'College',
  colRound: 'Round',
  colDeadline: 'Deadline',
  requirementsReady: (d, t) => `${d}/${t} requirements ready`,
  due: 'due',
  fromSource: s => `from ${s}`,
  manualEntry: 'manual entry',
  appStatusSubmitted: 'Submitted',
  appStatusInProgress: 'In progress',
  appStatusNotStarted: 'Not started',
  advisingAnalysis: 'Advising Work List',
  analyzeButton: n => `Build the work list from ${n} notes`,
  analyzing: 'Analyzing...',
  readingNotes: n => `Reading ${n} notes and sequencing the work...`,
  idleTitle: n => `${n} advising notes are on file.`,
  idleSub: 'Turn them into what has to happen this week, this month and this quarter.',
  signalsDetected: 'What a first read would miss',
  thisWeek: 'This week',
  thisMonth: 'This month',
  thisQuarter: 'This quarter',
  thisWeekWhen: 'next 7 days',
  thisMonthWhen: 'before the month ends',
  thisQuarterWhen: 'set up now, matters next term',
  owner: 'Owner',
  dueLabel: 'Due',
  whyLabel: 'Why now?',
  flowNotes: 'advising notes',
  flowAi: 'Edumo AI reads all of them',
  oneRecord: 'One student record, filled by three modules',
  oneRecordHint: 'documents auto-filled — nothing re-typed',
  clickToHighlight: 'Click a module to see what it filled',
  sameStudentHint: g => `Same student, same screen — only the module changes. These ${g} areas are normally ${g} separate products.`,
  colGroupRecords: 'Records',
  colGroupAttendance: 'Attendance',
  colGroupAdvising: 'Advising',
  showFlaggedOnly: 'Show only these',
  showAll: 'Show all',
  moduleSis: 'Records & grades',
  moduleLms: 'Coursework',
  moduleAdvising: 'Advising notes',
  moduleManual: 'Typed by hand',
  firstMove: 'First move',
  taskCount: n => `${n} tasks`,
  addYourNote: 'Add your own note',
  addYourNoteHint: '새 상담 내용을 직접 입력해 보세요. 기록 전체와 함께 다시 읽고 분석을 갱신합니다.',
  notePlaceholder:
    'e.g. Met the father for the first time today. He said he had no idea Seojun was interested in economics.',
  reanalyze: 'Re-analyze with this note',
  updatedFromNote: 'Updated from your note',
  jumpToNote: '원본 상담 기록으로 이동',
};

const KO: UiStrings = {
  ...EN,
  students: '학생',
  enrolled: '재학',
  advisingNotesTotal: '상담 기록',
  needsAttention: '확인 필요',
  ofRecords: n => `전체 ${n}명`,
  acrossStudents: '전체 학생 합계',
  flaggedByPattern: '패턴으로 감지됨',
  searchStudents: '학생 검색',
  all: '전체',
  gradeLabel: g => g.replace('Grade ', '') + '학년',
  colStudent: '학생',
  colHomeroom: '반',
  colAdvisor: '담당',
  colStatus: '상태',
  colNotes: '기록',
  colAbsences: '결석',
  colLastNote: '최근 기록',
  open: '열기',
  statusEnrolled: '재학',
  statusApplicant: '지원자',
  statusOnLeave: '휴학',
  learningData: '학습 데이터',
  aiBriefing: 'AI 현황 브리핑',
  strengths: '강점',
  weakAreas: '취약',
  risks: '리스크',
  recommended: '추천',
  mathTrend: '수학 성적 추이',
  assessments: '평가',
  strengthSkills: '강점 스킬',
  activityTimeline: '활동 타임라인',
  parentPortalOn: '학부모 포털 · 사용중',
  enrolledYear2: '재학 · 2년차',
  precalcGrade11: 'AP 트랙 · Pre-Calculus',
  studentSubtitle: '11학년 · 11-B반 · 담당 Daniel Cho',
  applications: '지원 대학',
  submitted: '제출 완료',
  nextDeadline: '다음 마감',
  autoFilled: '자동 입력된 서류',
  onTheList: '지원 목록',
  remaining: n => `${n}개 남음`,
  noReentry: '재입력 불필요',
  colCollege: '대학',
  colRound: '전형',
  colDeadline: '마감일',
  requirementsReady: (d, t) => `준비물 ${d}/${t} 완료`,
  due: '마감',
  fromSource: s => `${s}에서 자동`,
  manualEntry: '직접 입력',
  appStatusSubmitted: '제출 완료',
  appStatusInProgress: '진행 중',
  appStatusNotStarted: '미시작',
  advisingAnalysis: '상담 기록 기반 업무 목록',
  analyzeButton: n => `기록 ${n}건에서 할 일 뽑기`,
  analyzing: '분석 중...',
  readingNotes: n => `기록 ${n}건을 읽고 순서를 잡는 중...`,
  idleTitle: n => `상담 기록 ${n}건이 쌓여 있습니다.`,
  idleSub: '이번 주·이번 달·이번 분기에 해야 할 일로 바꿔 보세요.',
  signalsDetected: '처음 읽으면 놓치는 것',
  thisWeek: '이번 주',
  thisMonth: '이번 달',
  thisQuarter: '이번 분기',
  thisWeekWhen: '앞으로 7일',
  thisMonthWhen: '이달 안에',
  thisQuarterWhen: '지금 세팅, 다음 학기에 효과',
  owner: '담당',
  dueLabel: '기한',
  whyLabel: '왜 지금?',
  flowNotes: '상담 기록',
  flowAi: 'Edumo AI가 전부 읽습니다',
  oneRecord: '학생 기록 하나를, 세 모듈이 채웁니다',
  oneRecordHint: '자동 입력된 서류 — 재입력 없음',
  clickToHighlight: '모듈을 누르면 무엇을 채웠는지 보입니다',
  sameStudentHint: g => `같은 학생, 같은 화면 — 모듈만 바뀝니다. 이 ${g}개 영역은 보통 ${g}개의 별도 제품입니다.`,
  colGroupRecords: '학적',
  colGroupAttendance: '출결',
  colGroupAdvising: '상담',
  showFlaggedOnly: '이 학생만 보기',
  showAll: '전체 보기',
  moduleSis: '학적·출결·성적',
  moduleLms: '수업·과제',
  moduleAdvising: '상담 기록',
  moduleManual: '직접 입력',
  firstMove: '첫 수',
  taskCount: n => `${n}건`,
  addYourNote: '직접 상담 내용 추가하기',
  notePlaceholder: '예: 오늘 처음으로 아버님을 뵈었다. Seojun이 경제학에 관심 있다는 걸 전혀 모르고 계셨다.',
  reanalyze: '이 내용 반영해 다시 분석',
  updatedFromNote: '입력하신 내용이 반영되었습니다',
};

export const t: UiStrings = DEMO_LANG === 'ko' ? KO : EN;

/** 원서 준비물의 출처 칩 표기 — 모듈명은 두 언어 공통으로 짧게 유지한다. */
export const SOURCE_LABEL: Record<string, string> =
  DEMO_LANG === 'ko'
    ? { SIS: '학적', LMS: '수업', Advising: '상담 기록', Manual: '' }
    : { SIS: 'records', LMS: 'coursework', Advising: 'advising notes', Manual: '' };
