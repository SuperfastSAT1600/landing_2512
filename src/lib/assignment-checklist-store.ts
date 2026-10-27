import { supabaseAdmin } from '@/lib/supabase-admin';
import type { OpenChecklist } from '@/lib/assignment-checklist-reminder';

const TABLE = 'assignment_checklists';

export async function createChecklist(channel: string, messageTs: string, requestText: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).insert({ channel, message_ts: messageTs, request_text: requestText });
  if (error) throw new Error(`${TABLE} create: ${error.message}`);
}

/** 체크 상태 저장. 전부 체크면 completed_at 을 채우고, 하나라도 풀리면 다시 비운다 */
export async function saveChecked(channel: string, messageTs: string, checkedIds: string[], complete: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ checked_ids: checkedIds, completed_at: complete ? new Date().toISOString() : null })
    .eq('channel', channel)
    .eq('message_ts', messageTs);
  if (error) throw new Error(`${TABLE} save: ${error.message}`);
}

export async function fetchOpenChecklists(): Promise<OpenChecklist[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('channel, message_ts, request_text, checked_ids, created_at, last_reminded_at')
    .is('completed_at', null);
  if (error) throw new Error(`${TABLE} fetch: ${error.message}`);
  return (data ?? []) as OpenChecklist[];
}

export async function markReminded(keys: { channel: string; message_ts: string }[], at: Date): Promise<void> {
  for (const k of keys) {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ last_reminded_at: at.toISOString() })
      .eq('channel', k.channel)
      .eq('message_ts', k.message_ts);
    if (error) throw new Error(`${TABLE} mark: ${error.message}`);
  }
}
