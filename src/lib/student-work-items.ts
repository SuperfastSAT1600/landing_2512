// 학생이 지정된 운영 할 일(Slack 글)을 학생별로 모은다. 알바 연락 업무에서 같은 학생의 운영 기록을 보여 주는 데 쓴다. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchWorkItemsByTs, WORK_CHANNEL, type WorkItem } from '@/lib/work-log';

const IN_CHUNK = 100;

/** studentId → 운영 할 일(최신순). 할 일이 없는 학생은 키가 없다 */
export async function listStudentWorkItems(studentIds: string[]): Promise<Record<string, WorkItem[]>> {
  if (!studentIds.length) return {};
  const rows: { message_ts: string; student_id: string }[] = [];
  for (let i = 0; i < studentIds.length; i += IN_CHUNK) {
    const { data, error } = await supabaseAdmin.from('work_item_students').select('message_ts, student_id')
      .eq('channel', WORK_CHANNEL).in('student_id', studentIds.slice(i, i + IN_CHUNK));
    if (error) throw new Error(`work_item_students by student: ${error.message}`);
    rows.push(...(data ?? []));
  }

  const studentOf = new Map(rows.map((r) => [r.message_ts, r.student_id]));
  const byStudent: Record<string, WorkItem[]> = {};
  for (const item of await fetchWorkItemsByTs([...studentOf.keys()])) {
    const id = studentOf.get(item.messageTs)!;
    (byStudent[id] ??= []).push(item);
  }
  return byStudent;
}
