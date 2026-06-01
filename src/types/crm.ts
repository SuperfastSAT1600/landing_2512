/**
 * CRM 공유 타입 정의
 * students, student_coach_assignments, 상담 타임라인, AI 케어 메시지
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type SchoolType = '한국 학제' | 'AP' | 'IB';
export type DesiredSubjects =
  // SAT
  | 'RW' | 'Math' | 'Both'
  // SSAT
  | 'SSAT Math'
  // AP
  | 'AP Calculus BC'
  | 'AP US History'
  | 'AP Physics 1'
  | 'AP Biology'
  | 'AP Psychology'
  | 'AP World History'
  | 'AP Computer Science A'
  | 'AP Computer Science Principles'
  | 'AP Macroeconomics'
  | 'AP Microeconomics'
  | 'AP US Government and Politics'
  | 'AP Comparative Government and Politics';
export type PreviousScoreStatus = 'scored' | 'never_taken' | 'dont_remember';
export type PreferredLanguage = 'korean' | 'english' | 'any';
export type ChurnType = 'potential' | 'closed';
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'considering' | 'closed';
export type ContactType = 'phone' | 'kakao' | 'email';
export type LeadStatus = 'active' | 'inactive' | 'reactivating' | 'enrolled';

// ─── 인입 분류 (6개 필드) ─────────────────────────────────────────────────────

export type InquiryChannel =
  | '카톡' | '네이버 상담시트' | '구글 상담시트' | '전화'
  | '상담 예약' | '진단테스트 신청' | '인스타그램 링크';

export type TrafficSource =
  | '네이버 블로그' | '네이버 카페' | '(구)랜딩페이지' | '튜터링 랜딩페이지'
  | '공식 블로그' | '인스타그램 오가닉' | '인스타그램 광고' | '브런치'
  | '책' | '소개/추천' | '레딧' | 'B2B 파트너';

export type ContentAuthor = '배병윤' | '이민재' | '김우영' | '장현아';

export type LeadType = 'B2C' | 'B2B';

export type B2BPartner =
  | '해연' | '커넥티드에듀' | '부산프레스티지' | '인사이트 컨설팅'
  | '신화 유학원' | '미소남' | 'InArt' | '박정 어학원' | '솔로몬에듀' | 'Admission AG';

// 세일즈 퍼널 단계 (칸반 A)
export type FunnelStage =
  | '0'   // 리드 인입 (외부 채널 자동 유입, 미접촉)
  | '1'   // 첫 메시지 발송
  | '2'   // 세일즈 콜 예약 확정 후 대기
  | '3a'  // 세일즈 콜 전 진단테스트 대기
  | '3b'  // 세일즈 콜 전 진단테스트 제출 완료
  | '4'   // 세일즈 콜 완료
  | '5a'  // 세일즈 콜 후 진단테스트 대기
  | '5b'  // 세일즈 콜 후 진단테스트 제출 완료
  | '6'   // 진단 Report 세일즈 콜 예약 확정 후 대기
  | '7'   // 진단 Report 세일즈 콜 완료
  | 'churned';

// 코치 매칭 보드 단계 (칸반 B, 결제 완료 이후)
export type MatchingStage =
  | 'schedule_pending'    // 스케줄 입력 대기
  | 'schedule_done'       // 스케줄 입력 완료
  | 'offer_sent'          // 코치 제안 발송
  | 'awaiting_response'   // 코치 응답 대기
  | 'matched';            // 매칭 확정

// 학부모 마이페이지 노출 상태 (4단계)
export type ParentStatus = 'new' | 'schedule' | 'matching' | 'done';

// ─── 재활성화 로그 ────────────────────────────────────────────────────────────

export interface ReactivationEntry {
  id: string;
  attempted_at: string;   // ISO timestamp
  strategy: string;       // 전략 메모 (필수)
  outcome: 'pending' | 'no_response' | 'reactivated' | 'rejected';
  notes?: string;
}

// ─── 상담 타임라인 ──────────────────────────────────────────────────────────

export interface ConsultationEntry {
  id: string;
  created_at: string;                       // ISO timestamp
  raw_memo: string;                         // 매니저 원본 메모
  ai_purified?: string;                     // AI 가공본 (학부모 노출)
  ai_deleted_items?: string[];              // AI가 삭제한 항목 목록 (매니저 확인용)
  ai_coach_history?: string;               // AI가 분리한 교육 이력 (코치 노출)
  published: boolean;                       // true면 학부모 타임라인에 노출
  manager_id?: string;
}

// ─── 주간 스케줄 ─────────────────────────────────────────────────────────────

export interface WeeklySlot {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=일, 1=월 ... 6=토
  hour: number;                              // 0-23 (로컬 타임존 기준)
  minute: 0 | 30;
  timezone: string;                          // IANA timezone (e.g. 'America/New_York')
}

// ─── Student ────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  grade: string;
  school_type: SchoolType;
  parent_phone: string;                 // 연락처 값 (핸드폰번호 / 카카오ID / 이메일)
  contact_type: ContactType | null;     // 연락처 유형
  inquiry_date: string | null;          // 문의 들어온 날 (YYYY-MM-DD)

  // 인입 분류 (6개 필드)
  inquiry_channel: InquiryChannel | null;
  traffic_source: TrafficSource | null;
  content_author: ContentAuthor | null;
  lead_type: LeadType | null;
  b2b_partner: B2BPartner | null;
  campaign_tags: string[];
  ad_name: string | null;
  adset_name: string | null;

  previous_score_status: PreviousScoreStatus;
  previous_test_date: string | null;     // YYYY-MM, scored일 때만 유효
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  target_score_2: number | null;
  target_test_date: string | null;      // YYYY-MM-DD, null=미정
  target_test_date_2: string | null;    // YYYY-MM-DD (선택)
  desired_subjects: DesiredSubjects;

  // 학부모 입력
  parent_timezone: string | null;
  ot_datetime: string | null;           // ISO timestamp (UTC)
  weekly_schedule: WeeklySlot[] | null;

  // 운영 필드
  lead_status: LeadStatus;
  funnel_stage: FunnelStage;
  matching_stage: MatchingStage | null; // funnel_stage='9' 이후
  churn_tag: string | null;
  churn_type: ChurnType | null;
  diagnostic_result_id: string | null;
  consultation_timeline: ConsultationEntry[];

  last_contacted_at: string | null;
  reactivation_log: ReactivationEntry[];
  portal_token: string | null;
  portal_name: string | null;
  preferred_language: PreferredLanguage | null;

  // 세일즈 전략
  strategy_history: StrategyHistoryEntry[];
  initial_contact_strategy_id: string | null;
  initial_strategy_id: string | null;
  retry_strategy_id: string | null;
  retry_stage: RetryStage | null;
  retry_assigned_at: string | null;

  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export type RetryStage = '연락 시도' | '상담 중' | '제안 완료' | '결제 완료';
export const RETRY_STAGES: RetryStage[] = ['연락 시도', '상담 중', '제안 완료', '결제 완료'];

export type StrategyHistoryType = 'initial_contact' | 'initial_sales' | 'retry';

export interface StrategyHistoryEntry {
  id: string;
  type: StrategyHistoryType;
  strategy_id: string;
  strategy_name: string;
  memo: string;
  applied_at: string;
  manager_id?: string;
}

export interface RetryStrategy {
  id: string;
  name: string;
  description: string | null;
  type: 'initial_contact' | 'initial_sales' | 'retry';
  created_at: string;
}

export type CreateStudentInput = Pick<
  Student,
  | 'name'
  | 'grade'
  | 'school_type'
  | 'parent_phone'
  | 'contact_type'
  | 'inquiry_date'
  | 'inquiry_channel'
  | 'traffic_source'
  | 'content_author'
  | 'lead_type'
  | 'b2b_partner'
  | 'campaign_tags'
  | 'ad_name'
  | 'adset_name'
  | 'previous_rw_score'
  | 'previous_math_score'
  | 'previous_score_status'
  | 'target_score'
  | 'target_score_2'
  | 'target_test_date'
  | 'target_test_date_2'
  | 'desired_subjects'
  | 'parent_timezone'
>;

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  student_id: string | null;
  student_name: string;
  product: string;
  hours: number | null;
  amount: number;
  payment_type: string | null;
  tax_type: '면세' | '과세';
  paid_at: string;         // YYYY-MM-DD
  notes: string | null;
  created_at: string;
}

// ─── Assignment ──────────────────────────────────────────────────────────────

export interface CoachAssignment {
  id: string;
  student_id: string;
  coach_slug: string;
  status: AssignmentStatus;
  is_confirmed: boolean;
  offer_token: string;
  response_deadline: string;     // ISO timestamp
  coach_timezone: string | null;
  reject_reason: string | null;
  closed_reason: string | null;
  closed_at: string | null;
  assigned_by: string;
  assigned_at: string;
  responded_at: string | null;

  // 조인 데이터 (API 응답 시 포함 가능)
  coach_name?: string;
  coach_photo?: string;
}

// ─── Coach Offer View ────────────────────────────────────────────────────────

export interface CoachOfferPayload {
  assignment_id: string;
  status: AssignmentStatus;
  response_deadline: string;
  reviewing_count: number;       // 현재 검토 중인 코치 수

  // 학생 정보 (PRD 노출 범위)
  student: {
    name: string;
    grade: string;
    school_type: SchoolType;
    desired_subjects: DesiredSubjects;
    previous_rw_score: number | null;
    previous_math_score: number | null;
    previous_score_status: PreviousScoreStatus;
    target_score: number | null;
    target_test_date: string;
    coach_history: string | null;  // AI 분리 교육 이력
    diagnostic_summary: DiagnosticSummary | null;
  };

  // 스케줄 (UTC, 코치 뷰에서 타임존 변환 후 표시)
  ot_datetime: string | null;
  weekly_schedule: WeeklySlot[] | null;
}

export interface DiagnosticSummary {
  total_correct: number;
  total_questions: number;
  rw_score: number | null;
  math_score: number | null;
  weak_areas: string[];
  vocab_weakness_level: 'none' | 'low' | 'medium' | 'high';
}

// ─── AI 케어 메시지 ───────────────────────────────────────────────────────────

export interface AiCareRequest {
  raw_memo: string;
}

export interface AiCareResult {
  purified: string;           // 학부모에게 보여줄 순화본
  deleted_items: string[];    // 삭제된 항목 목록 (매니저 확인용)
  coach_history: string;      // 코치에게 전달할 교육 이력
}

// ─── Parent Mypage ────────────────────────────────────────────────────────────

export interface ParentStudentView {
  id: string;
  name: string;
  grade: string;
  parent_status: ParentStatus;
  has_passcode: boolean;
  ot_datetime: string | null;
  weekly_schedule: WeeklySlot[] | null;
  parent_timezone: string | null;
  timeline: Pick<ConsultationEntry, 'id' | 'created_at' | 'ai_purified'>[];
  diagnostic_result_id?: string;
}

// ─── Funnel Stage Labels ──────────────────────────────────────────────────────

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  '0': '리드 인입',
  '1': '첫 메시지 발송',
  '2': '세일즈 콜 예약 확정',
  '3a': '진단테스트 대기 (콜 전)',
  '3b': '진단테스트 완료 (콜 전)',
  '4': '세일즈 콜 완료',
  '5a': '진단테스트 대기 (콜 후)',
  '5b': '진단테스트 완료 (콜 후)',
  '6': 'Report 콜 예약 확정',
  '7': 'Report 콜 완료',
  'churned': '이탈',
};

export const MATCHING_STAGE_LABELS: Record<MatchingStage, string> = {
  schedule_pending: '스케줄 입력 대기',
  schedule_done: '스케줄 입력 완료',
  offer_sent: '코치 제안 발송',
  awaiting_response: '코치 응답 대기',
  matched: '매칭 확정',
};

export const INQUIRY_CHANNEL_OPTIONS: InquiryChannel[] = [
  '카톡', '네이버 상담시트', '구글 상담시트', '전화',
  '상담 예약', '진단테스트 신청', '인스타그램 링크',
];

export const TRAFFIC_SOURCE_OPTIONS: TrafficSource[] = [
  '네이버 블로그', '네이버 카페', '(구)랜딩페이지', '튜터링 랜딩페이지',
  '공식 블로그', '인스타그램 오가닉', '인스타그램 광고', '브런치',
  '책', '소개/추천', '레딧', 'B2B 파트너',
];

export const CONTENT_AUTHOR_OPTIONS: ContentAuthor[] = [
  '배병윤', '이민재', '김우영', '장현아',
];

export const B2B_PARTNER_OPTIONS: B2BPartner[] = [
  '해연', '커넥티드에듀', '부산프레스티지', '인사이트 컨설팅',
  '신화 유학원', '미소남', 'InArt', '박정 어학원', '솔로몬에듀', 'Admission AG',
];

export const CAMPAIGN_TAG_PRESETS = ['기존DB 재활성화', '여름특강'] as const;

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  phone: '핸드폰',
  kakao: '카카오톡',
  email: '이메일',
};

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  '한국 학제': '한국 학제',
  'AP': 'AP',
  'IB': 'IB',
};

export const TIMEZONE_OPTIONS = [
  { label: '한국 (KST)', value: 'Asia/Seoul' },
  { label: '미국 동부 (ET)', value: 'America/New_York' },
  { label: '미국 중부 (CT)', value: 'America/Chicago' },
  { label: '미국 산악 (MT)', value: 'America/Denver' },
  { label: '미국 서부 (PT)', value: 'America/Los_Angeles' },
  { label: '캐나다 동부', value: 'America/Toronto' },
  { label: '영국 (GMT)', value: 'Europe/London' },
  { label: '중국 (CST)', value: 'Asia/Shanghai' },
  { label: '싱가포르', value: 'Asia/Singapore' },
  { label: '호주 동부', value: 'Australia/Sydney' },
  { label: '일본 (JST)', value: 'Asia/Tokyo' },
] as const;

export const TIMEZONE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TIMEZONE_OPTIONS.map(o => [o.value, o.label])
);

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  active: '활성',
  inactive: '비활성',
  reactivating: '재활성화 시도 중',
  enrolled: '수강 중',
};

export const CHURN_TAG_OPTIONS = [
  '회신 없음',
  '노쇼',
  '미응시',
  '미결제',
  '기타',
] as const;

export const GRADE_OPTIONS = [
  '7th', '8th', '9th', '10th', '11th', '12th', '졸업', '기타',
] as const;

export type Grade = typeof GRADE_OPTIONS[number];

export const GRADE_OPTIONS_BY_SCHOOL_TYPE: Record<string, string[]> = {
  '한국 학제': ['초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '재수', '성인'],
  'AP': ['7th', '8th', '9th', '10th', '11th', '12th', '졸업', '기타'],
  'IB': ['Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', '졸업', '기타'],
};

export type ChurnTag = typeof CHURN_TAG_OPTIONS[number];

// lead_status → ParentStatus 매핑
export function getParentStatus(leadStatus: LeadStatus): ParentStatus {
  if (leadStatus === 'enrolled') return 'done';
  return 'new';
}
