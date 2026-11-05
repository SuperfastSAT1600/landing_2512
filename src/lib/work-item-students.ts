// 할 일에 연결한 학생 저장소. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { WORK_CHANNEL } from '@/lib/work-log';

const TABLE = 'work_item_students';
const SEARCH_LIMIT = 20;

export interface StudentOption {
  id: string;
  name: string;
  email: string | null;
}

interface ProfileRow { id: string; full_name: string | null; email: string | null }

const toOption = (p: ProfileRow): StudentOption => ({ id: p.id, name: p.full_name || '(이름 없음)', email: p.email });

export async function listWorkItemStudents(): Promise<Record<string, { id: string; name: string }>> {
  const { data, error } = await supabaseAdmin.from(TABLE).select('message_ts, student_id, student_name').eq('channel', WORK_CHANNEL);
  if (error) throw new Error(`${TABLE} list: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.message_ts, { id: r.student_id, name: r.student_name }]));
}

export async function setWorkItemStudent(messageTs: string, student: { id: string; name: string }, assignedBy: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).upsert({
    channel: WORK_CHANNEL, message_ts: messageTs, student_id: student.id, student_name: student.name,
    assigned_by: assignedBy, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`${TABLE} set: ${error.message}`);
}

export async function clearWorkItemStudent(messageTs: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('channel', WORK_CHANNEL).eq('message_ts', messageTs);
  if (error) throw new Error(`${TABLE} clear: ${error.message}`);
}

/** tutoring 학생을 이름으로 검색 */
export async function searchStudents(query: string): Promise<StudentOption[]> {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const { data, error } = await supabaseSFv2.from('profiles').select('id, full_name, email')
    .eq('role', 'student').ilike('full_name', pattern).order('full_name').limit(SEARCH_LIMIT);
  if (error) throw new Error(`profiles search: ${error.message}`);
  return ((data ?? []) as ProfileRow[]).map(toOption);
}

export async function findStudent(id: string): Promise<StudentOption | null> {
  const { data, error } = await supabaseSFv2.from('profiles').select('id, full_name, email').eq('role', 'student').eq('id', id).maybeSingle();
  if (error) throw new Error(`profiles find: ${error.message}`);
  return data ? toOption(data as ProfileRow) : null;
}
