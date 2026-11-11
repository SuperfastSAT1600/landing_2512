// 업무 로그에서 사람이 삭제(숨김)한 업무 저장소. Slack 글·tutoring 데이터는 건드리지 않는다. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';

const TABLE = 'work_log_dismissals';

/** slack: 운영 할 일(message_ts), contact: 수업 관리 업무(학생 profile id 또는 coach:<key>) */
export const DISMISS_KINDS = ['slack', 'contact'] as const;
export type DismissKind = (typeof DISMISS_KINDS)[number];

export interface Dismissal { name: string; by: string; at: string }

/** target_key → 삭제 기록 */
export async function listDismissals(kind: DismissKind): Promise<Record<string, Dismissal>> {
  const { data, error } = await supabaseAdmin.from(TABLE).select('target_key, target_name, dismissed_by, dismissed_at').eq('kind', kind);
  if (error) throw new Error(`${TABLE} list: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.target_key, { name: r.target_name, by: r.dismissed_by, at: new Date(r.dismissed_at).toISOString() }]));
}

export async function dismiss(kind: DismissKind, targetKey: string, targetName: string, by: string): Promise<Dismissal> {
  const at = new Date().toISOString();
  const { error } = await supabaseAdmin.from(TABLE).upsert({ kind, target_key: targetKey, target_name: targetName, dismissed_by: by, dismissed_at: at });
  if (error) throw new Error(`${TABLE} dismiss: ${error.message}`);
  return { name: targetName, by, at };
}

export async function restore(kind: DismissKind, targetKey: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('kind', kind).eq('target_key', targetKey);
  if (error) throw new Error(`${TABLE} restore: ${error.message}`);
}
