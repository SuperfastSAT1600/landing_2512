/**
 * CRM 공유 타입 정의
 * students, student_coach_assignments, 상담 타임라인, AI 케어 메시지
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type SchoolType = '한국 학제' | 'AP' | 'IB';
export type DesiredSubjects =
  // SAT
  | 'RW'
  | 'Math'
  | 'Both'
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
export type LeadTier = 'A' | 'B' | 'C';
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'considering' | 'closed';
export type ContactType = 'phone' | 'kakao' | 'email';
export type LeadStatus = 'active' | 'inactive' | 'reactivating' | 'enrolled';

// ─── 인입 분류 (6개 필드) ─────────────────────────────────────────────────────

export type InquiryChannel =
  | '카톡'
  | '네이버 상담시트'
  | '구글 상담시트'
  | '전화'
  | '상담 예약'
  | '진단테스트 신청'
  | '인스타그램 링크';

export type TrafficSource =
  | '네이버 검색 후 상담예약'
  | '네이버 카페'
  | '구글폼에서 즉시상담'
  | '(구)랜딩페이지 즉시상담'
  | '(구)랜딩페이지 상담예약'
  | '(신)랜딩 페이지 상담예약'
  | '공식 블로그'
  | '인스타그램 오가닉'
  | '인스타그램 광고'
  | '브런치'
  | '책'
  | '소개/추천'
  | '레딧'
  | 'B2B 파트너'
  | '기존DB'
  | '대표전화';

export type ContentAuthor = '배병윤' | '이민재' | '김우영' | '장현아';

export type LeadType = 'B2C' | 'B2B';

export type B2BPartner =
  | '해연'
  | '커넥티드에듀'
  | '부산프레스티지'
  | '인사이트 컨설팅'
  | '신화 유학원'
  | '미소남'
  | 'InArt'
  | '박정 어학원'
  | '솔로몬에듀'
  | 'Admission AG'
  | '공부하는 아이들'
  | '옹글리쉬';

// 세일즈 퍼널 단계 (칸반 A)
export type FunnelStage =
  | '0' // 리드 인입 (외부 채널 자동 유입, 미접촉)
  | '1' // 첫 메시지 발송
  | '2' // 세일즈 콜 예약 확정 후 대기
  | '3a' // 세일즈 콜 전 진단테스트 대기
  | '3b' // 세일즈 콜 전 진단테스트 제출 완료
  | '4' // 세일즈 콜 완료
  | '5a' // 세일즈 콜 후 진단테스트 대기
  | '5b' // 세일즈 콜 후 진단테스트 제출 완료
  | '6' // 진단 Report 세일즈 콜 예약 확정 후 대기
  | '7' // 진단 Report 세일즈 콜 완료
  | '8' // 수업 중 (결제 완료 후 자동 전환)
  | 'churned';

// 코치 매칭 보드 단계 (칸반 B, 결제 완료 이후)
export type MatchingStage =
  | 'schedule_pending' // 스케줄 입력 대기
  | 'schedule_done' // 스케줄 입력 완료
  | 'offer_sent' // 코치 제안 발송
  | 'awaiting_response' // 코치 응답 대기
  | 'matched'; // 매칭 확정

// 학부모 마이페이지 노출 상태 (4단계)
export type ParentStatus = 'new' | 'schedule' | 'matching' | 'done';

// ─── 재활성화 로그 ────────────────────────────────────────────────────────────

export interface ReactivationEntry {
  id: string;
  attempted_at: string; // ISO timestamp
  strategy: string; // 전략 메모 (필수)
  outcome: 'pending' | 'no_response' | 'reactivated' | 'rejected';
  notes?: string;
}

// ─── 상담 타임라인 ──────────────────────────────────────────────────────────

/** 상담 메모 첨부 (카톡 캡처 등). 비공개 버킷 저장 경로만 보관, 조회 시 서명 URL 사용. */
export interface Attachment {
  path: string; // crm-attachments 버킷 내 저장 경로 (공개 URL 아님)
  name: string; // 원본 파일명
  mime: string; // MIME 타입
  size: number; // 바이트
}

export interface ConsultationEntry {
  id: string;
  created_at: string; // ISO timestamp
  raw_memo: string; // 매니저 원본 메모
  author?: string; // 작성자 이름 (로그인한 CRM 사용자)
  ai_purified?: string; // AI 가공본 (학부모 노출)
  ai_deleted_items?: string[]; // AI가 삭제한 항목 목록 (매니저 확인용)
  ai_coach_history?: string; // AI가 분리한 교육 이력 (코치 노출)
  attachments?: Attachment[]; // 첨부 파일 (운영자 내부 전용, 학부모 비노출)
  published: boolean; // true면 학부모 타임라인에 노출
  manager_id?: string;
}

