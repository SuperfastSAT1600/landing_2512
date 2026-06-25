import type { Student } from '@/types/crm';

export interface EditForm {
  name: string; portal_name: string; grade: string; school_type: string; contact_type: string;
  parent_phone: string; parent_timezone: string; desired_subjects: string;
  previous_score_status: string; previous_test_date: string;
  previous_rw_score: string; previous_math_score: string;
  target_score: string; target_score_2: string;
  target_test_date: string; target_test_date_2: string;
  inquiry_date: string; inquiry_channel: string; traffic_source: string;
  content_author: string; lead_type: string; b2b_partner: string;
  preferred_language: string; lead_tier: string;
  first_message_sent_at: string; // datetime-local 문자열 (로컬 시각, "YYYY-MM-DDTHH:mm")
  referral_student_id: string; referral_student_name: string; // 소개/추천 소개자
}

/** ISO timestamp → datetime-local input 값("YYYY-MM-DDTHH:mm", 로컬 시각). 없으면 ''. */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local input 값 → 저장용 ISO timestamp. 비어있으면 null. */
export function fromDatetimeLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * naive timestamp("YYYY-MM-DDTHH:mm:ss" 또는 "YYYY-MM-DD HH:mm:ss") → datetime-local input 값.
 * 타임존 변환 없이 문자열만 정규화한다(드리프트 방지). 날짜만 있으면 ""으로 시각 보정.
 */
export function toDatetimeLocalNaive(s: string | null): string {
  if (!s) return '';
  const norm = s.replace(' ', 'T');
  // "YYYY-MM-DD"만 있으면 자정으로 간주
  return norm.length <= 10 ? `${norm}T00:00` : norm.slice(0, 16);
}

export function studentToEditForm(s: Student): EditForm {
  return {
    name: s.name, portal_name: s.portal_name ?? '', grade: s.grade, school_type: s.school_type,
    contact_type: s.contact_type ?? 'phone', parent_phone: s.parent_phone,
    parent_timezone: s.parent_timezone ?? 'Asia/Seoul', desired_subjects: s.desired_subjects,
    previous_score_status: s.previous_score_status,
    previous_test_date: s.previous_test_date ?? '',
    previous_rw_score: s.previous_rw_score?.toString() ?? '',
    previous_math_score: s.previous_math_score?.toString() ?? '',
    target_score: s.target_score?.toString() ?? '',
    target_score_2: s.target_score_2?.toString() ?? '',
    target_test_date: s.target_test_date ?? '', target_test_date_2: s.target_test_date_2 ?? '',
    inquiry_date: toDatetimeLocalNaive(s.inquiry_date), inquiry_channel: s.inquiry_channel ?? '',
    traffic_source: s.traffic_source ?? '', content_author: s.content_author ?? '',
    lead_type: s.lead_type ?? 'B2C', b2b_partner: s.b2b_partner ?? '',
    preferred_language: s.preferred_language ?? '',
    lead_tier: s.lead_tier ?? '',
    first_message_sent_at: toDatetimeLocal(s.first_message_sent_at),
    referral_student_id: s.referral_student_id ?? '',
    referral_student_name: s.referral_student_name ?? '',
  };
}

export interface StudentDetailPanelProps {
  student: Student;
  adminKey: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
  onDelete?: (id: string) => void;
}
