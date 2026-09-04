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
  | '소개'
  | 'B2B 파트너'
  | '인스타그램 광고'
  | '(구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT'
  | '(구) 랜딩 구글폼 상담 예약'
  | '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
  | '(신) 랜딩 즉시 카톡 상담 - [T] SuperfastSAT'
  | '(신) 랜딩 구글폼 상담 예약'
  | '네이버 블로그 메인 페이지 히어로 섹션 카톡 - [B]SuperfastSAT'
  | '네이버 블로그 게시물'
  | '네이버 카페'
  | '브런치 카톡 - [BR]SuperfastSAT'
  | '고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)'
  | '고스트블로그 게시물 푸터 카톡 - [BR]SuperfastSAT'
  | '대표전화'
  | '인스타그램 오가닉'
  | '책'
  | '레딧'
  | '기존DB';

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
  ai_purified?: string; // 학부모 공개본 (AI 초안 또는 직접 작성)
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
  b2b_partner: B2BPartner | null; // @deprecated 전환기 듀얼 라이트용. 정본은 company_id.
  company_id: string | null; // B2B 업체 FK → companies(id). lead_type='B2B'일 때 사용.
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
  matching_stage: MatchingStage | null; // funnel_stage='8'(결제 완료) 이후
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

  // 세일즈 전략 AI 대화 기록 — 패널 재진입 시 이어서 진행
  strategy_ai_messages: StrategyChatMessage[];

  // 결제완료 → 회원가입/카톡 단톡방 온보딩 추적 (최초 세일즈 칸반 8번 컬럼)
  kakao_chat_created: boolean | null; // 카톡 단톡방 개설 완료 여부
  signup_done_at: string | null; // 회원가입 완료 처리 시각. null=미완료(8번에 표시)
  signup_token: string | null; // 플랫폼 회원가입 링크 토큰 (students select * 로 이미 로드됨)

  funnel_stage_updated_at: string | null;
  stage_history: Array<{ stage: string; label: string; entered_at: string }>;
  // 수동 지정 이탈 단계 (null이면 stage_history 기반 자동 도출)
  churn_stage_manual: FunnelStage | null;
  // "오늘 할 일" 액션 완료 체크 시각. KST 당일이면 완료로 판정(isActionDoneToday)
  daily_action_done_at: string | null;
  sort_order: number | null;
  entered_by?: string | null;
  is_vip: boolean | null;
  needs_attention: boolean | null; // 세일즈 단계에서 표시 → 결제 후 운영 담당자가 확인
  created_at: string;
  updated_at: string;
}

export interface StrategyChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type RetryStage = '연락 시도' | '상담 중' | '제안 완료';
export const RETRY_STAGES: RetryStage[] = ['연락 시도', '상담 중', '제안 완료'];

// 재결제 세일즈 칸반 단계. 4(결제 완료)·5(미전환)는 터미널 — 드래그로 진입/이탈하지 않는다.
export type RenewalStage = '1' | '2' | '3' | '4' | '5';
export const RENEWAL_STAGES: RenewalStage[] = ['1', '2', '3', '4', '5'];
/** 아직 결과가 확정되지 않은 단계 — 주차별 '진행 중' 분자. */
export const RENEWAL_OPEN_STAGES: RenewalStage[] = ['1', '2', '3'];
export const RENEWAL_STAGE_LABELS: Record<RenewalStage, string> = {
  '1': '최초 컨택 전',
  '2': '컨택 중',
  '3': '결제 대기',
  '4': '결제 완료',
  '5': '미전환',
};
/**
 * 결과 사유 — 품질에 따라 목록이 다르다.
 * '예산'과 '졸업'을 한 목록에 두면 "예산 부담인데 좋은 이탈" 같은 어긋난 조합이 생긴다.
 */