// ─── 주간 스케줄 ─────────────────────────────────────────────────────────────

export interface WeeklySlot {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=일, 1=월 ... 6=토
  hour: number; // 0-23 (로컬 타임존 기준)
  minute: 0 | 30;
  timezone: string; // IANA timezone (e.g. 'America/New_York')
}

// ─── Student ────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  grade: string;
  school_type: SchoolType;
  parent_phone: string; // 연락처 값 (핸드폰번호 / 카카오ID / 이메일)
  contact_type: ContactType | null; // 연락처 유형
  inquiry_date: string | null; // 문의 시각 (naive timestamp "YYYY-MM-DDTHH:mm:ss", 분 단위)
  first_message_sent_at: string | null; // 첫 메시지(첫 응답) 발송 시각 (ISO timestamp)

  // 인입 분류 (6개 필드)
  inquiry_channel: InquiryChannel | null;
  traffic_source: TrafficSource | null;
  content_author: ContentAuthor | null;
  lead_type: LeadType | null;
  b2b_partner: B2BPartner | null;
  campaign_tags: string[];
  ad_name: string | null;
  adset_name: string | null;
  referral_student_id: string | null; // 소개/추천 유입 시 소개한 학생 id (외부 소개자면 null)
  referral_student_name: string | null; // 소개자 표시용 이름 (선택 학생명 또는 직접 입력)

  previous_score_status: PreviousScoreStatus;
  previous_test_date: string | null; // YYYY-MM, scored일 때만 유효
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  target_score_2: number | null;
  target_test_date: string | null; // YYYY-MM-DD, null=미정
  target_test_date_2: string | null; // YYYY-MM-DD (선택)
  desired_subjects: DesiredSubjects;

  // 학부모 입력
  parent_timezone: string | null;
  ot_datetime: string | null; // ISO timestamp (UTC)
  weekly_schedule: WeeklySlot[] | null;

  // 운영 필드
  lead_status: LeadStatus;
  funnel_stage: FunnelStage;
  matching_stage: MatchingStage | null; // funnel_stage='9' 이후
  churn_tag: string | null;
  churn_type: ChurnType | null;
  diagnostic_result_id: string | null;
  diagnostic_funnel_stage: number | null; // 진단 테스트 전용 퍼널(1~5), null=미설정
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

  // 리드 등급 (수동 확정). null이면 자동 분류(autoLeadTier) 사용
  lead_tier: LeadTier | null;

  // 세일즈 전략 AI 대화 기록 — 패널 재진입 시 이어서 진행
  strategy_ai_messages: StrategyChatMessage[];

  // 결제완료 → 회원가입/카톡 단톡방 온보딩 추적 (최초 세일즈 칸반 8번 컬럼)
  kakao_chat_created: boolean | null; // 카톡 단톡방 개설 완료 여부
  signup_done_at: string | null; // 회원가입 완료 처리 시각. null=미완료(8번에 표시)

  funnel_stage_updated_at: string | null;
  stage_history: Array<{ stage: string; label: string; entered_at: string }>;
  // 수동 지정 이탈 단계 (null이면 stage_history 기반 자동 도출)
  churn_stage_manual: FunnelStage | null;
  // "오늘 할 일" 액션 완료 체크 시각. KST 당일이면 완료로 판정(isActionDoneToday)
  daily_action_done_at: string | null;
  sort_order: number | null;
  entered_by?: string | null;
  is_vip: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type RetryStage = '연락 시도' | '상담 중' | '제안 완료';
export const RETRY_STAGES: RetryStage[] = ['연락 시도', '상담 중', '제안 완료'];

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

// ─── 성장 실험 (전략/실행/회고) ──────────────────────────────────────────────

// 자동 측정 지표는 /api/crm/stats by_source / overview 필드와 1:1 매핑. custom은 수동 입력.
export type ExperimentMetricKey =
  | 'contact_rate'
  | 'conversion_rate'
  | 'avg_first_response_seconds'
  | 'custom';
export type ExperimentStatus = 'planned' | 'running' | 'done';
export type ExperimentVerdict = 'success' | 'fail' | 'inconclusive';

export const EXPERIMENT_METRIC_LABELS: Record<ExperimentMetricKey, string> = {
  contact_rate: '컨택 성공률',
  conversion_rate: '결제 전환율',
  avg_first_response_seconds: '평균 첫 응답시간',
  custom: '커스텀 지표',
};

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  planned: '계획',
  running: '진행중',
  done: '완료',
};

