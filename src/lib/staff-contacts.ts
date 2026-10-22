// 학생별 연락 기록 저장소. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface ContactLog {
  id: string;
  studentId: string;
  studentName: string;
  contactedAt: string;
  staffId: string;
  staffName: string;
  briefingDate: string;
  listKey: string | null;
  note: string | null;
}

export interface NewContact {
  studentId: string;
  studentName: string;
  staffId: string;
  staffName: string;
  briefingDate: string;
  listKey: string | null;
  note: string | null;
}

interface Row {
  id: string; student_id: string; student_name: string; contacted_at: string;
  staff_id: string; staff_name: string; briefing_date: string; list_key: string | null; note: string | null;
}

const COLUMNS = 'id, student_id, student_name, contacted_at, staff_id, staff_name, briefing_date, list_key, note';
const IN_CHUNK = 100;

const toLog = (r: Row): ContactLog => ({
  id: r.id, studentId: r.student_id, studentName: r.student_name, contactedAt: r.contacted_at,
  staffId: r.staff_id, staffName: r.staff_name, briefingDate: r.briefing_date, listKey: r.list_key, note: r.note,
});

/** 학생별 연락 이력, 최신순 */
export async function listContacts(studentIds: string[]): Promise<Record<string, ContactLog[]>> {
  const byStudent: Record<string, ContactLog[]> = Object.fromEntries(studentIds.map(id => [id, []]));
  for (let i = 0; i < studentIds.length; i += IN_CHUNK) {
    const { data, error } = await supabaseAdmin
      .from('student_contact_logs')
      .select(COLUMNS)
      .in('student_id', studentIds.slice(i, i + IN_CHUNK))
      .order('contacted_at', { ascending: false })
      .limit(5000);
    if (error) throw new Error(`student_contact_logs list: ${error.message}`);
    for (const row of (data ?? []) as Row[]) byStudent[row.student_id].push(toLog(row));
  }
  return byStudent;
}

export async function createContact(input: NewContact): Promise<ContactLog> {
  const { data, error } = await supabaseAdmin
    .from('student_contact_logs')
    .insert({
      student_id: input.studentId, student_name: input.studentName, staff_id: input.staffId,
      staff_name: input.staffName, briefing_date: input.briefingDate, list_key: input.listKey, note: input.note,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`student_contact_logs insert: ${error.message}`);
  return toLog(data as Row);
}

export async function getContact(id: string): Promise<ContactLog | null> {
  const { data, error } = await supabaseAdmin.from('student_contact_logs').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`student_contact_logs get: ${error.message}`);
  return data ? toLog(data as Row) : null;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('student_contact_logs').delete().eq('id', id);
  if (error) throw new Error(`student_contact_logs delete: ${error.message}`);
}
