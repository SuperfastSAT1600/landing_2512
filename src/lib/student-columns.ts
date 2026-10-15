// CRM 학생(students) 조회 컬럼 — `select('*')` 대신 쓴다.
// embedding(유사 학생 검색용 벡터)은 학생 1명당 약 19KB로 행 크기의 90% 이상인데 화면에서 쓰지 않는다.
// 이탈 리드풀처럼 수천 명을 내려줄 때 응답이 11MB가 되던 원인이라 뺀다(임베딩 검색은 RPC가 DB 안에서 처리).
// passcode_*(마이페이지 비밀번호)도 화면에 쓰지 않으므로 브라우저로 내려보내지 않는다.
// students에 컬럼을 추가하면 여기에도 추가한다. Student 타입의 필드가 빠지면 타입 검사에서 잡힌다.
import type { Student } from '@/types/crm';

export const STUDENT_COLUMN_LIST = [
  'id', 'name', 'grade', 'school_type', 'parent_phone', 'previous_rw_score', 'previous_math_score',
  'previous_score_status', 'target_score', 'target_test_date', 'desired_subjects', 'parent_timezone',
  'ot_datetime', 'weekly_schedule', 'funnel_stage', 'churn_tag', 'churn_type', 'diagnostic_result_id',
  'consultation_timeline', 'created_at', 'updated_at', 'matching_stage', 'inquiry_date', 'contact_type',
  'target_test_date_2', 'lead_status', 'inquiry_channel', 'traffic_source', 'content_author', 'lead_type',
  'b2b_partner', 'campaign_tags', 'last_contacted_at', 'reactivation_log', 'portal_token',
  'preferred_language', 'ad_name', 'adset_name', 'previous_test_date', 'target_score_2', 'retry_strategy_id',
  'retry_stage', 'portal_name', 'initial_strategy_id', 'retry_assigned_at', 'initial_contact_strategy_id',
  'sort_order', 'funnel_stage_updated_at', 'stage_history', 'strategy_history', 'entered_by',
  'strategy_ai_messages', 'churn_stage_manual', 'daily_action_done_at', 'is_vip', 'sfv2_profile_id',
  'comm_language', 'diagnostic_funnel_stage', 'first_message_sent_at', 'kakao_chat_created',
  'signup_done_at', 'signup_token', 'signup_token_created_at', 'platform_user_id', 'referral_student_id',
  'referral_student_name', 'company_id', 'service_status', 'inactive_at', 'needs_attention', 'meta_lead_id',
] as const;

// Student 타입의 모든 필드가 목록에 있는지 컴파일 타임에 확인한다
type MissingFromList = Exclude<keyof Student, (typeof STUDENT_COLUMN_LIST)[number]>;
const _exhaustive: [MissingFromList] extends [never] ? true : MissingFromList = true;
void _exhaustive;

// supabase-js의 select 타입 파서는 동적 문자열을 해석하지 못한다(GenericStringError).
// 런타임 값은 컬럼 목록이고, 타입은 기존 select('*')와 같게 둔다(이 클라이언트는 DB 타입 없이 쓴다).
export const STUDENT_COLUMNS = STUDENT_COLUMN_LIST.join(', ') as '*';
