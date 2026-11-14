// 메시지 초안과 실제 보낸 내용 저장소. 초안을 얼마나 고쳐 보냈는지로 에이전트 품질을 잰다. 서버 전용.
import { supabaseAdmin } from '@/lib/supabase-admin';

const TABLE = 'message_drafts';

export interface NewDraft {
  targetId: string;
  targetName: string;
  purposes: string[];
  draft: string;
  basis: string[];
  handoff: string | null;
  model: string;
  createdBy: string;
}

/** 저장한 초안 id */
export async function saveDraft(d: NewDraft): Promise<string> {
  const { data, error } = await supabaseAdmin.from(TABLE).insert({
    target_id: d.targetId, target_name: d.targetName, purposes: d.purposes, draft: d.draft, basis: d.basis,
    handoff: d.handoff, model: d.model, created_by: d.createdBy,
  }).select('id').single();
  if (error) throw new Error(`${TABLE} insert: ${error.message}`);
  return data.id as string;
}

export async function markDraftSent(id: string, sentText: string, sentBy: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE)
    .update({ sent_text: sentText, sent_by: sentBy, sent_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`${TABLE} sent: ${error.message}`);
}
