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
  preferred_language: string;
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
    inquiry_date: s.inquiry_date ?? '', inquiry_channel: s.inquiry_channel ?? '',
    traffic_source: s.traffic_source ?? '', content_author: s.content_author ?? '',
    lead_type: s.lead_type ?? 'B2C', b2b_partner: s.b2b_partner ?? '',
    preferred_language: s.preferred_language ?? '',
  };
}

export interface StudentDetailPanelProps {
  student: Student;
  adminKey: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
  onDelete?: (id: string) => void;
}