export const RENEWAL_PAID_REASONS: Record<RenewalOutcomeQuality, readonly string[]> = {
  good: ['성적 향상', '수업 만족', '목표 상향·과목 추가', '먼저 연장 요청', '기타'],
  bad: ['할인·조건 요구', '마지못해 연장', '단기만 결제', '강사 교체 조건', '기타'],
};
export const RENEWAL_DROP_REASONS: Record<RenewalOutcomeQuality, readonly string[]> = {
  good: ['목표 점수 달성', '졸업·유학 확정', '계획된 종료', '기타'],
  bad: ['예산 부담', '성적 불만족', '강사·수업 불만', '타학원 이전', '응답 없음', '기타'],
};

/** stage 4는 재결제 사유, stage 5는 이탈 사유. */
export function getRenewalOutcomeReasons(
  stage: RenewalStage,
  quality: RenewalOutcomeQuality
): readonly string[] {
  return stage === '5' ? RENEWAL_DROP_REASONS[quality] : RENEWAL_PAID_REASONS[quality];
}

/** 터미널 단계에 도달한 대상의 결과 품질. 값이 단계에 따라 다르게 읽히므로 라벨을 분리한다. */
export const RENEWAL_OUTCOME_QUALITIES = ['good', 'bad'] as const;
export type RenewalOutcomeQuality = (typeof RENEWAL_OUTCOME_QUALITIES)[number];
export const RENEWAL_PAID_QUALITY_LABELS: Record<RenewalOutcomeQuality, string> = {
  good: '좋은 재결제',
  bad: '나쁜 재결제',
};
export const RENEWAL_DROP_QUALITY_LABELS: Record<RenewalOutcomeQuality, string> = {
  good: '좋은 이탈',
  bad: '나쁜 이탈',
};

/** 다음 주차로 넘어가 종결된 행인지. 진행 중 집계·액션 노출의 단일 판정 기준. */
export function isRenewalCarried(target: Pick<RenewalTarget, 'carried_to_week'>): boolean {
  return target.carried_to_week != null;
}

/** stage 4는 재결제의 질, stage 5는 이탈의 질. 그 외 단계엔 품질이 없다. */
export function getRenewalOutcomeQualityLabel(
  stage: RenewalStage,
  quality: RenewalOutcomeQuality
): string {
  return stage === '5' ? RENEWAL_DROP_QUALITY_LABELS[quality] : RENEWAL_PAID_QUALITY_LABELS[quality];
}

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
  segment: 'b2c' | 'b2b'; // B2B/B2C 전략 분리 (097)
  created_at: string;
}

// ─── B2B 업체 (파트너) ───────────────────────────────────────────────────────