export const EXPERIMENT_VERDICT_LABELS: Record<ExperimentVerdict, string> = {
  success: '성공',
  fail: '실패',
  inconclusive: '판단 보류',
};

export interface GrowthExperiment {
  id: string;
  title: string;
  hypothesis: string | null;
  execution_plan: string | null;
  segment_source: string | null; // traffic_source 값, null=전체
  metric_key: ExperimentMetricKey;
  custom_metric_label: string | null;
  baseline_from: string | null;
  baseline_to: string | null;
  baseline_value: number | null;
  test_from: string | null;
  test_to: string | null;
  result_value: number | null;
  target_value: number | null;
  status: ExperimentStatus;
  verdict: ExperimentVerdict | null;
  retrospective: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  | 'entered_by'
>;

// ─── Payment ─────────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'SAT 정규 1:1 수업'
  | 'SAT 정규 1:2 수업'
  | 'SAT 정규 그룹 수업'
  | 'AP 정규 1:1 수업'
  | 'AP 정규 1:2 수업'
  | '관리형 콘텐츠'
  | 'SAT 체험 1:1 수업'
  | 'SAT 체험 1:2 수업';

export type ProductSubcategory =
  | '관리형 수업'
  | '원포인트'
  | '여름방학 특강'
  | '단어학습'
  | 'SuperTest'
  | '인강'
  | '체험수업';

export interface Payment {
  id: string;
  student_id: string | null;
  student_name: string;
  product: string;
  product_category: ProductCategory | null;
  product_subcategory: ProductSubcategory | null;
  hours: number | null;
  amount: number;
  payment_type: string | null;
  tax_type: '면세' | '과세';
  paid_at: string; // YYYY-MM-DD
  created_by: string | null; // 결제를 입력한 담당자명
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
  response_deadline: string; // ISO timestamp
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
  reviewing_count: number; // 현재 검토 중인 코치 수

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
    coach_history: string | null; // AI 분리 교육 이력
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
  purified: string; // 학부모에게 보여줄 순화본
  deleted_items: string[]; // 삭제된 항목 목록 (매니저 확인용)
  coach_history: string; // 코치에게 전달할 교육 이력
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
  '8': '수업 중',
  churned: '이탈',
};

// 진단 테스트 전용 퍼널 단계 라벨 (students.diagnostic_funnel_stage)
export const DIAGNOSTIC_FUNNEL_LABELS: Record<number, string> = {
  1: '응시하지 않아도 됨',
  2: '안내 필요',
  3: '응시 확인 필요',
  4: 'Report 전달 필요',
  5: 'Report 전달 완료',
};

export const DIAGNOSTIC_FUNNEL_STAGES = [1, 2, 3, 4, 5] as const;

// ─── 단계 정체 알림 (SLA) ─────────────────────────────────────────────────────
// 각 단계 목표 체류일 — 이 일수를 "초과"하면 정체로 간주하고 알림. 8(수업중)·churned 제외.
// 운영 기준이 바뀌면 이 표만 수정하면 배너/카드 뱃지에 즉시 반영된다.
export const FUNNEL_STAGE_SLA_DAYS: Partial<Record<FunnelStage, number>> = {
  '0': 1, // 리드 인입 → 당일 첫 연락
  '1': 2, // 첫 메시지 발송 → 콜 예약
  '2': 3, // 세일즈 콜 예약 확정 → 콜 진행
  '3a': 3, // 진단테스트 대기 (콜 전)
  '3b': 2, // 진단테스트 완료 (콜 전) → 콜 진행
  '4': 2, // 세일즈 콜 완료 → 진단 안내
  '5a': 3, // 진단테스트 대기 (콜 후)
  '5b': 2, // 진단테스트 완료 (콜 후) → Report 콜 예약
  '6': 3, // Report 콜 예약 확정 → 콜 진행
  '7': 2, // Report 콜 완료 → 결제 클로징
};

// 단계별 "지금 해야 할 다음 행동" — 정체 알림에 그대로 표시해 실무자가 바로 움직이게 한다.
export const FUNNEL_NEXT_ACTION: Partial<Record<FunnelStage, string>> = {
  '0': '첫 메시지 발송',
  '1': '콜 예약 잡기',
  '2': '세일즈 콜 진행',
  '3a': '진단테스트 제출 독려',
  '3b': '세일즈 콜 진행',
  '4': '진단테스트 안내',
  '5a': '진단테스트 제출 독려',
  '5b': 'Report 콜 예약',
  '6': 'Report 콜 진행',
  '7': '결제 클로징',
};

/** 현재 단계 진입 후 경과 일수. funnel_stage_updated_at 우선, 없으면 created_at 폴백. */
export function daysInStage(
  s: Pick<Student, 'funnel_stage_updated_at' | 'created_at'>,
  nowMs: number
): number | null {
  const ref = s.funnel_stage_updated_at ?? s.created_at;
  if (!ref) return null;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((nowMs - t) / 86400000);
}

/** 현재 단계가 목표 체류일(SLA)을 초과해 정체 상태인지. 8·churned 등 SLA 미정 단계는 항상 false. */
export function isStageStalled(
  s: Pick<Student, 'funnel_stage' | 'funnel_stage_updated_at' | 'created_at'>,
  nowMs: number
): boolean {
  const sla = FUNNEL_STAGE_SLA_DAYS[s.funnel_stage];
  if (sla === undefined) return false;
  const days = daysInStage(s, nowMs);
  return days !== null && days > sla;
}

// ─── "오늘 할 일" 헬퍼 (KST 당일 기준) ─────────────────────────────────────────
// 한국 팀 기준이므로 "오늘"은 Asia/Seoul 자정 경계로 판정한다.
// (UTC 기준으로 자르면 KST 오전 9시에 날짜가 바뀌어 명단이 오전에 리셋되는 버그가 생김)

/** 주어진 epoch ms를 KST 기준 'YYYY-MM-DD' 문자열로 변환. */
export function kstDateStr(ms: number): string {
  // KST = UTC+9, DST 없음. ms에 9시간 더한 뒤 UTC 날짜를 읽으면 KST 날짜가 된다.
  return new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
}

/** daily_action_done_at이 KST 기준 오늘이면 true (오늘 액션 완료 처리됨). */
export function isActionDoneToday(
  s: Pick<Student, 'daily_action_done_at'>,
  nowMs: number
): boolean {
  if (!s.daily_action_done_at) return false;
  const t = new Date(s.daily_action_done_at).getTime();
  if (Number.isNaN(t)) return false;
  return kstDateStr(t) === kstDateStr(nowMs);
}

/** consultation_timeline 중 KST 기준 오늘 작성된 메모만 최신순으로 반환. */
export function todaysMemos(
  s: Pick<Student, 'consultation_timeline'>,
  nowMs: number
): ConsultationEntry[] {
  const today = kstDateStr(nowMs);
  return (s.consultation_timeline ?? [])
    .filter((e) => {
      const t = new Date(e.created_at).getTime();
      return !Number.isNaN(t) && kstDateStr(t) === today;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ─── 리드 A/B/C 등급 (Hot/Warm/Cold) ──────────────────────────────────────────
export const LEAD_TIER_OPTIONS: LeadTier[] = ['A', 'B', 'C'];
export const LEAD_TIER_LABELS: Record<LeadTier, string> = {
  A: 'A (Hot)',
  B: 'B (Warm)',
  C: 'C (Cold)',
};
// 등급별 추천 세일즈 방식 (카드 배지 등 짧은 표기)
export const LEAD_TIER_APPROACH: Record<LeadTier, string> = {
  A: '전화풀',
  B: '비동기',
  C: '자동화',
};

// 자동 분류 임계값 (운영 기준이 바뀌면 여기만 수정)
const TIER_IMMINENT_DAYS = 60; // 시험일 임박 = 60일 이내
const TIER_COLD_NO_CONTACT_DAYS = 14; // 14일 초과 미연락 = 저관여

/**
 * 데이터 기반 자동 등급 분류 (제안값).
 * - A(Hot): 소개/추천 유입, 또는 목표점수가 있고 시험일이 임박(0~60일).
 * - C(Cold): 14일 초과 미연락(저관여/응답 느림).
 * - B(Warm): 그 외 기본 (신규 미연락 리드 포함 — 아직 Cold는 아님).
 * 우선순위: A → C → B.
 */
export function autoLeadTier(
  s: Pick<Student, 'traffic_source' | 'target_score' | 'target_test_date' | 'last_contacted_at'>,
  nowMs: number
): LeadTier {
  // A: 소개/추천 유입
  if (s.traffic_source === '소개/추천') return 'A';
  // A: 목표점수 있음 + 시험일 임박
  if (s.target_score != null && s.target_test_date) {
    const testMs = new Date(s.target_test_date).getTime();
    if (!Number.isNaN(testMs)) {
      const daysUntil = (testMs - nowMs) / 86400000;
      if (daysUntil >= 0 && daysUntil <= TIER_IMMINENT_DAYS) return 'A';
    }
  }
  // C: 오래 미연락 (저관여)
  if (s.last_contacted_at) {
    const lastMs = new Date(s.last_contacted_at).getTime();
    if (!Number.isNaN(lastMs) && (nowMs - lastMs) / 86400000 > TIER_COLD_NO_CONTACT_DAYS)
      return 'C';
  }
  return 'B';
}

/** 표시·필터에 쓰는 최종 등급: 수동 확정값 우선, 없으면 자동 분류. */
export function effectiveLeadTier(
  s: Pick<
    Student,
    'lead_tier' | 'traffic_source' | 'target_score' | 'target_test_date' | 'last_contacted_at'
  >,
  nowMs: number
): LeadTier {
  return s.lead_tier ?? autoLeadTier(s, nowMs);
}

export const MATCHING_STAGE_LABELS: Record<MatchingStage, string> = {
  schedule_pending: '스케줄 입력 대기',
  schedule_done: '스케줄 입력 완료',
  offer_sent: '코치 제안 발송',
  awaiting_response: '코치 응답 대기',
  matched: '매칭 확정',
};

export const INQUIRY_CHANNEL_OPTIONS: InquiryChannel[] = [
  '카톡',
  '네이버 상담시트',
  '구글 상담시트',
  '전화',
  '상담 예약',
  '진단테스트 신청',
  '인스타그램 링크',
];

export const TRAFFIC_SOURCE_OPTIONS: TrafficSource[] = [
  '인스타그램 광고',
  '인스타그램 오가닉',
  '구글폼에서 즉시상담',
  '네이버 검색 후 상담예약',
  '네이버 카페',
  '(구)랜딩페이지 즉시상담',
  '(구)랜딩페이지 상담예약',
  '(신)랜딩 페이지 상담예약',
  '공식 블로그',
  '브런치',
  '책',
  '소개/추천',
  '레딧',
  'B2B 파트너',
  '기존DB',
  '대표전화',
];

export const CONTENT_AUTHOR_OPTIONS: ContentAuthor[] = ['배병윤', '이민재', '김우영', '장현아'];

export const B2B_PARTNER_OPTIONS: B2BPartner[] = [
  '해연',
  '커넥티드에듀',
  '부산프레스티지',
  '인사이트 컨설팅',
  '신화 유학원',
  '미소남',
  'InArt',
  '박정 어학원',
  '솔로몬에듀',
  'Admission AG',
  '공부하는 아이들',
  '옹글리쉬',
];

export const CAMPAIGN_TAG_PRESETS = ['기존DB 재활성화', '여름특강'] as const;

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  phone: '핸드폰',
  kakao: '카카오톡',
  email: '이메일',
};

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  '한국 학제': '한국 학제',
  AP: 'AP',
  IB: 'IB',
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
  { label: '사이판 (ChST)', value: 'Pacific/Saipan' },
] as const;

export const TIMEZONE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TIMEZONE_OPTIONS.map((o) => [o.value, o.label])
);

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  active: '활성',
  inactive: '비활성',
  reactivating: '재활성화 시도 중',
  enrolled: '수강 중',
};