/** B2B 소개/공급 파트너 업체. students.company_id 로 연결, 매출은 payments 조인으로 귀속. */
export interface Company {
  id: string;
  name: string; // 업체명 (UNIQUE)
  contact_person: string | null; // 담당자
  contact_phone: string | null;
  contact_email: string | null;
  contract_terms: string | null; // 계약조건(수수료율/정산주기 등 자유서술)
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyInput {
  name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contract_terms?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// ─── 주차별 계획 (목표 수치 + 실행 체크리스트) ───────────────────────────────

export type WeeklyPlanSegment = 'b2c' | 'b2b';

/** 목표 설정 가능한 지표 — b2c/b2b stats overview 교집합. */
export type WeeklyPlanMetricKey = 'leads' | 'contacted' | 'paid' | 'revenue' | 'net_revenue';

export const WEEKLY_PLAN_METRIC_LABELS: Record<WeeklyPlanMetricKey, string> = {
  leads: '신규 리드',
  contacted: '컨택',
  paid: '결제',
  revenue: '매출',
  net_revenue: '실수익',
};

/** 원화(정수) 지표 — 표시 포맷 분기용. 나머지는 건수. */
export const WEEKLY_PLAN_CURRENCY_METRICS: WeeklyPlanMetricKey[] = ['revenue', 'net_revenue'];

export const WEEKLY_PLAN_METRIC_KEYS: WeeklyPlanMetricKey[] = [
  'leads',
  'contacted',
  'paid',
  'revenue',
  'net_revenue',
];

export interface WeeklyPlanTarget {
  key: WeeklyPlanMetricKey;
  label: string; // 스냅샷(라벨 변경돼도 과거 주차 보존)
  target_value: number;
}

export interface WeeklyPlanAction {
  id: string; // crypto.randomUUID() (클라이언트 생성)
  text: string;
  done: boolean;
  done_at: string | null;
  owner?: string | null;
}

/** 이번 주 밀어보는 전략 1건. 전략명·타입은 스냅샷(전략 삭제·개명 후에도 과거 주차 보존). */
export interface WeeklyFocusStrategy {
  id: string; // crypto.randomUUID() (클라이언트 생성)
  strategy_id: string;
  strategy_name: string;
  type: StrategyHistoryType;
  goal: string; // "결제 3건" 같은 자유 텍스트 목표
  memo: string; // 왜 이 전략인가
  carried_from_week?: string | null; // 회고 이어받기 출처 week_start
}

export interface WeeklyRetroNextAction {
  id: string;
  text: string;
  carried_to?: string | null; // 이어받은 주차 week_start (미이관이면 null)
}

export interface WeeklyRetrospective {
  went_well: string;
  went_wrong: string;
  next_actions: WeeklyRetroNextAction[];
  updated_at: string | null;
}

export const EMPTY_RETROSPECTIVE: WeeklyRetrospective = {
  went_well: '',
  went_wrong: '',
  next_actions: [],
  updated_at: null,
};

/** 회고가 실질적으로 작성됐는지 — 배너 노출 판정 */
export function isRetroFilled(retro: WeeklyRetrospective | null | undefined): boolean {
  if (!retro) return false;
  return (
    retro.went_well.trim().length > 0 ||
    retro.went_wrong.trim().length > 0 ||
    (retro.next_actions ?? []).some((a) => a.text.trim().length > 0)
  );
}

/** 자동 집계 밖 활동 기록 1건 */
export interface WeeklyExecutionNote {
  id: string;
  text: string;
  created_at: string;
}

/** 주간 실행 집계 — 전략을 적용받은 리드 1명 */
export interface WeeklyExecutionLead {
  student_id: string;
  name: string;
  applied_at: string;
  memo: string;
  contacted: boolean;
  paid: boolean;
  revenue: number;
}

/** 주간 실행 집계 — 전략 1건 (그 주에 적용된 모든 이력 기준) */
export interface WeeklyExecutionRow {
  strategy_id: string;
  strategy_name: string;
  type: StrategyHistoryType;
  planned: boolean; // 트랙에 연결돼 있었는지 (false면 '계획 외 실행')
  applied_count: number;
  contacted_count: number;
  paid_count: number;
  revenue: number;
  leads: WeeklyExecutionLead[];
}

// ─── 주간 실행 트랙 (목표 하나 + 그 목표를 위한 실행 항목들) ─────────────────
// 주차 계획 문서의 위계("세그먼트 → 목표를 가진 트랙 → 실행 항목 a·b·c")를 그대로 담는다.

/** 트랙 진행률을 자동 계산할 지표 — 트랙에 연결된 전략의 적용 리드 기준(주 전체 실적이 아니다). */
export type WeeklyTrackMetric = 'applied' | 'contacted' | 'paid' | 'revenue';

export const WEEKLY_TRACK_METRIC_KEYS: WeeklyTrackMetric[] = [
  'applied',
  'contacted',
  'paid',
  'revenue',
];

export const WEEKLY_TRACK_METRIC_LABELS: Record<WeeklyTrackMetric, string> = {
  applied: '적용 리드',
  contacted: '컨택',
  paid: '결제',
  revenue: '매출',
};

/** 트랙 안의 실행 항목 1건. 전략을 연결하면 그 전략의 주간 집계가 트랙 진행률에 반영된다. */
export interface WeeklyTrackItem {
  id: string; // crypto.randomUUID() (클라이언트 생성)
  text: string;
  done: boolean;
  done_at: string | null;
  strategy_id: string | null; // 전략 라이브러리 연결 (선택)
  strategy_name: string | null; // 스냅샷(전략 삭제·개명 후에도 과거 주차 보존)
  strategy_type: StrategyHistoryType | null; // 스냅샷
}

/** 목표 하나 + 그 목표를 위한 실행 항목들. */
export interface WeeklyTrack {
  id: string; // crypto.randomUUID() (클라이언트 생성)
  name: string; // "신규리드", "이탈 리드 캠페인", "소프트웨어 판매"
  goal_text: string; // "인스타리드 2건 결제" — 문서에 쓰던 문장 그대로
  metric: WeeklyTrackMetric | null; // null이면 수동 달성 체크로만 판정
  target_value: number; // metric이 있을 때만 의미
  achieved: boolean; // metric === null 인 목표의 수동 달성 체크
  items: WeeklyTrackItem[];
  carried_from_week?: string | null; // 회고 이어받기 출처 week_start
}

export interface WeeklyPlan {
  id: string;
  segment: WeeklyPlanSegment;
  week_start: string; // YYYY-MM-DD
  tracks: WeeklyTrack[]; // 현행 계획 단위. 레거시 주차는 focus_strategies+actions에서 파생된다.
  /** @deprecated 트랙 파생 소스로만 남는다(과거 주차 보존). 새 UI는 쓰지 않는다. */
  targets: WeeklyPlanTarget[];
  /** @deprecated 트랙 파생 소스로만 남는다. */
  actions: WeeklyPlanAction[];
  /** @deprecated 트랙 파생 소스로만 남는다. */
  focus_strategies: WeeklyFocusStrategy[];
  retrospective: WeeklyRetrospective;
  execution_notes: WeeklyExecutionNote[];
  created_at: string;
  updated_at: string;
}

/** GET /api/crm/weekly-plan 응답 */
export interface WeeklyPlanResponse {
  plan: WeeklyPlan | null; // 아직 미작성 주차면 null
  actuals: Partial<Record<WeeklyPlanMetricKey, number>>;
  week: { start: string; end: string; label: string };
  execution: WeeklyExecutionRow[]; // 그 주에 적용된 전략 실행 집계 (계획 먼저)
  prev: { week_start: string; week_label: string; retro_filled: boolean } | null;
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
  segment: 'b2c' | 'b2b'; // B2B/B2C 전략 분리 (097)
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
> & {
  company_id?: string | null; // B2B 업체 FK (선택; 리드 인입 경로에선 미지정)
};

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
  '소개',
  'B2B 파트너',
  '인스타그램 광고',
  '(구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT',
  '(구) 랜딩 구글폼 상담 예약',
  '랜딩 상담 예약 폼 카톡 - SuperfastSAT!',
  '(신) 랜딩 즉시 카톡 상담 - [T] SuperfastSAT',
  '(신) 랜딩 구글폼 상담 예약',
  '네이버 블로그 메인 페이지 히어로 섹션 카톡 - [B]SuperfastSAT',
  '네이버 블로그 게시물',
  '네이버 카페',
  '브런치 카톡 - [BR]SuperfastSAT',
  '고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)',
  '고스트블로그 게시물 푸터 카톡 - [BR]SuperfastSAT',
  '대표전화',
  '인스타그램 오가닉',
  '책',
  '레딧',
  '기존DB',
];

export const CONTENT_AUTHOR_OPTIONS: ContentAuthor[] = ['배병윤', '이민재', '김우영', '장현아'];

/** @deprecated companies 테이블 시드 소스로만 유지. 런타임 드롭다운은 useCompanies() 사용. */
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

// 인사이트/전략 대화 분석 기간(YYYY-MM-DD). 없으면 "오늘로부터 직전 한 달(최근 30일)" 기본.
export interface InsightPeriod {
  from: string;
  to: string;
}

export interface InsightBriefArea {
  title: string;
  severity: 'critical' | 'warn';
  why: string;
  suggestion: string;
  question?: string;
  evidence?: string; // 심화(deep) 전용 — 메모/웹 근거 한 줄
}

// lead_status → ParentStatus 매핑
export function getParentStatus(leadStatus: LeadStatus): ParentStatus {
  if (leadStatus === 'enrolled') return 'done';
  return 'new';
}

// ─── Winback Play (윈백 플레이) ───────────────────────────────────────────────
// 이탈 리드에게 특정 상품(AP/SAT 수업권)을 파는 캠페인 단위 실행/측정 로그.
// 정본은 winback_* 테이블(마이그레이션 107). students.reactivation_log/consultation_timeline에는
// 사람이 읽는 미러 엔트리만 남긴다 — 기존 재활성화 UI·활동 피드를 그대로 재사용하기 위함.

export type WinbackPlayStatus = 'draft' | 'running' | 'done' | 'archived';
export type WinbackTargetStatus = 'candidate' | 'queued' | 'sent' | 'skipped';
export type WinbackResponse = 'none' | 'positive' | 'negative' | 'later';

/** 추천 사전필터. SQL로 거는 것과 JS로 거는 것이 섞여 있다(prefilter.ts 참조). */
export interface WinbackRuleFilters {
  grades?: string[];
  school_types?: string[];
  campaign_tag_any?: string[]; // 과목 의도의 정본 신호 (예: 'AP 문의')
  churn_types?: ChurnType[];
  churn_tag_prefixes?: string[]; // churn_tag는 "{태그}: {사유}" 형식
  churn_stages?: string[]; // effectiveChurnStage 결과 (JS 후처리)
  traffic_sources?: TrafficSource[];
  churned_within_days?: number; // 이탈 후 N일 이내
  churned_after_days?: number; // 이탈 후 최소 N일 경과
  exclude_recent_contact_days?: number;
  include_reactivating?: boolean; // 기본 true
}

/** 규칙 스코어의 매치 내역 — UI 근거 칩 + 사후 가중치 튜닝용. */
export interface WinbackSignal {
  key: string;
  label: string;
  delta: number;
}

export interface WinbackPlay {
  id: string;
  title: string;
  product_brief: string;
  product_category: ProductCategory | null;
  product_price: number | null;
  product_hours: number | null;
  target_exam_date: string | null;
  audience_hint: string | null;
  rule_filters: WinbackRuleFilters;
  score_weights: Record<string, number> | null;
  conversion_window_days: number;
  contact_cooldown_days: number;
  status: WinbackPlayStatus;
  retrospective: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WinbackPlayVariant {
  id: string;
  play_id: string;
  name: string;
  angle: string | null;
  sort_order: number;
  created_at: string;
}

export interface WinbackTarget {
  id: string;
  play_id: string;
  student_id: string;
  variant_id: string | null;
  rank: number | null;
  score: number | null;
  rule_score: number | null;
  similarity: number | null;
  llm_fit: number | null;
  reason: string | null;
  signals: WinbackSignal[];
  status: WinbackTargetStatus;
  message_draft: string | null;
  sent_message: string | null;
  message_generated_at: string | null;
  message_model: string | null;
  sent_at: string | null;
  sent_by: string | null;
  sent_channel: string;
  response: WinbackResponse | null;
  responded_at: string | null;
  reconnected_at: string | null;
  converted_payment_id: string | null;
  converted_at: string | null;
  conversion_amount: number | null;
  conversion_source: 'auto' | 'manual' | null;
  reactivation_entry_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 타겟 + 화면 표시에 필요한 학생 요약(조인 결과). */
export interface WinbackTargetWithStudent extends WinbackTarget {
  student: Pick<Student, 'id' | 'name' | 'grade' | 'parent_phone' | 'lead_status' | 'churn_tag'>;
}

// 재결제 세일즈 관리 대상 — 주차별 코호트 1행. 재결제는 생애주기 동안 반복되므로
// students 컬럼을 덮어쓰지 않고 renewal_targets 에 주차별 파이프라인 상태를 저장한다.
export interface RenewalTarget {
  id: string;
  student_id: string;
  week_start: string;                     // YYYY-MM-DD — 선정 주차(코호트)
  stage: RenewalStage;
  stage_updated_at: string;
  converted_payment_id: string | null;    // stage '4' 에서만 채워진다
  drop_reason: string | null;             // stage '5' 에서만 채워진다
  memo: string | null;                    // 카드 메모 — 단계와 무관하게 기록. 이월 시 따라가지 않는다
  outcome_quality: RenewalOutcomeQuality | null;  // stage '4'·'5' 에서만 채워진다. null = 미분류
  outcome_reason_tag: string | null;      // 품질별 사유 목록에서 고른 값. 품질이 있으면 필수
  outcome_reason_note: string | null;     // 사유 자유 메모 — 선택
  carried_to_week: string | null;         // 이월된 대상 주차 — NOT NULL 이면 종결(진행 중 아님)
  carried_from_week: string | null;       // 이월돼 들어온 출처 주차 — null 이면 그 주차 신규 선정
  created_by: string | null;
  created_at: string;
  updated_at: string;
  student?: RenewalTargetStudent;         // API가 join해서 내려줄 때만 존재
}

/** renewal-targets API가 join해 내려주는 학생 부분집합 (route.ts의 STUDENT_FIELDS와 일치). */
export type RenewalTargetStudent = Pick<
  Student,
  'id' | 'name' | 'grade' | 'parent_phone' | 'is_vip' | 'needs_attention' | 'traffic_source' | 'lead_type'
>;

export interface RenewalWeeklyStat {
  week_start: string;
  week_label: string;
  selected: number;   // 그 주차에 선정된 전체 인원 (전환율 분모)
  open: number;       // 1~3단계 (결과 미확정)
  completed: number;  // 4단계
  dropped: number;    // 5단계
  conversion_rate: number;
  // 결과 품질 분포. 미분류는 별도 필드 없이 completed/dropped 에서 빼서 구한다.
  good_completed: number;
  bad_completed: number;
  good_dropped: number;
  bad_dropped: number;
  // 이월은 두 축이다 — carried_out 은 open/completed/dropped 와 함께 selected 를 배타 분할하고,
  // carried_in 은 selected 자체를 '신규 / 이월유입'으로 분할한다. 섞어 쓰면 안 된다.
  carried_out: number;
  carried_in: number;
}

/** 추천 API 응답 1건 — 아직 저장되지 않은 후보. */
export interface WinbackCandidate {
  student_id: string;
  name: string;
  grade: string;
  churn_tag: string | null;
  rank: number;
  score: number;
  rule_score: number;
  similarity: number | null;
  llm_fit: number | null;
  reason: string;
  signals: WinbackSignal[];
  last_memo: string | null;
}

/** 추천 파이프라인 진단 — degrade를 조용히 숨기지 않기 위해 항상 함께 반환한다. */
export interface WinbackRecommendStats {
  prefiltered: number;
  /** AI가 실제로 심사한 인원(RERANK_POOL). 나머지는 규칙 점수로 backfill된다. */
  reranked?: number;
  /** 그중 유효한 판정이 돌아온 인원. reranked보다 작으면 응답 누락·환각 id가 있었다는 뜻. */
  judged?: number;
  embedded: number;
  llm_used: boolean;
  embedding_used: boolean;
  degraded_reason?: string;
}