export const CHURN_TAG_OPTIONS = ['회신 없음', '노쇼', '미응시', '미결제', '기타'] as const;

export const GRADE_OPTIONS = ['7th', '8th', '9th', '10th', '11th', '12th', '졸업', '기타'] as const;

export type Grade = (typeof GRADE_OPTIONS)[number];

export const GRADE_OPTIONS_BY_SCHOOL_TYPE: Record<string, string[]> = {
  '한국 학제': ['초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '재수', '성인'],
  AP: ['7th', '8th', '9th', '10th', '11th', '12th', '졸업', '기타'],
  IB: ['Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', '졸업', '기타'],
};

export type ChurnTag = (typeof CHURN_TAG_OPTIONS)[number];

// 선제 진단 인사이트 브리핑 API 계약 — insight-brief 라우트와 CrmInsightBanner가 공유.
export type InsightBriefMode = 'diagnosis' | 'weekly';

export interface InsightBriefArea {
  title: string;
  severity: 'critical' | 'warn';
  why: string;
  suggestion: string;
  question?: string;
  lens?: string; // 심화(deep) 전용 — 적용한 구루 렌즈명 (예: 'Hormozi')
  evidence?: string; // 심화(deep) 전용 — 메모/웹 근거 한 줄
}

// lead_status → ParentStatus 매핑
export function getParentStatus(leadStatus: LeadStatus): ParentStatus {
  if (leadStatus === 'enrolled') return 'done';
  return 'new';
}
